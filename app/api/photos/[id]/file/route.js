import { NextResponse } from "next/server";
import { connectDB, getPhotosBucket } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, canAccessEventPhotos } from "@/lib/authHelper";

// Serves a photo's bytes out of the "photos" GridFS bucket. GridFS files
// aren't reachable by a static URL the way public/uploads was, so every
// photo-displaying surface (admin review grid, team member's own uploads,
// customer gallery) now points its <img> src at this route instead.
//
// Three separate audiences load images through here, and only one of them
// has a session cookie:
//   1. The owning admin, reviewing all photos on their event.
//   2. A team member, viewing photos they uploaded.
//   3. A customer on a published gallery page — reached the photo list via
//      POST /api/gallery/[slug]/verify-pin, which has no ongoing session;
//      the PIN check happens once, up front, and the returned photo URLs
//      are then loaded as plain <img> tags. So this route has to allow
//      unauthenticated reads too, but ONLY for a photo that is currently
//      selectedForGallery on an event whose gallery is currently published
//      — that's the equivalent of the old "unguessable /uploads/<uuid>
//      filename" gate, scoped to exactly the photos a customer is meant to
//      see. Anything else requires a real session via canAccessEventPhotos.
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const photo = await Photo.findById(id);
    if (!photo) {
      return NextResponse.json({ success: false, message: "Photo not found." }, { status: 404 });
    }

    const event = await Event.findById(photo.eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Photo not found." }, { status: 404 });
    }

    const publiclyVisible = event.galleryPublished && photo.selectedForGallery;
    if (!publiclyVisible) {
      const user = await getAuthUser();
      if (!user || !canAccessEventPhotos(event, user)) {
        return NextResponse.json(
          { success: false, message: "You don't have access to this photo." },
          { status: 403 }
        );
      }
    }

    if (photo.storageUrl) {
      return NextResponse.redirect(new URL(photo.storageUrl, req.url));
    }

    if (photo.gridfsId) {
      const bucket = await getPhotosBucket();
      const downloadStream = bucket.openDownloadStream(photo.gridfsId);

      const body = new ReadableStream({
        start(controller) {
          downloadStream.on("data", (chunk) => controller.enqueue(chunk));
          downloadStream.on("end", () => controller.close());
          downloadStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          downloadStream.destroy();
        },
      });

      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": photo.contentType || "application/octet-stream",
          "Cache-Control": publiclyVisible
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
        },
      });
    }

    return NextResponse.json({ success: false, message: "Photo file not found." }, { status: 404 });
  } catch (error) {
    if (error?.name === "MongoRuntimeError" || /file.*not found/i.test(error?.message || "")) {
      return NextResponse.json({ success: false, message: "Photo file not found." }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load photo." },
      { status: 500 }
    );
  }
}
