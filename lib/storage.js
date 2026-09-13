import { v2 as cloudinary } from "cloudinary";
import { getPhotosBucket } from "./mongodb";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function configuredCloudinary() {
  if (process.env.CLOUDINARY_URL) {
    // The Cloudinary SDK reads CLOUDINARY_URL from the server environment.
    cloudinary.config({ secure: true });
    return cloudinary;
  }
  const missing = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Cloudinary is not configured. Missing: ${missing.join(", ")}.`);

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

function validateImageFile(file) {
  if (!file || typeof file !== "object" || !file.arrayBuffer) throw new Error("No image file was provided.");
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error("Only JPEG, PNG, WebP, and GIF images are accepted.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Each image must be 20 MB or smaller.");
}

// MongoDB stores only the metadata returned here; Cloudinary stores the file bytes.
export async function saveUploadedFile(file, { folder, publicId }) {
  validateImageFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await new Promise((resolve, reject) => {
    const stream = configuredCloudinary().uploader.upload_stream(
      { resource_type: "image", type: "authenticated", folder, public_id: publicId, overwrite: false },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

  return {
    storageProvider: "cloudinary",
    cloudinaryPublicId: uploaded.public_id,
    cloudinaryAssetId: uploaded.asset_id,
    cloudinaryVersion: uploaded.version,
    cloudinaryFormat: uploaded.format,
    contentType: file.type,
    filename: file.name || publicId,
    fileSize: uploaded.bytes,
  };
}

// GridFS remains only as a read/delete fallback while migration runs.
export async function deleteUploadedFile(asset) {
  if (!asset) return;
  if (asset.cloudinaryPublicId) {
    const result = await configuredCloudinary().uploader.destroy(asset.cloudinaryPublicId, {
      resource_type: "image", type: "authenticated", invalidate: true,
    });
    if (result?.result !== "ok" && result?.result !== "not found") {
      throw new Error("Cloudinary could not delete the image.");
    }
    return;
  }
  if (asset.gridfsId) {
    const bucket = await getPhotosBucket();
    try {
      await bucket.delete(asset.gridfsId);
    } catch (error) {
      if (!/file.*not found/i.test(error?.message || "")) throw error;
    }
  }
}

// Calling routes perform authorization before proxying the signed asset.
export async function openStoredImage(asset) {
  if (asset.cloudinaryPublicId) {
    const signedUrl = configuredCloudinary().url(asset.cloudinaryPublicId, {
      resource_type: "image",
      type: "authenticated",
      sign_url: true,
      secure: true,
      version: asset.cloudinaryVersion || undefined,
      format: asset.cloudinaryFormat || undefined,
    });
    const response = await fetch(signedUrl, { cache: "no-store" });
    if (!response.ok || !response.body) throw new Error("Stored image not found.");
    return { body: response.body, contentType: asset.contentType || response.headers.get("content-type") || "image/jpeg" };
  }

  if (asset.gridfsId) {
    const bucket = await getPhotosBucket();
    const downloadStream = bucket.openDownloadStream(asset.gridfsId);
    const body = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => controller.enqueue(chunk));
        downloadStream.on("end", () => controller.close());
        downloadStream.on("error", (error) => controller.error(error));
      },
      cancel() {
        downloadStream.destroy();
      },
    });
    return { body, contentType: asset.contentType || "image/jpeg" };
  }

  throw new Error("Stored image not found.");
}
