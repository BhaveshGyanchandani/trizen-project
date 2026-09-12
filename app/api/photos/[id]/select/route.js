import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

export async function PATCH(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { selected } = await req.json();

    await connectDB();
    const photo = await Photo.findById(id);
    if (!photo) {
      return NextResponse.json({ success: false, message: "Photo not found." }, { status: 404 });
    }

    const event = await Event.findById(photo.eventId);
    if (!event || !isEventOwner(event, user)) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this photo." },
        { status: 403 }
      );
    }

    photo.selectedForGallery = Boolean(selected);
    await photo.save();

    return NextResponse.json({
      success: true,
      data: { id: photo._id, selectedForGallery: photo.selectedForGallery },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update photo." },
      { status: 500 }
    );
  }
}
