"use client";

import { use, useEffect, useState } from "react";
import { eventsAPI, photosAPI } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import PhotoGrid, { PhotoGridSkeleton } from "@/components/PhotoGrid";
import PhotoUploadForm from "@/components/PhotoUploadForm";
import EmptyState from "@/components/EmptyState";
import Topbar from "@/components/Topbar";

export default function TeamEventDetail({ params }) {
  const { id } = use(params);
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const loadPhotos = async () => {
    try {
      const data = await photosAPI.listAllForEvent(id);
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
      <div className="px-5 py-7 sm:px-8">
        <EmptyState
          title="You're not assigned to this event"
          description="Ask your admin to assign you if you think this is a mistake."
        />
      </div>
    );
  }

  return (
    <div>
      <Topbar eyebrow={`Your events / ${event?.name || ""}`} title={event?.name || "Loading…"} />

      <div className="max-w-[920px] px-5 py-7 sm:px-8">
        <div className="mb-5 flex items-center gap-3">
          {event?.coverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverPhotoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
            />
          )}
          <p className="text-sm text-muted-foreground">
            Upload your photos for this event below. The admin selects which ones go into the
            published gallery.
          </p>
        </div>

        <section>
          <PhotoUploadForm
            eventId={id}
            onUploaded={() => {
              loadPhotos();
            }}
          />
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Event photos</h2>
            {photos && <span className="text-xs text-muted-foreground">{photos.length} photos</span>}
          </div>
          <div className="mt-4">
            {photos === null && <PhotoGridSkeleton count={8} />}
            {photos?.length === 0 && (
              <EmptyState
                title="Nothing uploaded yet"
                description="Photos uploaded for this event will show up here."
              />
            )}
            {photos && photos.length > 0 && <PhotoGrid photos={photos} />}
          </div>
        </section>
      </div>
    </div>
  );
}
