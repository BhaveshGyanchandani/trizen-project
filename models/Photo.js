import mongoose from "mongoose";

const PhotoSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    gridfsId: { type: mongoose.Schema.Types.ObjectId },
    contentType: { type: String },
    fileSize: { type: Number },
    selectedForGallery: { type: Boolean, default: false },
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
