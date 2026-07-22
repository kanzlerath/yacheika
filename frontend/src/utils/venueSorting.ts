import type { Venue } from "../types";

export type VenueSortMode = "random" | "rating" | "popular" | "distance" | "newest";

type Coordinates = { lat: number; lng: number };

const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
};

export const createRandomVenueRanks = (venueIds: string[]) => new Map(
  shuffle(venueIds).map((id, index) => [id, index]),
);

const calculateDistance = (from: Coordinates, venue: Venue) => {
  const radius = 6371;
  const latitudeDelta = ((venue.latitude - from.lat) * Math.PI) / 180;
  const longitudeDelta = ((venue.longitude - from.lng) * Math.PI) / 180;
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((venue.latitude * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const getRatingScore = (venue: Venue) => {
  const positive = venue.likesCount || 0;
  const total = positive + (venue.notMyPlaceCount || 0);
  if (total === 0) return -1;

  // Wilson lower bound prevents a single positive vote from outranking a well-rated venue.
  const z = 1.96;
  const ratio = positive / total;
  const denominator = 1 + (z * z) / total;
  const center = ratio + (z * z) / (2 * total);
  const margin = z * Math.sqrt((ratio * (1 - ratio) + (z * z) / (4 * total)) / total);
  return (center - margin) / denominator;
};

const getPopularityScore = (venue: Venue) => (
  (venue.likesCount || 0) +
  (venue.notMyPlaceCount || 0) +
  Object.values(venue.vibeRatings || {}).reduce((sum, count) => sum + count, 0)
);

const getCreatedAtTimestamp = (venue: Venue) => {
  const timestamp = new Date(venue.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const sortVenues = (
  venues: Venue[],
  mode: VenueSortMode,
  randomRanks: Map<string, number>,
  userCoords: Coordinates | null,
) => {
  const randomRank = (venue: Venue) => randomRanks.get(venue.id) ?? Number.MAX_SAFE_INTEGER;
  const randomTieBreak = (left: Venue, right: Venue) => randomRank(left) - randomRank(right);

  return [...venues].sort((left, right) => {
    if (mode === "rating") {
      return getRatingScore(right) - getRatingScore(left) || randomTieBreak(left, right);
    }
    if (mode === "popular") {
      return getPopularityScore(right) - getPopularityScore(left) || randomTieBreak(left, right);
    }
    if (mode === "distance" && userCoords) {
      return calculateDistance(userCoords, left) - calculateDistance(userCoords, right) || randomTieBreak(left, right);
    }
    if (mode === "newest") {
      return getCreatedAtTimestamp(right) - getCreatedAtTimestamp(left) || randomTieBreak(left, right);
    }
    return randomTieBreak(left, right);
  });
};
