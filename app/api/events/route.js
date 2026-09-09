import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser } from "@/lib/authHelper";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();
    let events = [];
    if (user.role === "admin") {
      events = await Event.find({ createdBy: user._id }).populate("assignedTeam", "name email");
    } else {
      events = await Event.find({ assignedTeam: user._id }).populate("assignedTeam", "name email");
    }

    return NextResponse.json({
      success: true,
      data: events.map((e) => ({
        id: e._id,
        name: e.name,
        createdBy: e.createdBy,
        assignedTeam: e.assignedTeam,
        galleryPublished: e.galleryPublished,
        galleryPin: e.galleryPin,
        gallerySlug: e.gallerySlug,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch events." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    await connectDB();
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Event name is required." },
        { status: 400 }
      );
    }

    const event = await Event.create({
      name,
      createdBy: user._id,
      assignedTeam: [],
    });

    return NextResponse.json({
      success: true,
      data: {
        id: event._id,
        name: event.name,
        createdBy: event.createdBy,
        assignedTeam: [],
        galleryPublished: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create event." },
      { status: 500 }
    );
  }
}
