import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { deleteUploadedFile } from "@/lib/storage";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import CustomerPhotoFeedback from "@/models/CustomerPhotoFeedback";
import PhotoChangeRequest from "@/models/PhotoChangeRequest";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

// Permanently remove an event photo. This is intentionally restricted to the
// event owner; assigned team members can upload but cannot delete assets.
export async function DELETE(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Photo not found." }, { status: 404 });
    }

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

    // Delete the remote asset before the database reference. If this fails,
    // leave the record intact so the admin can retry safely.
    await deleteUploadedFile(photo);
    await Promise.all([
      CustomerPhotoFeedback.deleteMany({ photoId: photo._id }),
      PhotoChangeRequest.deleteMany({ photoId: photo._id }),
    ]);
    await Photo.deleteOne({ _id: photo._id });

    return NextResponse.json({ success: true, data: { id: photo._id } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Couldn't delete the photo." },
      { status: 500 }
    );
  }
}
