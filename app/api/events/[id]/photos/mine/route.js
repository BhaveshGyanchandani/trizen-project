import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, canAccessEventPhotos } from "@/lib/authHelper";

export async function GET(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id: eventId } = await params;
    await connectDB();
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }
    if (!canAccessEventPhotos(event, user)) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this event." },
        { status: 403 }
      );
    }

    const photos = await Photo.find({ eventId, uploadedBy: user._id }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: photos.map((p) => ({
        id: p._id,
        filename: p.filename,
        storageUrl: p.storageUrl || `/api/photos/${p._id}/file`,
        fileSize: p.fileSize,
        selectedForGallery: p.selectedForGallery,
        eventId: p.eventId,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch your photos." },
      { status: 500 }
    );
  }
}
