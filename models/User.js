import mongoose from "mongoose";

/**
 * User account — either a studio admin or a team member created by one.
 *
 * Admins own events and the team roster; team members are scoped to the
 * events an admin assigns them to. Passwords are stored as bcrypt hashes
 * (hashing happens at the route layer, not here). Avatar images are held
 * in Cloudinary; only the resulting metadata lives on this document.
 */
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "team_member"], default: "admin" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Optional self-service profile fields. Nothing here is required at
    // account creation — both roles fill these in later from /profile.
    phone: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 280 },
    // Avatar storage mirrors Event's cover-photo fields exactly (same
    // Cloudinary-backed pattern, image bytes never stored in Mongo).
    avatarCloudinaryPublicId: { type: String },
    avatarCloudinaryAssetId: { type: String },
    avatarCloudinaryVersion: { type: Number },
    avatarCloudinaryFormat: { type: String },
    avatarContentType: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
