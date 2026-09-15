import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import User from "@/models/User";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

/**
 * POST /api/events/[id]/team-members
 *
 * Assigns a team member to an event. Admin only, and restricted to
 * team members this admin actually created — prevents assigning an
 * arbitrary account (or another admin's roster) to the event.
 * Idempotent: assigning an already-assigned member is a no-op.
 *
 * Body: { userId }
 * Response: the event's id, name, and updated team member list.
 */
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

/**
 * DELETE /api/events/[id]/team-members
 *
 * Unassigns a team member from an event, revoking their access to it.
 * As with assignment, the admin may only manage people on their own
 * roster, never another admin's team member account. Deliberately does
 * not delete the member or any photos they previously uploaded, so the
 * admin retains the event record and audit trail.
 *
 * Body: { userId }
 * Response: the event's id, name, and updated team member list.
 */
export async function DELETE(req, { params }) {
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
    if (!event) return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    if (!isEventOwner(event, user)) {
      return NextResponse.json({ success: false, message: "You don't have access to this event." }, { status: 403 });
    }

    // As with assignment, the admin may only manage people on their own
    // roster, never another admin's team member account.
    const member = await User.findOne({ _id: userId, role: "team_member", createdBy: user._id });
    if (!member) {
      return NextResponse.json({ success: false, message: "That person isn't on your team." }, { status: 400 });
    }

    event.assignedTeam = event.assignedTeam.filter((memberId) => String(memberId) !== String(userId));
    await event.save();
    await event.populate("assignedTeam", "name email");

    return NextResponse.json({
      success: true,
      data: {
        id: event._id,
        name: event.name,
        teamMembers: event.assignedTeam.map((assignedMember) => ({
          id: assignedMember._id,
          name: assignedMember.name,
          email: assignedMember.email,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to remove team member from this event." },
      { status: 500 }
    );
  }
}
