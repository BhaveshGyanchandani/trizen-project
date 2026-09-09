"use client";

import { use, useEffect, useState } from "react";
import { eventsAPI, photosAPI } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import PhotoGrid, { PhotoGridSkeleton } from "@/components/PhotoGrid";
import PhotoUploadForm from "@/components/PhotoUploadForm";
import EmptyState from "@/components/EmptyState";

export default function TeamEventDetail({ params }) {
  const { id } = use(params);
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const loadPhotos = async () => {
    try {
      const data = await photosAPI.listMineForEvent(id);
      setPhotos(Array.isArray(data) ? data : data?.photos || []);
    } catch (err) {
      if (err.status === 403) setForbidden(true);
    }
  };

  useEffect(() => {
    eventsAPI
      .getById(id)
      .then(setEvent)
      .catch((err) => {
        if (err.status === 403 || err.status === 404) setForbidden(true);
        else toast.error(err.message || "Couldn't load this event.");
      });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (forbidden) {
    return (
      <EmptyState
        title="You're not assigned to this event"
        description="Ask your admin to assign you if you think this is a mistake."
      />
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl">{event?.name || "Loading…"}</h1>
      <p className="mt-1 text-sm text-ash">Upload your photos for this event below.</p>

      <section className="mt-8">
        <PhotoUploadForm
          eventId={id}
          onUploaded={() => {
            loadPhotos();
          }}
        />
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Your uploads</h2>
          {photos && <span className="font-mono text-xs text-ash">{photos.length} photos</span>}
        </div>
        <div className="mt-4">
          {photos === null && <PhotoGridSkeleton count={8} />}
          {photos?.length === 0 && (
            <EmptyState
              title="Nothing uploaded yet"
              description="Photos you upload for this event will show up here."
            />
          )}
          {photos && photos.length > 0 && <PhotoGrid photos={photos} tone="ink" />}
        </div>
      </section>
    </div>
  );
}
