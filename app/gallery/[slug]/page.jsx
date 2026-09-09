"use client";

import { use, useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { galleryPublicAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import PinEntryForm from "@/components/PinEntryForm";
import PhotoGrid, { PhotoGridSkeleton } from "@/components/PhotoGrid";
import Loader from "@/components/Loader";

function photoSrc(photo) {
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
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-plate">
        <div className="max-w-sm text-center">
          <p className="font-display text-2xl">This gallery isn&apos;t available</p>
          <p className="mt-2 text-sm text-clay">
            The link may be out of date, or the gallery hasn&apos;t been published yet. Check with
            whoever shared it with you.
          </p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader label="Loading gallery" tone="paper" />
      </div>
    );
  }

  if (!photos) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-plate">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay">Gallery</p>
        <h1 className="mt-3 max-w-lg font-display text-4xl leading-tight sm:text-5xl">
          {meta.name || "Your photos are ready"}
        </h1>
        {meta.photoCount !== undefined && (
          <p className="mt-3 text-sm text-clay">{meta.photoCount} photos are waiting for you</p>
        )}
        <div className="mt-8">
          <PinEntryForm onSubmit={handleVerify} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-plate">
      <header className="border-b border-paper-line px-6 py-10 text-center sm:py-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay">Gallery</p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{meta.name}</h1>
        <p className="mt-2 text-sm text-clay">{photos.length} photos</p>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {photos.length === 0 ? (
          <PhotoGridSkeleton count={0} />
        ) : (
          <PhotoGrid
            photos={photos}
            tone="paper"
            onPhotoClick={(index) => setLightboxIndex(index)}
          />
        )}
      </main>

      <footer className="px-6 pb-10 text-center font-mono text-[11px] text-clay-dim">
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
