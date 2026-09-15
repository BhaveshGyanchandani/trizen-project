import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import PhotoChangeRequest from "@/models/PhotoChangeRequest";
import { getGalleryAccess } from "@/lib/authHelper";
import mongoose from "mongoose";

/**
 * POST /api/gallery/[slug]/requests
 *
 * Submits a customer request to remove a specific photo from the
 * published gallery. Requires a valid PIN-verified session. A PIN-verified
 * gallery visitor may request a change only for a photo that is
 * currently visible in that exact published gallery, and only one
 * pending request per photo per visitor is allowed at a time.
 *
 * Body: { photoId, reason? }
 * Response: { id, photoId, status, createdAt }
 */
export async function POST(req, { params }) {
  try {
    const { slug } = await params;
    const { photoId, reason } = await req.json();
    if (!photoId) {
      return NextResponse.json({ success: false, message: "Choose a photo before submitting a request." }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(photoId)) {
      return NextResponse.json({ success: false, message: "That photo is not valid for this gallery." }, { status: 400 });
    }
    if (typeof reason === "string" && reason.length > 1000) {
      return NextResponse.json({ success: false, message: "Your comment must be 1,000 characters or fewer." }, { status: 400 });
    }

    await connectDB();
    const event = await Event.findOne({ gallerySlug: slug, galleryPublished: true });
    if (!event) {
      return NextResponse.json({ success: false, message: "This gallery isn't available." }, { status: 404 });
    }
    const access = await getGalleryAccess(event);
    if (!access) {
      return NextResponse.json({ success: false, message: "Verify the gallery PIN before submitting a request." }, { status: 401 });
    }
    const photo = await Photo.findOne({
      _id: photoId,
      eventId: event._id,
      selectedForGallery: true,
      excludedFromGallery: { $ne: true },
    });
    if (!photo) {
      return NextResponse.json({ success: false, message: "That photo is not available in this gallery." }, { status: 404 });
    }

    const existing = await PhotoChangeRequest.findOne({
      photoId: photo._id,
      customerSessionId: access.sessionId,
      status: "PENDING",
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "You already have a pending request for this photo." }, { status: 409 });
    }

    const request = await PhotoChangeRequest.create({
      eventId: event._id,
      photoId: photo._id,
      gallerySlug: slug,
      customerSessionId: access.sessionId,
      reason: typeof reason === "string" ? reason.trim() : "",
    });

    return NextResponse.json({
      success: true,
      data: { id: request._id, photoId: request.photoId, status: request.status, createdAt: request.createdAt },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Couldn't submit the photo request." },
      { status: 500 }
    );
  }
}
