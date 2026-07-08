import { Venue, VenueEvent } from "../types";

export interface VenueDiscoveryFilters {
  categories: string[];
  tags: string[];
  openNow: boolean;
  hasEventToday: boolean;
  search: string;
}

export const createEmptyVenueDiscoveryFilters = (): VenueDiscoveryFilters => ({
  categories: [],
  tags: [],
  openNow: false,
  hasEventToday: false,
  search: "",
});

export const normalizeVenueDiscoveryFilters = (
  filters: VenueDiscoveryFilters | (Partial<VenueDiscoveryFilters> & { category?: string; tag?: string }),
): VenueDiscoveryFilters => ({
  categories: filters.categories || (filters.category ? [filters.category] : []),
  tags: filters.tags || (filters.tag ? [filters.tag] : []),
  openNow: Boolean(filters.openNow),
  hasEventToday: Boolean(filters.hasEventToday),
  search: filters.search || "",
});

interface FilterVenuesOptions {
  adminMode?: boolean;
  collectionVenueIds?: string[];
  events?: VenueEvent[];
  now?: Date;
}

const TIME_RANGE_PATTERN =
  /(?:с\s*)?(\d{1,2}):(\d{2})\s*(?:-|до)\s*(\d{1,2}):(\d{2})/gi;

const DAY_INDEX: Record<string, number> = {
  пн: 1,
  вт: 2,
  ср: 3,
  чт: 4,
  пт: 5,
  сб: 6,
  вс: 0,
};

const toMinutes = (hours: number, minutes: number) => hours * 60 + minutes;

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const expandDayRange = (start: number, end: number) => {
  const days: number[] = [];
  let cursor = start;

  while (true) {
    days.push(cursor);
    if (cursor === end) break;
    cursor = (cursor + 1) % 7;
  }

  return days;
};

const getDayRestrictions = (text: string) => {
  const normalized = text.toLowerCase();
  const matches = Array.from(normalized.matchAll(/(пн|вт|ср|чт|пт|сб|вс)(?:\s*-\s*(пн|вт|ср|чт|пт|сб|вс))?/g));
  const days = new Set<number>();

  matches.forEach((match) => {
    const start = DAY_INDEX[match[1]];
    const end = match[2] ? DAY_INDEX[match[2]] : start;
    expandDayRange(start, end).forEach((day) => days.add(day));
  });

  return days;
};

const segmentAppliesToday = (segment: string, today: number) => {
  const restrictedDays = getDayRestrictions(segment);
  return restrictedDays.size === 0 || restrictedDays.has(today);
};

const isTimeInRange = (nowMinutes: number, startMinutes: number, endMinutes: number) => {
  if (startMinutes === endMinutes) return true;

  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
};

export const isVenueOpenNow = (workingHours: string, now = new Date()) => {
  const segments = workingHours.split(",").map((segment) => segment.trim()).filter(Boolean);
  const nowMinutes = toMinutes(now.getHours(), now.getMinutes());
  const today = now.getDay();
  let parsedAnyRange = false;

  for (const segment of segments) {
    const matches = Array.from(segment.matchAll(TIME_RANGE_PATTERN));
    if (matches.length === 0) continue;

    for (const match of matches) {
      const startHours = Number(match[1]);
      const startMinutes = Number(match[2]);
      const endHours = Number(match[3]);
      const endMinutes = Number(match[4]);

      if (
        startHours > 23 ||
        endHours > 23 ||
        startMinutes > 59 ||
        endMinutes > 59
      ) {
        continue;
      }

      parsedAnyRange = true;

      if (!segmentAppliesToday(segment, today)) {
        continue;
      }

      if (
        isTimeInRange(
          nowMinutes,
          toMinutes(startHours, startMinutes),
          toMinutes(endHours, endMinutes),
        )
      ) {
        return true;
      }
    }
  }

  // If the schedule is free-form and cannot be parsed, keep the venue visible.
  return !parsedAnyRange;
};

export const hasEventOnDate = (
  venueId: string,
  events: VenueEvent[] = [],
  dateKey = getLocalDateKey(new Date()),
) => events.some((event) => event.venueId === venueId && event.date === dateKey);

export const filterVenuesForDiscovery = (
  venues: Venue[],
  filters: VenueDiscoveryFilters | (Partial<VenueDiscoveryFilters> & { category?: string; tag?: string }),
  options: FilterVenuesOptions = {},
) => {
  const {
    adminMode = false,
    collectionVenueIds,
    events = [],
    now = new Date(),
  } = options;
  const dateKey = getLocalDateKey(now);
  const normalizedFilters = normalizeVenueDiscoveryFilters(filters);

  return venues.filter((venue) => {
    if (venue.status !== "published" && !adminMode) return false;
    if (collectionVenueIds && !collectionVenueIds.includes(venue.id)) return false;
    if (
      normalizedFilters.categories.length > 0 &&
      !normalizedFilters.categories.some((category) => venue.category.toLowerCase() === category.toLowerCase())
    ) {
      return false;
    }
    if (
      normalizedFilters.tags.length > 0 &&
      !normalizedFilters.tags.every((tag) => venue.tags.some((venueTag) => venueTag.toLowerCase() === tag.toLowerCase()))
    ) {
      return false;
    }
    if (normalizedFilters.openNow && !isVenueOpenNow(venue.workingHours, now)) return false;
    if (normalizedFilters.hasEventToday && !hasEventOnDate(venue.id, events, dateKey)) return false;

    if (normalizedFilters.search) {
      const query = normalizedFilters.search.toLowerCase();
      const matchesName = venue.name.toLowerCase().includes(query);
      const matchesDesc = venue.shortDescription.toLowerCase().includes(query);
      const matchesTags = venue.tags.some((tag) => tag.toLowerCase().includes(query));
      if (!matchesName && !matchesDesc && !matchesTags) return false;
    }

    return true;
  });
};
