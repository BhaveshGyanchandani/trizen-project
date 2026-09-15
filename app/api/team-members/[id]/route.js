import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import User from "@/models/User";
import { getAuthUser } from "@/lib/authHelper";
import { canManageTeamMember } from "@/lib/accessControl";

/**
 * DELETE /api/team-members/[id]
 *
 * Removes a team-member account from the admin's studio: unassigns them
 * from every event owned by this admin, then deletes the account.
 * Event assets are intentionally retained so deleting an account never
 * deletes event photos.
 */
export async function DELETE(req, { params }) {
  try {
    const admin = await getAuthUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Team member not found." }, { status: 404 });
    }

    await connectDB();
    const member = await User.findById(id);
    if (!member || !canManageTeamMember(admin, member)) {
      return NextResponse.json({ success: false, message: "You can only delete team members in your studio." }, { status: 403 });
    }

    // Remove every assignment belonging to this admin before deleting the
    // account. Uploaded photos remain as part of the event audit trail.
    await Event.updateMany(
      { createdBy: admin._id, assignedTeam: member._id },
      { $pull: { assignedTeam: member._id } }
    );
    await User.deleteOne({ _id: member._id });

    return NextResponse.json({ success: true, data: { id: member._id } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Couldn't delete the team member." },
      { status: 500 }
    );
  }
}
