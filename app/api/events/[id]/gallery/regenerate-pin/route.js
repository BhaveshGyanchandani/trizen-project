import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Explicit admin action to invalidate the current PIN and issue a new one,
// without touching photo selections or the publish state. Use this when a
// PIN has leaked, was shared with the wrong person, or the admin just wants
// a fresh one — as opposed to publish/republish, which now deliberately
// keeps the existing PIN.
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
    if (!event.galleryPublished) {
      return NextResponse.json(
        { success: false, message: "Publish the gallery before generating a PIN." },
        { status: 400 }
      );
    }

    const plainPin = generatePin();
    event.galleryPinHash = await bcrypt.hash(plainPin, 10);
    await event.save();

    return NextResponse.json({
      success: true,
      data: { pin: plainPin },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to regenerate PIN." },
      { status: 500 }
    );
  }
}
