import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { createGalleryAccessToken, galleryCookieName, getGalleryAccess } from "@/lib/authHelper";
import { isValidGalleryPin } from "@/lib/galleryPolicy";
import { randomUUID } from "crypto";

export async function POST(req, { params }) {
  try {
    const { slug } = await params;
    const { pin } = await req.json();

    if (!isValidGalleryPin(pin)) {
      return NextResponse.json({ success: false, message: "Enter the 6-digit PIN." }, { status: 400 });
    }

    await connectDB();
    const event = await Event.findOne({ gallerySlug: slug });

    if (!event || !event.galleryPublished || !event.galleryPinHash) {
      return NextResponse.json(
        { success: false, message: "This gallery isn't available." },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(String(pin).trim(), event.galleryPinHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Incorrect PIN. Please try again." },
        { status: 401 }
      );
    }

    const photos = await Photo.find({ eventId: event._id, selectedForGallery: true, excludedFromGallery: { $ne: true } }).sort({
      createdAt: -1,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        eventName: event.name,
        photos: photos.map((p) => ({
          id: p._id,
          filename: p.filename,
          storageUrl: `/api/photos/${p._id}/file`,
        })),
      },
    });
    // Keep the same anonymous customer identity when this browser verifies
    // the PIN again (for example after refreshing the gallery). Feedback is
    // uniquely keyed by photo + customerSessionId, so changing this value on
    // every verification would create another rating for the same photo.
    const existingAccess = await getGalleryAccess(event);
    const customerSessionId = existingAccess?.sessionId || randomUUID();
    response.cookies.set(galleryCookieName(event._id), createGalleryAccessToken(event, customerSessionId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "PIN verification failed." },
      { status: 500 }
    );
  }
}
