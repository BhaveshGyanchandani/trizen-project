import mongoose from "mongoose";

const PhotoChangeRequestSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    // Events own galleries in this application, so the stable gallery slug
    // is the useful gallery identifier without introducing a duplicate model.
    gallerySlug: { type: String, required: true, index: true },
    customerSessionId: { type: String, required: true },
    reason: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
  },
  { timestamps: true }
);

PhotoChangeRequestSchema.index({ photoId: 1, customerSessionId: 1, status: 1 });

export default mongoose.models.PhotoChangeRequest ||
  mongoose.model("PhotoChangeRequest", PhotoChangeRequestSchema);
