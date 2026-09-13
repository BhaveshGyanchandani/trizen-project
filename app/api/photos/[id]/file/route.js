import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { openStoredImage } from "@/lib/storage";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import { getAuthUser, getGalleryAccess } from "@/lib/authHelper";
import { canReadPhoto } from "@/lib/accessControl";

// Serves an authorized photo from Cloudinary. The signed Cloudinary URL is
// fetched server-side so it never appears in browser markup; this preserves
// the existing role and PIN access controls. Legacy GridFS records keep
// working until the migration script has moved them.
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

    const isPublishedPhoto = event.galleryPublished && photo.selectedForGallery && !photo.excludedFromGallery;
    const galleryAccess = isPublishedPhoto ? await getGalleryAccess(event) : null;
    const publiclyVisible = Boolean(galleryAccess);
    if (!publiclyVisible) {
      const user = await getAuthUser();
      if (!canReadPhoto({ event, photo, user, hasGalleryAccess: publiclyVisible, isPublished: isPublishedPhoto })) {
        return NextResponse.json(
          { success: false, message: "Verify the gallery PIN before viewing this photo." },
          { status: 403 }
        );
      }
    }

    if (photo.cloudinaryPublicId || photo.gridfsId) {
      const stored = await openStoredImage(photo);
      return new Response(stored.body, {
        status: 200,
        headers: { "Content-Type": stored.contentType, "Cache-Control": "private, no-store" },
      });
    }

    // Fallback for legacy photos storing storageUrl / url / secure_url
    const fallbackUrl = photo.storageUrl || photo.url || photo.secure_url;
    if (fallbackUrl) {
      if (fallbackUrl.startsWith("/uploads/")) {
        const fs = await import("fs");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", fallbackUrl);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
          };
          return new Response(fileBuffer, {
            status: 200,
            headers: {
              "Content-Type": mimeTypes[ext] || "image/jpeg",
              "Cache-Control": "private, no-store",
            },
          });
        }
      }
      return NextResponse.redirect(new URL(fallbackUrl, req.url));
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
