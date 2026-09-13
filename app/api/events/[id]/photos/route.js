import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, isEventOwner, canAccessEventPhotos } from "@/lib/authHelper";
import { saveUploadedFile } from "@/lib/storage";

function serializePhoto(photo) {
  return {
    id: photo._id,
    filename: photo.filename,
    storageUrl: photo.storageUrl || `/api/photos/${photo._id}/file`,
    fileSize: photo.fileSize,
    selectedForGallery: photo.selectedForGallery,
    publishedForGallery: photo.publishedForGallery,
    eventId: photo.eventId,
    uploadedBy: photo.uploadedBy,
    createdAt: photo.createdAt,
  };
}

// Admin or assigned team member: every photo on the event.
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

    const photos = await Photo.find({ eventId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: photos.map(serializePhoto) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch photos." },
      { status: 500 }
    );
  }
}

// Owning admin or an assigned team member can upload.
export async function POST(req, { params }) {
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
        { success: false, message: "You don't have upload access to this event." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("photos").filter((f) => typeof f === "object" && f.arrayBuffer);
    if (files.length === 0) {
      return NextResponse.json({ success: false, message: "No files provided." }, { status: 400 });
    }

    const uploaded = [];
    for (const file of files) {
      const { gridfsId, contentType, filename, fileSize } = await saveUploadedFile(file, eventId);
      const photo = await Photo.create({
        eventId,
        uploadedBy: user._id,
        filename,
        gridfsId,
        contentType,
        fileSize,
        selectedForGallery: false,
      });
      uploaded.push(serializePhoto(photo));
    }

    return NextResponse.json({ success: true, data: uploaded });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Upload failed." },
      { status: 500 }
    );
  }
}
