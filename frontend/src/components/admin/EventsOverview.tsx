import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
    <div className="flex flex-col gap-5">
      <div className="border-b pb-4">
        <h1 className="font-display text-xl font-semibold text-foreground">События</h1>
        <p className="mt-1 text-xs text-muted-foreground">{filteredEvents.length} из {events.length} · {upcomingCount} будущих</p>
      </div>

      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: событие, заведение, категория" />

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
                className={cn("h-auto w-full justify-start rounded-lg border bg-card p-3 text-left shadow-none", isPast && "opacity-60")}
              >
                <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="truncate font-semibold text-foreground">{event.title}</div>
                    </div>
                    <div className="mt-1 truncate text-[10px] text-muted-foreground">{venue?.name || event.venueId} · {event.description || "без описания"}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    <Badge variant="outline">{event.date}</Badge>
                    <Badge variant="outline">{event.time}</Badge>
                    {isPast && <Badge variant="outline">прошло</Badge>}
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
