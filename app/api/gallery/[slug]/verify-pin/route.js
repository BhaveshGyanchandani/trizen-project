import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";

export async function POST(req, { params }) {
  try {
    const { slug } = await params;
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json(
        { success: false, message: "PIN is required." },
        { status: 400 }
      );
    }

    await connectDB();
    const event = await Event.findOne({ gallerySlug: slug });

    if (!event || !event.galleryPublished) {
      return NextResponse.json(
        { success: false, message: "Gallery is not available." },
        { status: 404 }
      );
    }

    if (event.galleryPin !== pin.trim()) {
      return NextResponse.json(
        { success: false, message: "Incorrect PIN. Please try again." },
        { status: 401 }
      );
    }

    const photos = await Photo.find({ eventId: event._id, selected: true });

    return NextResponse.json({
      success: true,
      data: {
        eventName: event.name,
        photos: photos.map((p) => ({
          id: p._id,
          url: p.url,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "PIN verification failed." },
      { status: 500 }
    );
  }
}
