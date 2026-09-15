import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { openStoredImage } from "@/lib/storage";
import User from "@/models/User";
import { getAuthUser } from "@/lib/authHelper";

/**
 * GET /api/auth/avatar/[userId]
 *
 * Streams another user's avatar image. Any authenticated user (admin or
 * team member) can view another user's avatar — the same trust boundary
 * already applies to `member.name` in the team list and
 * `uploadedBy.name` on every photo, so an avatar image isn't more
 * sensitive than that. Anonymous customers on a public gallery never
 * call this route; galleries only ever serve photo images, not uploader
 * avatars, so there's no unauthenticated path in here at all.
 */
export async function GET(req, { params }) {
  try {
    const { userId } = await params;
    const requester = await getAuthUser();
    if (!requester) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user || !user.avatarCloudinaryPublicId) {
      return NextResponse.json({ success: false, message: "No avatar set." }, { status: 404 });
    }

    const stored = await openStoredImage({
      cloudinaryPublicId: user.avatarCloudinaryPublicId,
      cloudinaryVersion: user.avatarCloudinaryVersion,
      cloudinaryFormat: user.avatarCloudinaryFormat,
      contentType: user.avatarContentType,
    });

    return new Response(stored.body, {
      status: 200,
      headers: { "Content-Type": stored.contentType, "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    if (/file.*not found/i.test(error?.message || "")) {
      return NextResponse.json({ success: false, message: "Avatar not found." }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load avatar." },
      { status: 500 }
    );
  }
}
