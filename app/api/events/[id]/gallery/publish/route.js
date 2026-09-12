import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "gallery"}-${suffix}`;
}

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

    const selectedCount = await Photo.countDocuments({ eventId: id, selectedForGallery: true });
    if (selectedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Select at least one photo before publishing." },
        { status: 400 }
      );
    }

    // Slug stays stable across republishes so a previously shared link
    // keeps working. The PIN is regenerated every publish and only ever
    // exists in plaintext for this one response.
    const plainPin = generatePin();
    event.galleryPinHash = await bcrypt.hash(plainPin, 10);
    event.galleryPublished = true;

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
        pin: plainPin,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to publish gallery." },
      { status: 500 }
    );
  }
}
