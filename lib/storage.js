// lib/storage.js
//
// Uploaded photo bytes live in MongoDB itself, via GridFS — not on local
// disk, and not in a third-party object store. This is the fix for a real
// bug: local disk (public/uploads/) is ephemeral on Vercel and most other
// serverless hosts, so a photo would upload "successfully" and then 404
// for everyone (including the customer-facing gallery) the moment the
// serverless instance that handled the upload was recycled.
//
// GridFS avoids that without needing any third-party account: the bytes
// go into the same MongoDB database everything else already uses, in two
// collections (photos.files / photos.chunks) that mongoose's driver
// manages via GridFSBucket. It works identically in local dev and on
// Vercel, since both just point at a MongoDB connection string.
//
// A Photo document only ever stores a reference (`gridfsId` +
// `contentType`), never the bytes themselves — reads go through
// GET /api/photos/[id]/file, which streams the bucket's download stream
// back as the response body. Every route calls only `saveUploadedFile`,
// so nothing else needs to change if the backend ever changes again.

import { getPhotosBucket } from "./mongodb";

const FALLBACK_CONTENT_TYPE = "application/octet-stream";

/**
 * Persists one uploaded File (from a multipart FormData) into the
 * "photos" GridFS bucket and returns the metadata a Photo document needs.
 */
export async function saveUploadedFile(file, eventId) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = await getPhotosBucket();
  const contentType = file.type || FALLBACK_CONTENT_TYPE;

  const gridfsId = await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.name || "photo", {
      contentType,
      metadata: { eventId: String(eventId) },
    });
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });

  return {
    gridfsId,
    contentType,
    filename: file.name || String(gridfsId),
    fileSize: buffer.length,
  };
}

/**
 * Removes a photo's bytes from GridFS. Safe to call even if the file is
 * already gone (e.g. partial cleanup after a failed upload) — GridFS
 * throws on an unknown id, which we treat as already-deleted.
 */
export async function deleteUploadedFile(gridfsId) {
  if (!gridfsId) return;
  const bucket = await getPhotosBucket();
  try {
    await bucket.delete(gridfsId);
  } catch (err) {
    if (!/file.*not found/i.test(err?.message || "")) {
      throw err;
    }
  }
}
