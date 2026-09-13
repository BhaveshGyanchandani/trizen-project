"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { eventsAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import { useToast } from "@/lib/useToast";
import Button from "@/components/Button";
import Field, { inputClass } from "@/components/Field";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import EventCard from "@/components/EventCard";
import Loader from "@/components/Loader";
import Topbar from "@/components/Topbar";
import KpiRow from "@/components/KpiRow";

export default function AdminDashboard() {
  const [events, setEvents] = useState(null); // null = loading
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  const load = async () => {
    try {
      const data = await eventsAPI.list();
      setEvents(Array.isArray(data) ? data : data?.events || []);
    } catch (err) {
      toast.error(err.message || "Couldn't load events.");
      setEvents([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPhotos = events?.reduce((sum, e) => sum + (e.photoCount ?? e.photos?.length ?? 0), 0);
  const publishedCount = events?.filter(
    (e) => (e.gallery?.status ?? e.galleryStatus) === "published"
  ).length;

  return (
    <div>
      <Topbar eyebrow="STUDIO CONSOLE" title="Events">
        <Button onClick={() => setModalOpen(true)}>+ Create event</Button>
      </Topbar>

      <div className="px-8 py-7">
        {events && events.length > 0 && (
          <KpiRow
            stats={[
              { label: "TOTAL EVENTS", value: events.length },
              { label: "PHOTOS UPLOADED", value: totalPhotos },
              { label: "GALLERIES LIVE", value: publishedCount, tone: "develop" },
            ]}
          />
        )}

        {events === null && (
          <div className="flex justify-center py-16">
            <Loader label="Loading events" />
          </div>
        )}
        {events?.length === 0 && (
          <EmptyState
            title="No events yet"
            description="Create your first event, then add team members to start collecting photos."
            action={<Button onClick={() => setModalOpen(true)}>Create event</Button>}
          />
        )}
        {events && events.length > 0 && (
          <div>
            <h2 className="mb-1 font-display text-lg">Every event you&apos;re running</h2>
            <p className="mb-4 text-sm text-ash">Sorted by most recently active.</p>
            <div className="rounded-[var(--radius-proof)] border border-line bg-ink-soft px-3">
              {events.map((event) => (
                <EventCard key={idOf(event)} event={event} href={`/admin/events/${idOf(event)}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(event) => {
          setEvents((prev) => [event, ...(prev || [])]);
          toast.success(`"${event.name}" created.`);
        }}
      />
    </div>
  );
}

function CreateEventModal({ open, onClose, onCreated }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ name }) => {
    const event = await eventsAPI.create({ name });
    reset();
    onCreated(event);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create event">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Event name" error={errors.name && "Give the event a name."}>
          <input
            autoFocus
            {...register("name", { required: true })}
            className={inputClass("ink", !!errors.name)}
            placeholder="Arjun & Priya Wedding"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
