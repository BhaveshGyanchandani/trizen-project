import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

/**
 * POST /api/events/[id]/gallery/unpublish
 *
 * Takes the gallery offline: flips `galleryPublished` to false and
 * clears `publishedForGallery` on every photo, since nothing is live
 * for the customer anymore, so nothing should still read as "already
 * published" in the admin picker — the next publish starts a clean
 * slate of selections to review, same as a first publish would. The
 * PIN hash is left untouched; republishing later reuses it as usual.
 */
export async function POST(req, { params }) {
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

    event.galleryPublished = false;
    await event.save();

    // Nothing is live for the customer anymore, so nothing should still
    // read as "already published" in the admin picker — the next publish
    // starts a clean slate of selections to review, same as a first
    // publish would. The PIN hash is left untouched; republishing later
    // reuses it as usual.
    await Photo.updateMany(
      { eventId: id, publishedForGallery: true },
      { $set: { publishedForGallery: false } }
    );

    return NextResponse.json({ success: true, data: { status: "draft" } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to unpublish gallery." },
      { status: 500 }
    );
  }
}
