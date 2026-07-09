import { PremiumRecommendation } from "../types";

export type NormalizedPremiumRecommendation = {
  text: string;
  emoji: string;
};

export const normalizePremiumRecommendation = (
  item: PremiumRecommendation,
): NormalizedPremiumRecommendation => {
  if (typeof item === "string") {
    return { text: item, emoji: "✨" };
  }

  return {
    text: item.text || "",
    emoji: item.emoji || "✨",
  };
};

export const normalizePremiumRecommendations = (
  items: PremiumRecommendation[] = [],
) => items.map(normalizePremiumRecommendation).filter((item) => item.text.trim());
