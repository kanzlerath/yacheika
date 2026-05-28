/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TelegramUser {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface TelegramAuthSession {
  token: string;
  expiresAt: string;
  user: TelegramUser;
}

export type VenueStatus = 'draft' | 'published' | 'hidden' | 'archived';

export interface PremiumConfig {
  premiumActive: boolean;
  premiumTheme?: string; // 'crimson-glow' | 'emerald-vault' | 'violet-night' | 'amber-smoke'
  customColors?: {
    primary: string; // Background custom colors
    accent: string;  // Glow and button highlight
    glowColor: string;
  };
  heroImage?: string;
  moodBlock?: string; // Current mood or event overlay (e.g. "сегодня техно")
  featuredDrinks?: string[];
  ctaUrl?: string;
  ctaText?: string;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  category: string; // e.g., 'бар', 'коктейльный бар', 'рюмочная', etc.
  shortDescription: string;
  fullDescription: string;
  address: string;
  latitude: number;
  longitude: number;
  workingHours: string;
  contacts: {
    phone?: string;
    telegram?: string;
    instagram?: string;
    vk?: string;
    website?: string;
  };
  gallery: string[];
  tags: string[];
  status: VenueStatus;
  premiumConfig: PremiumConfig;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  notMyPlaceCount: number;
  vibeRatings: Record<string, number>;
}

export interface Reaction {
  id: string;
  userId: string;
  venueId: string;
  type: 'like' | 'not_my_place' | 'vibe_tag';
  vibeTag?: string; // Specifying the vibe label
  createdAt: string;
}

export interface VenueEvent {
  id: string;
  venueId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  coverImage?: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  cover: string;
  venueIds: string[];
  publishedAt: string;
}

export interface AnalyticsEvent {
  id: string;
  eventType: 'open_venue' | 'like' | 'reaction' | 'open_route' | 'click_phone' | 'click_social' | 'open_event';
  venueId?: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
