/*
 * Copies legacy GridFS files to Cloudinary and updates the existing MongoDB
 * records in place. It is idempotent: rerunning it never creates new Photo
 * documents, and `--purge-gridfs` only runs after Cloudinary metadata exists.
 *
 * Usage:
 *   npm run migrate:cloudinary
 *   npm run migrate:cloudinary -- --purge-gridfs
 */
const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");

const purgeGridfs = process.argv.includes("--purge-gridfs");
const required = ["MONGODB_URL", ...(process.env.CLOUDINARY_URL
  ? []
  : ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"])];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

cloudinary.config(process.env.CLOUDINARY_URL
  ? { secure: true }
  : {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

const Photo = mongoose.model("Photo", new mongoose.Schema({
  eventId: mongoose.Schema.Types.ObjectId,
  gridfsId: mongoose.Schema.Types.ObjectId,
  storageProvider: String,
  cloudinaryPublicId: String,
  cloudinaryAssetId: String,
  cloudinaryVersion: Number,
  cloudinaryFormat: String,
  contentType: String,
  filename: String,
  fileSize: Number,
}, { timestamps: true }));

const Event = mongoose.model("Event", new mongoose.Schema({
  coverPhotoGridfsId: mongoose.Schema.Types.ObjectId,
  coverPhotoStorageProvider: String,
  coverPhotoCloudinaryPublicId: String,
  coverPhotoCloudinaryAssetId: String,
  coverPhotoCloudinaryVersion: Number,
  coverPhotoCloudinaryFormat: String,
  coverPhotoContentType: String,
}, { timestamps: true }));

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "photos" });
}

async function readGridfsFile(gridfsId) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = bucket().openDownloadStream(gridfsId);
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function upload(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", type: "authenticated", folder, public_id: publicId, overwrite: true },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

function cloudinaryFields(result) {
  return {
    storageProvider: "cloudinary",
    cloudinaryPublicId: result.public_id,
    cloudinaryAssetId: result.asset_id,
    cloudinaryVersion: result.version,
    cloudinaryFormat: result.format,
  };
}

async function removeGridfsFile(gridfsId) {
  try {
    await bucket().delete(gridfsId);
  } catch (error) {
    if (!/file.*not found/i.test(error.message || "")) throw error;
  }
}

async function migratePhoto(photo) {
  if (!photo.cloudinaryPublicId) {
    const buffer = await readGridfsFile(photo.gridfsId);
    const result = await upload(buffer, `trizen/events/${photo.eventId}`, String(photo._id));
    photo.set(cloudinaryFields(result));
    photo.fileSize = result.bytes;
    await photo.save();
  }

}

async function migrateCover(event) {
  if (!event.coverPhotoCloudinaryPublicId) {
    const matchingPhoto = await Photo.findOne({
      gridfsId: event.coverPhotoGridfsId,
      cloudinaryPublicId: { $exists: true, $ne: null },
    });
    if (matchingPhoto) {
      event.set({
        coverPhotoStorageProvider: "cloudinary",
        coverPhotoCloudinaryPublicId: matchingPhoto.cloudinaryPublicId,
        coverPhotoCloudinaryAssetId: matchingPhoto.cloudinaryAssetId,
        coverPhotoCloudinaryVersion: matchingPhoto.cloudinaryVersion,
        coverPhotoCloudinaryFormat: matchingPhoto.cloudinaryFormat,
        coverPhotoContentType: matchingPhoto.contentType,
      });
    } else {
      const buffer = await readGridfsFile(event.coverPhotoGridfsId);
      const result = await upload(buffer, "trizen/event-covers", `legacy-cover-${event._id}`);
      event.set({
        coverPhotoStorageProvider: "cloudinary",
        coverPhotoCloudinaryPublicId: result.public_id,
        coverPhotoCloudinaryAssetId: result.asset_id,
        coverPhotoCloudinaryVersion: result.version,
        coverPhotoCloudinaryFormat: result.format,
      });
    }
    await event.save();
  }

}

async function purgeMigratedGridfs(photos, covers) {
  for (const photo of photos) {
    if (!photo.cloudinaryPublicId || !photo.gridfsId) continue;
    await removeGridfsFile(photo.gridfsId);
    photo.gridfsId = undefined;
    await photo.save();
  }
  for (const event of covers) {
    if (!event.coverPhotoCloudinaryPublicId || !event.coverPhotoGridfsId) continue;
    await removeGridfsFile(event.coverPhotoGridfsId);
    event.coverPhotoGridfsId = undefined;
    await event.save();
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);
  const photos = await Photo.find({ gridfsId: { $exists: true, $ne: null } });
  const covers = await Event.find({ coverPhotoGridfsId: { $exists: true, $ne: null } });
  const failures = [];

  for (const photo of photos) {
    try {
      await migratePhoto(photo);
      console.log(`Photo ${photo._id}: synced`);
    } catch (error) {
      failures.push(`Photo ${photo._id}: ${error.message}`);
    }
  }
  for (const event of covers) {
    try {
      await migrateCover(event);
      console.log(`Cover ${event._id}: synced`);
    } catch (error) {
      failures.push(`Cover ${event._id}: ${error.message}`);
    }
  }

  // Do not remove any legacy bytes until every Cloudinary copy and MongoDB
  // metadata update above has succeeded, including covers that may share a
  // GridFS file with a photo.
  if (purgeGridfs && failures.length === 0) {
    await purgeMigratedGridfs(photos, covers);
    console.log("Legacy GridFS bytes removed after successful verification.");
  }

  console.log(`Completed: ${photos.length} photo(s), ${covers.length} cover(s), ${failures.length} failure(s).`);
  failures.forEach((failure) => console.error(failure));
  await mongoose.disconnect();
  if (failures.length) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
