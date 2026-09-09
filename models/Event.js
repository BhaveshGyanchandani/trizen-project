import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    galleryPublished: { type: Boolean, default: false },
    galleryPin: { type: String },
    gallerySlug: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
