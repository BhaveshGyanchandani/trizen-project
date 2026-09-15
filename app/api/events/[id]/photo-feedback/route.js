import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import CustomerPhotoFeedback from "@/models/CustomerPhotoFeedback";
import { getAuthUser, isEventOwner, isAssignedToEvent } from "@/lib/authHelper";

/**
 * GET /api/events/[id]/photo-feedback
 *
 * Lists customer star ratings/comments on an event's photos. Admins see
 * feedback across their event. Assigned team members see only feedback
 * on their own uploads, matching their photo-access boundary.
 */
export async function GET(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    const { id: eventId } = await params;
    await connectDB();
    const event = await Event.findById(eventId);
    if (!event) return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });

    const isAdmin = user.role === "admin" && isEventOwner(event, user);
    const isTeamMember = user.role === "team_member" && isAssignedToEvent(event, user);
    if (!isAdmin && !isTeamMember) {
      return NextResponse.json({ success: false, message: "You don't have access to this event." }, { status: 403 });
    }

    const query = { eventId };
    if (isTeamMember) {
      const ownPhotoIds = await Photo.find({ eventId, uploadedBy: user._id }).distinct("_id");
      query.photoId = { $in: ownPhotoIds };
    }
    const feedback = await CustomerPhotoFeedback.find(query).populate("photoId", "filename").sort({ createdAt: -1 });
    return NextResponse.json({
      success: true,
      data: {
        feedback: feedback.map((entry) => ({
          id: entry._id,
          photoId: entry.photoId?._id || entry.photoId,
          filename: entry.photoId?.filename || "Photo",
          rating: entry.rating,
          comment: entry.comment,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Couldn't load photo feedback." }, { status: 500 });
  }
}
