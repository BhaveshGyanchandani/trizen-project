import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    galleryPublished: { type: Boolean, default: false },
    // The PIN is never stored in plain text — only its bcrypt hash. The
    // plaintext is generated fresh on every publish call and returned
    // exactly once in that response; it's never persisted or re-readable.
    galleryPinHash: { type: String },
    gallerySlug: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
