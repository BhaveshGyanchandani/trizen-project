import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { openStoredImage } from "@/lib/storage";
import Event from "@/models/Event";
import { getAuthUser, isEventOwner, isAssignedToEvent } from "@/lib/authHelper";

// Serves an event cover from Cloudinary after verifying event access. GridFS
// remains as a legacy fallback while existing covers are migrated.
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const event = await Event.findById(id);
    if (!event || (!event.coverPhotoCloudinaryPublicId && !event.coverPhotoGridfsId && !event.coverPhotoUrl)) {
      return NextResponse.json({ success: false, message: "No cover photo set." }, { status: 404 });
    }

    const user = await getAuthUser();
    const allowed =
      !!user && (user.role === "admin" ? isEventOwner(event, user) : isAssignedToEvent(event, user));
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this event." },
        { status: 403 }
      );
    }

    const stored = await openStoredImage({
      cloudinaryPublicId: event.coverPhotoCloudinaryPublicId,
      cloudinaryVersion: event.coverPhotoCloudinaryVersion,
      cloudinaryFormat: event.coverPhotoCloudinaryFormat,
      gridfsId: event.coverPhotoGridfsId,
      contentType: event.coverPhotoContentType,
    });

    return new Response(stored.body, {
      status: 200,
      headers: {
        "Content-Type": stored.contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (/file.*not found/i.test(error?.message || "")) {
      return NextResponse.json({ success: false, message: "Cover photo not found." }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load cover photo." },
      { status: 500 }
    );
  }
}
