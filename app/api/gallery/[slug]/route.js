import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";

// Public, no auth — metadata only, no PIN required yet.
export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    await connectDB();
    const event = await Event.findOne({ gallerySlug: slug });

    if (!event || !event.galleryPublished) {
      return NextResponse.json(
        { success: false, message: "This gallery isn't available." },
        { status: 404 }
      );
    }

    const photoCount = await Photo.countDocuments({ eventId: event._id, selectedForGallery: true });

    return NextResponse.json({
      success: true,
      data: { name: event.name, photoCount },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch gallery." },
      { status: 500 }
    );
  }
}
