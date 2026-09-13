"use client";

import { useEffect, useState } from "react";
import { eventsAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import { useToast } from "@/lib/useToast";
import EventCard from "@/components/EventCard";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Topbar from "@/components/Topbar";
import KpiRow from "@/components/KpiRow";

export default function TeamDashboard() {
  const [events, setEvents] = useState(null);
  const toast = useToast();

  useEffect(() => {
    eventsAPI
      .list()
      .then((data) => setEvents(Array.isArray(data) ? data : data?.events || []))
      .catch((err) => {
        toast.error(err.message || "Couldn't load your events.");
        setEvents([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Topbar eyebrow="TEAM WORKSPACE" title="Your events" />

      <div className="px-8 py-7">
        {events && events.length > 0 && (
          <KpiRow stats={[{ label: "EVENTS ASSIGNED", value: events.length }]} />
        )}

        <p className="mb-4 text-sm text-ash">Events you&apos;ve been assigned to upload photos for.</p>

        {events === null && (
          <div className="flex justify-center py-16">
            <Loader label="Loading events" />
          </div>
        )}
        {events?.length === 0 && (
          <EmptyState
            title="No events assigned yet"
            description="Once an admin assigns you to an event, it'll show up here."
          />
        )}
        {events && events.length > 0 && (
          <div className="rounded-[var(--radius-proof)] border border-line bg-ink-soft px-3">
            {events.map((event) => (
              <EventCard key={idOf(event)} event={event} href={`/team/events/${idOf(event)}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
