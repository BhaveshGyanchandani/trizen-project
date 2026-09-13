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

export async function getPhotosBucket() {
  const conn = await connectDB();
  return new mongoose.mongo.GridFSBucket(conn.connection.db, {
    bucketName: "photos",
  });
}

