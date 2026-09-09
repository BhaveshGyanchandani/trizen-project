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
    const photos = await Photo.find({ eventId }).sort({ createdAt: -1 });

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
      { success: false, message: error.message || "Failed to fetch photos." },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id: eventId } = await params;
    const formData = await req.formData();
    const files = formData.getAll("photos");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: "No files provided." },
        { status: 400 }
      );
    }

    await connectDB();
    const uploadedPhotos = [];

    for (const file of files) {
      if (typeof file === "object" && file.arrayBuffer) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType = file.type || "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

        const photo = await Photo.create({
          eventId,
          uploadedBy: user._id,
          url: dataUrl,
          selected: false,
        });

        uploadedPhotos.push({
          id: photo._id,
          url: photo.url,
          selected: photo.selected,
          eventId: photo.eventId,
          uploadedBy: photo.uploadedBy,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: uploadedPhotos,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Upload failed." },
      { status: 500 }
    );
  }
}
