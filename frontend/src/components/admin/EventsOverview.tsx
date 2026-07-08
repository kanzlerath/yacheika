import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Venue, VenueEvent } from "../../types";
import { EmptyLine } from "./AdminShared";

export function EventsOverview({ events, venues, onSelectVenue }: { events: VenueEvent[]; venues: Venue[]; onSelectVenue: (venue: Venue) => void }) {
  const [query, setQuery] = useState("");
  const venueById = useMemo(() => new Map(venues.map((venue) => [venue.id, venue])), [venues]);
  const today = new Date().toISOString().slice(0, 10);
  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events
      .filter((event) => {
        const venue = venueById.get(event.venueId);
        return !normalizedQuery || [
          event.title,
          event.description,
          event.date,
          venue?.name,
          venue?.category,
        ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [events, query, venueById]);

  const upcomingCount = filteredEvents.filter((event) => event.date >= today).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-neutral-100">События</h2>
        <p className="text-xs text-neutral-500">{filteredEvents.length} из {events.length} · {upcomingCount} будущих</p>
      </div>

      <Input value={query} onChange={(event) => setQuery(event.target.value)} className="admin-input" placeholder="Поиск: событие, заведение, категория" />

      {filteredEvents.length === 0 ? (
        <EmptyLine>События не найдены.</EmptyLine>
      ) : (
        <div className="grid gap-2">
          {filteredEvents.map((event) => {
            const venue = venueById.get(event.venueId);
            const isPast = event.date < today;
            return (
              <Button
                key={event.id}
                type="button"
                variant="ghost"
                onClick={() => venue && onSelectVenue(venue)}
                className={`venue-soft-panel h-auto w-full justify-start p-3 text-left ${isPast ? "opacity-60" : ""}`}
              >
                <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      <div className="truncate font-semibold text-neutral-100">{event.title}</div>
                    </div>
                    <div className="mt-1 truncate text-[10px] text-neutral-500">{venue?.name || event.venueId} · {event.description || "без описания"}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    <Badge variant="outline" className="border-neutral-800 text-neutral-400">{event.date}</Badge>
                    <Badge variant="outline" className="border-neutral-800 text-neutral-400">{event.time}</Badge>
                    {isPast && <Badge variant="outline" className="border-neutral-800 text-neutral-600">прошло</Badge>}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
