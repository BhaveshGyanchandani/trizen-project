import mongoose from "mongoose";

const PhotoSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    // Exactly one of these is set depending on which storage backend wrote
    // the file. storageUrl: local-disk path under /uploads (or a future
    // cloud URL). gridfsId: id of the file in the "photos" GridFS bucket,
    // served back out through GET /api/photos/[id]/file. Neither is
    // `required` alone since only one is expected per photo.
    storageUrl: { type: String },
    gridfsId: { type: mongoose.Schema.Types.ObjectId },
    contentType: { type: String },
    fileSize: { type: Number },
    selectedForGallery: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Photo || mongoose.model("Photo", PhotoSchema);
