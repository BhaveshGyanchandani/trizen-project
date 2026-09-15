import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser } from "@/lib/authHelper";

/** Shapes an Event document into the summary fields returned by the events list/create endpoints. */
function serializeEvent(event, photoCountByEvent) {
  return {
    id: event._id,
    name: event.name,
    createdBy: event.createdBy,
    teamMembers: (event.assignedTeam || []).map((m) =>
      m && m._id ? { id: m._id, name: m.name, email: m.email } : m
    ),
    galleryStatus: event.galleryPublished ? "published" : "draft",
    gallerySlug: event.gallerySlug,
    coverPhotoUrl: event.coverPhotoCloudinaryPublicId || event.coverPhotoGridfsId ? `/api/events/${event._id}/cover` : null,
    photoCount: photoCountByEvent?.get(String(event._id)) ?? 0,
    createdAt: event.createdAt,
  };
}

/**
 * GET /api/events
 *
 * Lists events scoped to the caller's role: admins see events they
 * created, team members see events they're assigned to. Includes each
 * event's live photo count via a single aggregation pass.
 *
 * Response: array of event summaries.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const filter = user.role === "admin" ? { createdBy: user._id } : { assignedTeam: user._id };
    const events = await Event.find(filter).populate("assignedTeam", "name email").sort({ createdAt: -1 });

    const counts = await Photo.aggregate([
      { $match: { eventId: { $in: events.map((e) => e._id) } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);
    const photoCountByEvent = new Map(counts.map((c) => [String(c._id), c.count]));

    return NextResponse.json({
      success: true,
      data: events.map((e) => serializeEvent(e, photoCountByEvent)),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch events." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 *
 * Creates a new event. Admin only.
 *
 * Body: { name }
 * Response: the created event summary.
 */
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
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Event name is required." },
        { status: 400 }
      );
    }

    const event = await Event.create({ name: name.trim(), createdBy: user._id, assignedTeam: [] });

    return NextResponse.json({ success: true, data: serializeEvent(event, new Map()) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create event." },
      { status: 500 }
    );
  }
}
