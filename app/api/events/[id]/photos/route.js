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

// Admins can filter every photo on an event. Team members receive their own
// uploads plus photos currently visible in the published gallery, so they can
// see what has already been delivered without gaining access to other team's
// unpublished work.
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
      query.$or = [{ uploadedBy: user._id }];
      if (event.galleryPublished) {
        query.$or.push({ selectedForGallery: true, excludedFromGallery: { $ne: true } });
      }
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
        // Allocate the MongoDB id first so the Cloudinary public id is stable
        // and directly traceable back to this photo record.
        const photo = new Photo({
          eventId,
          uploadedBy: user._id,
          filename: file.name || "photo",
          selectedForGallery: false,
        });
        stored = await saveUploadedFile(file, {
          folder: `trizen/events/${eventId}`,
          publicId: String(photo._id),
        });
        photo.set(stored);
        await photo.save();
        results.push({
          filename: stored.filename,
          success: true,
          stage: "database_created",
          photo: serializePhoto(photo),
        });
      } catch (error) {
        results.push({
          filename: file.name || "photo",
          success: false,
          stage: stored ? "database_failed" : "storage_failed",
          message: error.message || (stored ? "The photo record could not be created." : "The image could not be stored."),
        });
        if (stored) {
          try {
            await deleteUploadedFile(stored);
          } catch {
            results[results.length - 1].message += " Cloudinary cleanup also failed; please contact an admin.";
          }
        }
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
