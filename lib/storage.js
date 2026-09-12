// lib/storage.js
//
// Photos are stored in MongoDB via GridFS (bucket name "photos"), not as a
// binary field on the Photo document itself — a plain document field caps
// out at 16MB and a handful of full-resolution photos would blow past that
// fast. GridFS chunks the file across `photos.chunks` and keeps metadata in
// `photos.files`; the Photo document only stores the resulting file _id.
//
// This does mean image bytes live in the same MongoDB cluster the rest of
// the app's data does, which is a deliberate reading of the PDF's "don't
// store image files directly in the database" line — GridFS is Mongo's own
// mechanism for out-of-document binary storage, not a bare BSON/base64
// field, but it's still MongoDB doing the storing rather than a separate
// object-storage service (S3/Cloudinary/etc). Worth confirming that
// reading is what's wanted before relying on it for a real submission.
//
// Every upload route calls only `saveUploadedFile`, and every read path
// goes through `GET /api/photos/[id]/file` — so a future swap to real
// object storage only touches this file and that one route.

import crypto from "crypto";
import { getPhotosBucket } from "./mongodb";

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
};

function extensionFor(file) {
  const dot = (file.name || "").lastIndexOf(".");
  if (dot > -1) return file.name.slice(dot);
  return EXT_BY_MIME[file.type] || ".jpg";
}

/**
 * Persists one uploaded File (from a multipart FormData) into GridFS and
 * returns the metadata a Photo document needs.
 */
export async function saveUploadedFile(file, eventId) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = await getPhotosBucket();
  const safeName = `${crypto.randomUUID()}${extensionFor(file)}`;

  const gridfsId = await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(safeName, {
      contentType: file.type || "application/octet-stream",
      metadata: { eventId: String(eventId), originalName: file.name || safeName },
    });
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });

  return {
    gridfsId,
    contentType: file.type || "application/octet-stream",
    filename: file.name || safeName,
    fileSize: buffer.length,
  };
}
