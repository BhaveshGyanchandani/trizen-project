import mongoose from "mongoose";

// The MONGODB_URL check is deliberately *inside* connectDB(), not at
// module scope. Route handler modules get evaluated during `next build`
// (and on serverless cold starts) purely to collect metadata — if this
// threw at import time, the build itself would fail whenever the env var
// isn't set yet, before a single request is ever handled.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  const MONGODB_URL = process.env.MONGODB_URL;
  if (!MONGODB_URL) {
    throw new Error(
      "MONGODB_URL is not set. Add it to .env.local (see .env.local.example)."
    );
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URL, opts).then((instance) => instance);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// GridFSBucket lives on the native MongoDB driver, not Mongoose — but
// Mongoose's connection wraps a native driver connection underneath, so we
// can reuse the same connection/pool rather than opening a second one.
// Bucket name "photos" -> backing collections are photos.files / photos.chunks.
let cachedBucket;

export async function getPhotosBucket() {
  const conn = await connectDB();
  if (!cachedBucket) {
    const { GridFSBucket } = await import("mongodb");
    cachedBucket = new GridFSBucket(conn.connection.db, { bucketName: "photos" });
  }
  return cachedBucket;
}
