import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Photo from "@/models/Photo";
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

    const { id: eventId } = await params;
    await connectDB();
    const photos = await Photo.find({ eventId, uploadedBy: user._id }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: photos.map((p) => ({
        id: p._id,
        url: p.url,
        selected: p.selected,
        eventId: p.eventId,
        uploadedBy: p.uploadedBy,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch user photos." },
      { status: 500 }
    );
  }
}
