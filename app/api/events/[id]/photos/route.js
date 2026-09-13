import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, isEventOwner, canAccessEventPhotos } from "@/lib/authHelper";
import { deleteUploadedFile, saveUploadedFile } from "@/lib/storage";
import mongoose from "mongoose";

function serializePhoto(photo) {
  return {
    id: photo._id,
    filename: photo.filename,
    storageUrl: `/api/photos/${photo._id}/file`,
    fileSize: photo.fileSize,
    selectedForGallery: photo.selectedForGallery,
    publishedForGallery: photo.publishedForGallery,
    excludedFromGallery: photo.excludedFromGallery,
    eventId: photo.eventId,
    uploadedBy: photo.uploadedBy && photo.uploadedBy.name
      ? { id: photo.uploadedBy._id, name: photo.uploadedBy.name }
      : photo.uploadedBy,
    createdAt: photo.createdAt,
  };
}

// Admins can filter every photo on an event. Team members only receive their
// own uploads, even if they try to call this endpoint directly.
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

    const { searchParams } = new URL(req.url);
    const query = { eventId };
    let status = searchParams.get("status") || "all";
    const uploadedBy = searchParams.get("uploadedBy");

    if (user.role !== "admin") {
      query.uploadedBy = user._id;
      status = "all";
    } else {
      if (!["all", "selected", "unselected"].includes(status)) {
        return NextResponse.json({ success: false, message: "Invalid photo status filter." }, { status: 400 });
      }
      if (status === "selected") query.selectedForGallery = true;
      if (status === "unselected") query.selectedForGallery = false;
      if (uploadedBy && uploadedBy !== "all") {
        if (!mongoose.isValidObjectId(uploadedBy)) {
          return NextResponse.json({ success: false, message: "Invalid team member filter." }, { status: 400 });
        }
        query.uploadedBy = uploadedBy;
      }
    }

    const baseQuery = user.role === "admin" ? { eventId } : { eventId, uploadedBy: user._id };
    const [photos, total, selected] = await Promise.all([
      Photo.find(query).populate("uploadedBy", "name").sort({ createdAt: -1 }),
      Photo.countDocuments(baseQuery),
      Photo.countDocuments({ ...baseQuery, selectedForGallery: true }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        photos: photos.map(serializePhoto),
        summary: { total, selected, unselected: total - selected, status, uploadedBy: uploadedBy || "all" },
      },
    });
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

    const results = [];
    for (const file of files) {
      let stored;
      try {
        stored = await saveUploadedFile(file, eventId);
      } catch (error) {
        results.push({
          filename: file.name || "photo",
          success: false,
          stage: "storage_failed",
          message: error.message || "The image could not be stored.",
        });
        continue;
      }

      try {
        const photo = await Photo.create({
          eventId,
          uploadedBy: user._id,
          ...stored,
          selectedForGallery: false,
        });
        results.push({
          filename: stored.filename,
          success: true,
          stage: "database_created",
          photo: serializePhoto(photo),
        });
      } catch (error) {
        // A photo isn't successful until both writes complete. Make a best
        // effort to remove the GridFS file so a database failure does not
        // leave an unreachable storage object behind.
        let message = error.message || "The photo record could not be created.";
        try {
          await deleteUploadedFile(stored.gridfsId);
        } catch {
          message += " Storage cleanup also failed; please contact an admin.";
        }
        results.push({
          filename: stored.filename,
          success: false,
          stage: "database_failed",
          message,
        });
      }
    }

    const uploadedCount = results.filter((result) => result.success).length;
    return NextResponse.json({
      success: uploadedCount > 0,
      data: { results, uploadedCount, failedCount: results.length - uploadedCount },
      message: uploadedCount === results.length ? undefined : "Some photos could not be uploaded.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Upload failed." },
      { status: 500 }
    );
  }
}
