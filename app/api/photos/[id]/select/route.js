import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Photo from "@/models/Photo";
import { getAuthUser } from "@/lib/authHelper";

export async function PATCH(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { selected } = await req.json();

    await connectDB();
    const photo = await Photo.findByIdAndUpdate(
      id,
      { selected: Boolean(selected) },
      { new: true }
    );

    if (!photo) {
      return NextResponse.json(
        { success: false, message: "Photo not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: photo._id,
        selected: photo.selected,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to select photo." },
      { status: 500 }
    );
  }
}
