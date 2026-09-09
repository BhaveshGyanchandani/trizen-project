import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    await connectDB();
    const event = await Event.findOne({ gallerySlug: slug });

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Gallery not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        name: event.name,
        published: event.galleryPublished,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch gallery." },
      { status: 500 }
    );
  }
}
