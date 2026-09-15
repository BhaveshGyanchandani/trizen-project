import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";
import { canPublishGallery } from "@/lib/galleryPolicy";

/**
 * NOTE: a local duplicate of the same-named helper in lib/galleryPublish.js.
 * Generates a random 6-digit numeric PIN.
 */
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * NOTE: a local duplicate of the same-named helper in lib/galleryPublish.js.
 * Builds a URL-safe gallery slug from the event name with a random suffix.
 */
function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "gallery"}-${suffix}`;
}

/**
 * POST /api/events/[id]/gallery/publish
 *
 * Publishes (or republishes) the event's gallery. Requires at least one
 * photo currently selected for the gallery (see `canPublishGallery`).
 * Assigns a stable slug on first publish (retried on rare collisions)
 * and generates a PIN only on first publish — republishes intentionally
 * reuse the existing PIN so a previously shared link/PIN keeps working.
 * Every currently-selected, non-excluded photo is marked
 * `publishedForGallery: true` so the admin UI can treat it as live.
 *
 * Response: { status, slug, url, pin, isFirstPublish } — `pin` is only
 * non-null on first publish, since it can never be retrieved again
 * after that (see /gallery/regenerate-pin to issue a new one).
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

    const selectedCount = await Photo.countDocuments({
      eventId: id,
      selectedForGallery: true,
      excludedFromGallery: { $ne: true },
    });
    if (!canPublishGallery({ event, user, selectedCount })) {
      return NextResponse.json(
        { success: false, message: "Select at least one photo before publishing." },
        { status: 400 }
      );
    }

    // Slug stays stable across republishes so a previously shared link
    // keeps working.
    //
    // The PIN is only generated on first publish. On every republish after
    // that we deliberately keep the existing PIN — the customer already
    // has it, and rotating it on every republish would lock them out for
    // no reason. The only way the PIN changes after first publish is the
    // admin explicitly hitting "Regenerate PIN" (separate endpoint).
    const isFirstPublish = !event.galleryPinHash;
    let plainPin = null;
    if (isFirstPublish) {
      plainPin = generatePin();
      event.galleryPinHash = await bcrypt.hash(plainPin, 10);
    }
    event.galleryPublished = true;

    // Every photo currently selected goes live now, so lock it in as
    // "already published" — the admin UI uses this to stop treating it as
    // a pending selection decision on future visits.
    await Photo.updateMany(
      { eventId: id, selectedForGallery: true, excludedFromGallery: { $ne: true } },
      { $set: { publishedForGallery: true } }
    );

    if (!event.gallerySlug) {
      for (let attempt = 0; attempt < 5; attempt++) {
        event.gallerySlug = generateSlug(event.name);
        try {
          await event.save();
          break;
        } catch (err) {
          if (err.code === 11000 && attempt < 4) continue; // slug collision, retry
          throw err;
        }
      }
    } else {
      await event.save();
    }

    const origin = req.headers.get("origin") || new URL(req.url).origin;

    return NextResponse.json({
      success: true,
      data: {
        status: "published",
        slug: event.gallerySlug,
        url: `${origin}/gallery/${event.gallerySlug}`,
        // Only present on first publish — republishes reuse the existing
        // PIN, which the admin was already shown once and can't retrieve
        // again from the server. If they need it again, they regenerate.
        pin: plainPin,
        isFirstPublish,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to publish gallery." },
      { status: 500 }
    );
  }
}
