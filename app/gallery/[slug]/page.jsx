"use client";

import { use, useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Camera } from "lucide-react";
import { galleryPublicAPI } from "@/lib/api";
import PinEntryForm from "@/components/PinEntryForm";
import PhotoGrid, { PhotoGridSkeleton } from "@/components/PhotoGrid";
import Loader from "@/components/Loader";

function photoSrc(photo) {
  // Same resolution order as components/PhotoGrid.jsx: the GridFS-backed
  // API route first, since it's the only backend that survives a
  // serverless deploy — storageUrl is a legacy local-disk field.
  const id = photo.id || photo._id;
  if (id) return `/api/photos/${id}/file`;
  return photo.storageUrl || photo.url || photo.secure_url;
}

export default function CustomerGalleryPage({ params }) {
  const { slug } = use(params);

  const [meta, setMeta] = useState(null); // { name, photoCount } | undefined once fetched
  const [unavailable, setUnavailable] = useState(false);
  const [photos, setPhotos] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    galleryPublicAPI
      .getMeta(slug)
      .then(setMeta)
      .catch(() => setUnavailable(true));
  }, [slug]);

  const handleVerify = async (pin) => {
    const result = await galleryPublicAPI.verifyPin(slug, pin);
    setPhotos(Array.isArray(result) ? result : result.photos || []);
  };

  if (unavailable) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <p className="text-xl font-semibold">This gallery isn&apos;t available</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may be out of date, or the gallery hasn&apos;t been published yet. Check with
            whoever shared it with you.
          </p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader label="Loading gallery" />
      </div>
    );
  }

  if (!photos) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-border bg-card">
            <Camera className="size-4.5 text-primary" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Gallery</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {meta.name || "Your photos are ready"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {meta.photoCount !== undefined ? `${meta.photoCount} photos are waiting for you — ` : ""}
            enter the PIN your photographer sent you.
          </p>
          <div className="mt-8 flex justify-center">
            <PinEntryForm onSubmit={handleVerify} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-10 text-center sm:py-14">
        <p className="text-xs font-medium text-muted-foreground">Gallery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{meta.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{photos.length} photos</p>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {photos.length === 0 ? (
          <PhotoGridSkeleton count={0} />
        ) : (
          <PhotoGrid photos={photos} onPhotoClick={(index) => setLightboxIndex(index)} />
        )}
      </main>

      <footer className="px-6 pb-10 text-center text-[11px] text-muted-foreground">
        Shared via Trizen Photo Ops
      </footer>

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={photos.map((p) => ({ src: photoSrc(p), alt: p.filename }))}
        plugins={[Zoom]}
        styles={{ container: { backgroundColor: "rgba(23,24,28,0.96)" } }}
      />
    </div>
  );
}
