import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser, isEventOwner, isAssignedToEvent } from "@/lib/authHelper";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/storage";

/** Shapes an Event document into the detail fields returned by this route. */
function serializeEvent(event) {
  return {
    id: event._id,
    name: event.name,
    createdBy: event.createdBy,
    teamMembers: (event.assignedTeam || []).map((m) =>
      m && m.name ? { id: m._id, name: m.name, email: m.email } : { id: m }
    ),
    galleryStatus: event.galleryPublished ? "published" : "draft",
    gallerySlug: event.gallerySlug,
    coverPhotoUrl: event.coverPhotoCloudinaryPublicId || event.coverPhotoGridfsId ? `/api/events/${event._id}/cover` : null,
    createdAt: event.createdAt,
  };
}

/**
 * GET /api/events/[id]
 *
 * Fetches a single event's detail. Admins may access events they own;
 * team members only events they're assigned to.
 *
 * Response: event detail (name, team, gallery status, cover URL).
 */
export async function GET(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const event = await Event.findById(id).populate("assignedTeam", "name email");

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    const allowed = user.role === "admin" ? isEventOwner(event, user) : isAssignedToEvent(event, user);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this event." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: serializeEvent(event) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch event." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]
 *
 * Renames the event and/or replaces its cover photo. Admin-only, and
 * restricted to the event's owning admin. Team members never see the
 * control that calls this in the UI, and the API enforces the same
 * restriction independently — the frontend check alone is never the
 * real security boundary. Accepts either JSON (`{ name }`) or
 * multipart/form-data (`name` field and/or a `coverPhoto` file). A
 * previous cover photo is deleted from storage only after the new one
 * saves successfully.
 */
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
    await connectDB();
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }
    if (!isEventOwner(event, user)) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this event." },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let name;
    let coverPhotoFile;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawName = formData.get("name");
      if (typeof rawName === "string") name = rawName;
      const file = formData.get("coverPhoto");
      if (file && typeof file === "object" && file.arrayBuffer) coverPhotoFile = file;
    } else {
      const body = await req.json().catch(() => ({}));
      if (typeof body.name === "string") name = body.name;
    }

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, message: "Event name can't be empty." },
          { status: 400 }
        );
      }
      event.name = trimmed;
    }

    let previousCover;
    let uploadedCover;
    if (coverPhotoFile) {
      previousCover = {
        cloudinaryPublicId: event.coverPhotoCloudinaryPublicId,
        gridfsId: event.coverPhotoGridfsId,
      };
      uploadedCover = await saveUploadedFile(coverPhotoFile, {
        folder: `trizen/events/${id}/covers`,
        publicId: `cover-${Date.now()}`,
      });
      event.coverPhotoStorageProvider = uploadedCover.storageProvider;
      event.coverPhotoCloudinaryPublicId = uploadedCover.cloudinaryPublicId;
      event.coverPhotoCloudinaryAssetId = uploadedCover.cloudinaryAssetId;
      event.coverPhotoCloudinaryVersion = uploadedCover.cloudinaryVersion;
      event.coverPhotoCloudinaryFormat = uploadedCover.cloudinaryFormat;
      event.coverPhotoContentType = uploadedCover.contentType;
      event.coverPhotoGridfsId = undefined;
    }

    try {
      await event.save();
    } catch (error) {
      if (uploadedCover) await deleteUploadedFile(uploadedCover).catch(() => {});
      throw error;
    }
    if (previousCover?.cloudinaryPublicId || previousCover?.gridfsId) {
      await deleteUploadedFile(previousCover);
    }
    await event.populate("assignedTeam", "name email");

    return NextResponse.json({ success: true, data: serializeEvent(event) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update event." },
      { status: 500 }
    );
  }
}
