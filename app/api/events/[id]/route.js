import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser } from "@/lib/authHelper";

export async function GET(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();
    const event = await Event.findById(id).populate("assignedTeam", "name email");

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: event._id,
        name: event.name,
        createdBy: event.createdBy,
        assignedTeam: event.assignedTeam,
        galleryPublished: event.galleryPublished,
        galleryPin: event.galleryPin,
        gallerySlug: event.gallerySlug,
        createdAt: event.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch event." },
      { status: 500 }
    );
  }
}
