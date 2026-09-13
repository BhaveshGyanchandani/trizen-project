import mongoose from "mongoose";

const CustomerPhotoFeedbackSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    gallerySlug: { type: String, required: true, index: true },
    // Identifies the PIN-verified browser session only; no customer account
    // or personal data is collected for gallery feedback.
    customerSessionId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true }
);

// One visitor can update their feedback for a particular photo without
// creating duplicate ratings. Other gallery visitors remain independent.
CustomerPhotoFeedbackSchema.index({ photoId: 1, customerSessionId: 1 }, { unique: true });

export default mongoose.models.CustomerPhotoFeedback ||
  mongoose.model("CustomerPhotoFeedback", CustomerPhotoFeedbackSchema);
