"use client";

import { useEffect, useState } from "react";
import { eventsAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import { useToast } from "@/lib/useToast";
import EventCard from "@/components/EventCard";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";

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
      <h1 className="font-display text-3xl">Your events</h1>
      <p className="mt-1 text-sm text-ash">Events you&apos;ve been assigned to upload photos for.</p>

      <div className="mt-8">
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
          <div>
            {events.map((event) => (
              <EventCard key={idOf(event)} event={event} href={`/team/events/${idOf(event)}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
