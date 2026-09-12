import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

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

    event.galleryPublished = false;
    await event.save();

    return NextResponse.json({ success: true, data: { status: "draft" } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to unpublish gallery." },
      { status: 500 }
    );
  }
}
