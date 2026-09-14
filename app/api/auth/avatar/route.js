import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/authHelper";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/storage";

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

// Self-service only: there is no userId param, and none is accepted from the
// body — this always writes to req.cookies' own authenticated user, the
// same boundary /api/auth/profile uses. Uploads go through the same
// Cloudinary path (saveUploadedFile) as event photos and event covers, so
// avatar bytes never touch MongoDB either.
export async function POST(req) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Send the avatar as multipart/form-data." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("avatar");
    if (!file || typeof file !== "object" || !file.arrayBuffer) {
      return NextResponse.json({ success: false, message: "No avatar file was provided." }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(authUser._id);
    if (!user) {
      return NextResponse.json({ success: false, message: "Account not found." }, { status: 404 });
    }

    const previousAvatar = user.avatarCloudinaryPublicId
      ? { cloudinaryPublicId: user.avatarCloudinaryPublicId }
      : null;

    const uploaded = await saveUploadedFile(file, {
      folder: `trizen/users/${user._id}/avatar`,
      publicId: `avatar-${Date.now()}`,
    });

    user.avatarCloudinaryPublicId = uploaded.cloudinaryPublicId;
    user.avatarCloudinaryAssetId = uploaded.cloudinaryAssetId;
    user.avatarCloudinaryVersion = uploaded.cloudinaryVersion;
    user.avatarCloudinaryFormat = uploaded.cloudinaryFormat;
    user.avatarContentType = uploaded.contentType;

    try {
      await user.save();
    } catch (error) {
      await deleteUploadedFile(uploaded).catch(() => {});
      throw error;
    }

    if (previousAvatar) {
      await deleteUploadedFile(previousAvatar).catch(() => {});
    }

    return NextResponse.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update avatar." },
      { status: 500 }
    );
  }
}

// Removes the avatar without touching any other profile field.
export async function DELETE() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(authUser._id);
    if (!user) {
      return NextResponse.json({ success: false, message: "Account not found." }, { status: 404 });
    }

    if (user.avatarCloudinaryPublicId) {
      await deleteUploadedFile({ cloudinaryPublicId: user.avatarCloudinaryPublicId }).catch(() => {});
    }
    user.avatarCloudinaryPublicId = undefined;
    user.avatarCloudinaryAssetId = undefined;
    user.avatarCloudinaryVersion = undefined;
    user.avatarCloudinaryFormat = undefined;
    user.avatarContentType = undefined;
    await user.save();

    return NextResponse.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to remove avatar." },
      { status: 500 }
    );
  }
}
