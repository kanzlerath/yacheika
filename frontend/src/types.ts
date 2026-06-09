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
  expiresAt: string;
  user: TelegramUser;
}

export type VenueStatus = 'draft' | 'published' | 'hidden' | 'archived';
export type MapStyle = 'dark' | 'light';

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface WorkingHoursInterval {
  from: string;
  to: string;
}

export type WorkingHoursSchedule = Record<WeekdayKey, WorkingHoursInterval[]> & {
  note?: string;
};

export interface PremiumConfig {
  premiumActive: boolean;
  premiumTheme?: string;
  customColors?: {
    primary: string;
    accent: string;
    glowColor: string;
    tagColor?: string;
    ctaColor?: string;
  };
  heroImage?: string;
  moodBlock?: string; // Current mood or event overlay (e.g. "сегодня техно")
  moodEmoji?: string;
  featuredDrinks?: string[];
  topItems?: string[];
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
  workingHoursSchedule?: WorkingHoursSchedule;
  logoUrl?: string;
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

export interface AdminDashboard {
  totals: {
    users: number;
    newUsers7d: number;
    newUsers30d: number;
    venues: number;
    publishedVenues: number;
    draftVenues: number;
    hiddenVenues: number;
    events: number;
    reactions: number;
    analytics24h: number;
    analytics7d: number;
  };
  topVenues: Array<{
    venueId: string;
    name: string;
    opens: number;
    routes: number;
    socials: number;
    total: number;
  }>;
  recentActivity: AnalyticsEvent[];
  recentUsers: AdminTelegramUser[];
  upcomingEvents: VenueEvent[];
  incompleteVenues: Array<{
    id: string;
    name: string;
    status: VenueStatus;
    issues: string[];
  }>;
}

export interface AdminTelegramUser extends TelegramUser {
  reactionsCount: number;
}

export interface VenueSuggestion {
  id: string;
  name: string;
  address: string;
  comment?: string;
  contact?: string;
  userId?: string;
  userName?: string;
  status: 'new' | 'reviewed' | 'rejected' | 'converted';
  createdAt: string;
  updatedAt: string;
}
