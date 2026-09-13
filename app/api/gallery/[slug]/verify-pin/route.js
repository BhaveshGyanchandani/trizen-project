import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";

export async function POST(req, { params }) {
  try {
    const { slug } = await params;
    const { pin } = await req.json();

    if (!pin || !/^\d{6}$/.test(String(pin).trim())) {
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

    const photos = await Photo.find({ eventId: event._id, selectedForGallery: true }).sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      data: {
        eventName: event.name,
        photos: photos.map((p) => ({
          id: p._id,
          filename: p.filename,
          storageUrl: p.storageUrl || `/api/photos/${p._id}/file`,
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
