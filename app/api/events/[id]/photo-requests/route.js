import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import PhotoChangeRequest from "@/models/PhotoChangeRequest";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

/**
 * GET /api/events/[id]/photo-requests
 *
 * Lists customer photo-removal requests for an event, optionally
 * filtered by status. Admin only, restricted to the event's owner.
 *
 * Query params: status (all|PENDING|APPROVED|REJECTED)
 * Response: { requests, pendingCount }
 */
export async function GET(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 403 });
    }
    const { id: eventId } = await params;
    await connectDB();
    const event = await Event.findById(eventId);
    if (!event) return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    if (!isEventOwner(event, user)) {
      return NextResponse.json({ success: false, message: "You don't have access to this event." }, { status: 403 });
    }

    const status = new URL(req.url).searchParams.get("status") || "all";
    if (!["all", "PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid request status filter." }, { status: 400 });
    }
    const query = { eventId };
    if (status !== "all") query.status = status;
    const [requests, pendingCount] = await Promise.all([
      PhotoChangeRequest.find(query).populate("photoId", "filename").sort({ createdAt: -1 }),
      PhotoChangeRequest.countDocuments({ eventId, status: "PENDING" }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        requests: requests.map((request) => ({
          id: request._id,
          photoId: request.photoId?._id || request.photoId,
          photoFilename: request.photoId?.filename || "Photo no longer available",
          photoUrl: request.photoId?._id ? `/api/photos/${request.photoId._id}/file` : null,
          reason: request.reason,
          status: request.status,
          createdAt: request.createdAt,
        })),
        pendingCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Couldn't load customer requests." }, { status: 500 });
  }
}
