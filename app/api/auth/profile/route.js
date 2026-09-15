import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/authHelper";
import { validateProfileUpdate } from "@/lib/requestValidation";

/** Shapes a User document into the profile fields returned to the frontend. */
function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    bio: user.bio || "",
    avatarUrl: user.avatarCloudinaryPublicId ? `/api/auth/avatar/${user._id}` : null,
  };
}

/**
 * GET /api/auth/profile
 *
 * Returns the currently authenticated user's own profile. Both admin
 * and team_member can edit their own profile — this route only ever
 * touches the currently-authenticated user's own document. There is no
 * userId in the body or the URL, so there's nothing here that would let
 * one account edit another's profile even by mistake.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load profile." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/profile
 *
 * Updates the current user's own profile. Every field is optional —
 * send only what changed. A password change requires both
 * `currentPassword` and `newPassword` together, and is verified against
 * the stored hash before being applied.
 *
 * Body: { name?, email?, phone?, bio?, currentPassword?, newPassword? }
 * Response: the updated user profile.
 */
export async function PATCH(req) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { valid, errors, updates } = validateProfileUpdate(body);
    if (!valid) {
      const message = Object.values(errors)[0] || "Invalid profile update.";
      return NextResponse.json({ success: false, message, errors }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(authUser._id);
    if (!user) {
      return NextResponse.json({ success: false, message: "Account not found." }, { status: 404 });
    }

    if (updates.email && updates.email !== user.email) {
      const existing = await User.findOne({ email: updates.email, _id: { $ne: user._id } });
      if (existing) {
        return NextResponse.json(
          { success: false, message: "That email is already in use.", errors: { email: "Already in use." } },
          { status: 400 }
        );
      }
      user.email = updates.email;
    }

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.bio !== undefined) user.bio = updates.bio;

    if (updates.currentPassword && updates.newPassword) {
      const currentMatches = await bcrypt.compare(updates.currentPassword, user.password);
      if (!currentMatches) {
        return NextResponse.json(
          {
            success: false,
            message: "Current password is incorrect.",
            errors: { password: "Current password is incorrect." },
          },
          { status: 401 }
        );
      }
      user.password = await bcrypt.hash(updates.newPassword, 10);
    }

    await user.save();

    return NextResponse.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "That email is already in use." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
