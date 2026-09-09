import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser } from "@/lib/authHelper";

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

    event.galleryPublished = false;
    await event.save();

    return NextResponse.json({
      success: true,
      data: { published: false },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to unpublish gallery." },
      { status: 500 }
    );
  }
}
