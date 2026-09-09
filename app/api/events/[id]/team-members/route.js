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
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required." },
        { status: 400 }
      );
    }

    await connectDB();
    const event = await Event.findById(id);

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    if (!event.assignedTeam.includes(userId)) {
      event.assignedTeam.push(userId);
      await event.save();
    }

    const updatedEvent = await Event.findById(id).populate("assignedTeam", "name email");

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to assign team member." },
      { status: 500 }
    );
  }
}
