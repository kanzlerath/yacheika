import { AnalyticsEvent } from "../types";

type AnalyticsEventType = AnalyticsEvent["eventType"];

interface LogAnalyticsEventInput {
  eventType: AnalyticsEventType;
  venueId?: string;
  metadata?: Record<string, unknown>;
  authToken?: string;
}

export const logAnalyticsEvent = async ({
  eventType,
  venueId,
  metadata,
  authToken,
}: LogAnalyticsEventInput) => {
  if (!authToken) return;

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
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
