import { AnalyticsEvent } from "../types";

type AnalyticsEventType = AnalyticsEvent["eventType"];

interface LogAnalyticsEventInput {
  eventType: AnalyticsEventType;
  venueId?: string;
  metadata?: Record<string, unknown>;
  enabled?: boolean;
}

export const logAnalyticsEvent = async ({
  eventType,
  venueId,
  metadata,
  enabled = true,
}: LogAnalyticsEventInput) => {
  if (!enabled) return;

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        venueId,
        metadata,
      }),
    });
  } catch (error) {
    console.warn("Analytics event was not recorded:", error);
  }
};
