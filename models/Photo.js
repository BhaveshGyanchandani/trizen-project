import mongoose from "mongoose";

/**
 * Photo — a single image uploaded to an event by a team member.
 *
 * Image bytes are stored in Cloudinary (`storageProvider: "cloudinary"`);
 * the legacy `gridfsId` path is kept only until the migration script has
 * moved every pre-existing asset. `selectedForGallery`,
 * `publishedForGallery`, and `excludedFromGallery` together drive the
 * admin curation → publish → customer-feedback lifecycle described next
 * to each field below.
 */
const PhotoSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    // New uploads live in Cloudinary. gridfsId is retained temporarily so
    // existing records keep working until scripts/migrate-gridfs-to-cloudinary.js
    // has moved and verified every legacy asset.
    storageProvider: { type: String, enum: ["cloudinary", "gridfs"], default: "cloudinary", index: true },
    cloudinaryPublicId: { type: String, sparse: true, index: true },
    cloudinaryAssetId: { type: String, sparse: true, unique: true },
    cloudinaryVersion: { type: Number },
    cloudinaryFormat: { type: String },
    gridfsId: { type: mongoose.Schema.Types.ObjectId },
    contentType: { type: String },
    fileSize: { type: Number },
    selectedForGallery: { type: Boolean, default: false },
    // An approved customer removal request hides a photo from the public
    // gallery without deleting the original event asset from GridFS.
    excludedFromGallery: { type: Boolean, default: false, index: true },
    // Set true the moment a selected photo goes live in a publish. Once
    // live, the customer may already have seen/downloaded it, so the admin
    // UI treats it as locked ("already published") rather than a photo
    // still awaiting a selection decision. Cleared only on unpublish.
    publishedForGallery: { type: Boolean, default: false },
  },
  { timestamps: true }
);

if (mongoose.models.Photo) {
  delete mongoose.models.Photo;
}

export default mongoose.model("Photo", PhotoSchema);
