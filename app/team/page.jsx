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
      <Topbar eyebrow="Team workspace" title="Your events" />

      <div className="px-5 py-7 sm:px-8">
        {events && events.length > 0 && (
          <KpiRow stats={[{ label: "Events assigned", value: events.length }]} />
        )}

        <p className="mb-4 text-sm text-muted-foreground">Events you&apos;ve been assigned to upload photos for.</p>

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
          <div className="rounded-xl border border-border bg-card px-1">
            {events.map((event) => (
              <EventCard key={idOf(event)} event={event} href={`/team/events/${idOf(event)}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
