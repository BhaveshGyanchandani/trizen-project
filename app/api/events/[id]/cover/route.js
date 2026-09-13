import { NextResponse } from "next/server";
import { connectDB, getPhotosBucket } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser, isEventOwner, isAssignedToEvent } from "@/lib/authHelper";

// Serves an event's cover photo out of the same "photos" GridFS bucket
// used for gallery photos — an event's cover is admin-set but visible to
// anyone who can already see the event itself (the owning admin, or a
// team member assigned to it). It is never exposed to the public gallery.
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const event = await Event.findById(id);
    if (!event || !event.coverPhotoGridfsId) {
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

    const bucket = await getPhotosBucket();
    const downloadStream = bucket.openDownloadStream(event.coverPhotoGridfsId);

    const body = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => controller.enqueue(chunk));
        downloadStream.on("end", () => controller.close());
        downloadStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        downloadStream.destroy();
      },
    });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": event.coverPhotoContentType || "application/octet-stream",
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
