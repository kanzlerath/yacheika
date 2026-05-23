import { AnalyticsEvent } from "../types";

type AnalyticsEventType = AnalyticsEvent["eventType"];

interface LogAnalyticsEventInput {
  eventType: AnalyticsEventType;
  venueId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export const logAnalyticsEvent = async ({
  eventType,
  venueId,
  userId,
  metadata,
}: LogAnalyticsEventInput) => {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        venueId,
        userId,
        metadata,
      }),
    });
  } catch (error) {
    console.warn("Analytics event was not recorded:", error);
  }
};
