import mongoose from "mongoose";

/**
 * Event — a shoot owned by an admin, worked on by an assigned team, and
 * optionally published as a PIN-protected public gallery.
 *
 * Cover photo bytes live in Cloudinary; this document stores only the
 * resulting asset metadata. `galleryPinHash` guards public access to the
 * gallery and is described in detail below, next to its field.
 */
const EventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Cover photos use the same Cloudinary-backed storage metadata as event
    // photos. The GridFS field remains only for legacy records during migration.
    coverPhotoStorageProvider: { type: String, enum: ["cloudinary", "gridfs"], default: "cloudinary" },
    coverPhotoCloudinaryPublicId: { type: String },
    coverPhotoCloudinaryAssetId: { type: String },
    coverPhotoCloudinaryVersion: { type: Number },
    coverPhotoCloudinaryFormat: { type: String },
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
