import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import CustomerPhotoFeedback from "@/models/CustomerPhotoFeedback";
import { getGalleryAccess } from "@/lib/authHelper";

export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    await connectDB();
    const event = await Event.findOne({ gallerySlug: slug, galleryPublished: true });
    if (!event) return NextResponse.json({ success: false, message: "This gallery isn't available." }, { status: 404 });
    const access = await getGalleryAccess(event);
    if (!access) {
      return NextResponse.json({ success: false, message: "Verify the gallery PIN before viewing your feedback." }, { status: 401 });
    }

    const feedback = await CustomerPhotoFeedback.find({
      eventId: event._id,
      customerSessionId: access.sessionId,
    }).populate("photoId", "filename selectedForGallery excludedFromGallery").sort({ updatedAt: -1 });

    // Do not return feedback for a photo that has since been removed from
    // the published gallery; it is no longer part of the customer view.
    const visibleFeedback = feedback.filter((entry) =>
      entry.photoId && entry.photoId.selectedForGallery && !entry.photoId.excludedFromGallery
    );
    return NextResponse.json({
      success: true,
      data: {
        feedback: visibleFeedback.map((entry) => ({
          id: entry._id,
          photoId: entry.photoId._id,
          filename: entry.photoId.filename,
          rating: entry.rating,
          comment: entry.comment,
          updatedAt: entry.updatedAt,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Couldn't load your feedback." }, { status: 500 });
  }
}

// PIN-verified customers can rate/comment only on photos currently visible
// in their own published gallery. A repeat submission updates their own
// feedback instead of creating another record.
export async function POST(req, { params }) {
  try {
    const { slug } = await params;
    const { photoId, rating, comment } = await req.json();
    if (!mongoose.isValidObjectId(photoId)) {
      return NextResponse.json({ success: false, message: "That photo is not valid for this gallery." }, { status: 400 });
    }
    const normalizedRating = Number(rating);
    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return NextResponse.json({ success: false, message: "Choose a rating from 1 to 5 stars." }, { status: 400 });
    }
    if (typeof comment === "string" && comment.length > 1000) {
      return NextResponse.json({ success: false, message: "Your comment must be 1,000 characters or fewer." }, { status: 400 });
    }

    await connectDB();
    const event = await Event.findOne({ gallerySlug: slug, galleryPublished: true });
    if (!event) return NextResponse.json({ success: false, message: "This gallery isn't available." }, { status: 404 });
    const access = await getGalleryAccess(event);
    if (!access) {
      return NextResponse.json({ success: false, message: "Verify the gallery PIN before rating a photo." }, { status: 401 });
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

    const feedback = await CustomerPhotoFeedback.findOneAndUpdate(
      { photoId: photo._id, customerSessionId: access.sessionId },
      {
        $set: {
          eventId: event._id,
          gallerySlug: slug,
          rating: normalizedRating,
          comment: typeof comment === "string" ? comment.trim() : "",
        },
        $setOnInsert: { customerSessionId: access.sessionId },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: { id: feedback._id, photoId: feedback.photoId, rating: feedback.rating, comment: feedback.comment, updatedAt: feedback.updatedAt },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Couldn't save your photo feedback." }, { status: 500 });
  }
}
