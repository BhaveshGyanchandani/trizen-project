import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser } from "@/lib/authHelper";

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
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
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    if (!event.gallerySlug) {
      event.gallerySlug = generateSlug(event.name);
    }
    if (!event.galleryPin) {
      event.galleryPin = generatePin();
    }
    event.galleryPublished = true;
    await event.save();

    return NextResponse.json({
      success: true,
      data: {
        slug: event.gallerySlug,
        pin: event.galleryPin,
        published: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to publish gallery." },
      { status: 500 }
    );
  }
}
