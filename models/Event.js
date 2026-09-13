import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Cover photo shown on the event card/dashboard. Stored the same way
    // as gallery photos — bytes in GridFS, only a reference here — so an
    // event doesn't need its own upload/storage path. Admin-editable only;
    // team members and the public gallery only ever read it.
    coverPhotoGridfsId: { type: mongoose.Schema.Types.ObjectId },
    coverPhotoContentType: { type: String },
    galleryPublished: { type: Boolean, default: false },
    // The PIN is never stored in plain text — only its bcrypt hash. It's
    // generated once, on first publish, and then reused on every republish
    // so a customer who already has it never gets locked out. It only
    // changes if the admin explicitly hits "Regenerate PIN". The plaintext
    // is returned exactly once, in the publish/regenerate response — never
    // persisted or re-readable after that.
    galleryPinHash: { type: String },
    gallerySlug: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
