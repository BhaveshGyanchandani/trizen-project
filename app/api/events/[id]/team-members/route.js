import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import User from "@/models/User";
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
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: "userId is required." }, { status: 400 });
    }

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

    // Can only assign team members this admin actually created — prevents
    // assigning an arbitrary account (or another admin's roster) to the event.
    const member = await User.findOne({ _id: userId, role: "team_member", createdBy: user._id });
    if (!member) {
      return NextResponse.json(
        { success: false, message: "That person isn't on your team." },
        { status: 400 }
      );
    }

    const alreadyAssigned = event.assignedTeam.some((memberId) => String(memberId) === String(userId));
    if (!alreadyAssigned) {
      event.assignedTeam.push(userId);
      await event.save();
    }

    const updated = await Event.findById(id).populate("assignedTeam", "name email");

    return NextResponse.json({
      success: true,
      data: {
        id: updated._id,
        name: updated.name,
        teamMembers: updated.assignedTeam.map((m) => ({ id: m._id, name: m.name, email: m.email })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to assign team member." },
      { status: 500 }
    );
  }
}
