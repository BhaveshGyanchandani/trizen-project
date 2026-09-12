import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";

// Status only — the PIN itself is never returned here. It's only ever
// shown once, in the publish response, right after it's generated.
export async function GET(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
    }

    const { id } = await params;
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

    return NextResponse.json({
      success: true,
      data: {
        status: event.galleryPublished ? "published" : "draft",
        slug: event.gallerySlug,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch gallery status." },
      { status: 500 }
    );
  }
}
