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

    // Already-live photos are locked from this endpoint — the customer may
    // have already seen or downloaded them, so pulling one back out of
    // "selected" here would silently drop it from the gallery without an
    // explicit unpublish/republish cycle. Unselecting a live photo has to
    // go through unpublish first.
    if (photo.publishedForGallery) {
      return NextResponse.json(
        {
          success: false,
          message: "This photo is already live in the published gallery. Unpublish the gallery first to change it.",
        },
        { status: 409 }
      );
    }

    if (photo.excludedFromGallery && selected) {
      return NextResponse.json(
        { success: false, message: "This photo was removed following an approved customer request." },
        { status: 409 }
      );
    }

    // Atomic update instead of findById + mutate + save(). Two rapid
    // toggles on the same photo (a fast double-click, a slow network
    // making someone click twice) used to race two `.save()` calls against
    // the same document version and throw an unhandled VersionError — a
    // 500 with no useful message. findOneAndUpdate has no document version
    // to conflict on, so the race just resolves to "last write wins"
    // instead of throwing. We also re-check publishedForGallery in the
    // query itself, so a photo that got published by another request in
    // between our read above and this write still can't be silently
    // unselected.
    const updated = await Photo.findOneAndUpdate(
      { _id: id, publishedForGallery: { $ne: true }, excludedFromGallery: { $ne: true } },
      { $set: { selectedForGallery: Boolean(selected) } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: "This photo can't be selected because it is live or was removed following an approved customer request.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: updated._id, selectedForGallery: updated.selectedForGallery },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update photo." },
      { status: 500 }
    );
  }
}
