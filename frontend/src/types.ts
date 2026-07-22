/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TelegramUser {
  id: string;
  provider?: 'telegram' | 'yandex';
  providerUserId?: string;
  telegramId?: string | null;
  username: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  email?: string;
  preferences?: {
    clusterMaxZoom?: number;
    appTheme?: MapStyle;
  };
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
    ctaTextColor?: string;
    vibeTextColor?: string;
    vibeBackgroundColor?: string;
    vibeBorderColor?: string;
    vibeGlowColor?: string;
    recommendationBorderColor?: string;
  };
  ctaAnimation?: 'none' | 'breathe' | 'shimmer' | 'nudge';
  vibeGlowEnabled?: boolean;
  vibeGlowIntensity?: number;
  heroImage?: string;
  moodBlock?: string; // Current mood or event overlay (e.g. "сегодня техно")
  moodEmoji?: string;
  featuredDrinks?: PremiumRecommendation[];
  topItems?: PremiumRecommendation[];
  ctaUrl?: string;
  ctaText?: string;
}

export type PremiumRecommendation = string | {
  text: string;
  emoji: string;
};

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
    vk?: string;
    website?: string;
  };
  gallery: string[];
  galleryThumbnails?: Record<string, string>;
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

export interface EventAttendance {
  id: string;
  userId: string;
  eventId: string;
  venueId: string;
  status: 'going' | 'not_going';
  createdAt: string;
  updatedAt: string;
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

export interface AdminUserDetail {
  user: TelegramUser;
  totals: {
    actions: number;
    reactions: number;
    opens: number;
    routes: number;
    phoneClicks: number;
    socialClicks: number;
    eventOpens: number;
    likes: number;
    notMyPlace: number;
    vibeTags: number;
    eventsGoing: number;
    eventsNotGoing: number;
    activeDays30d: number;
    activeDays7d: number;
  };
  retention: {
    createdAt: string;
    lastSeenAt: string | null;
    daysSinceSignup: number;
    daysSinceLastSeen: number | null;
  };
  daily: Array<{
    date: string;
    actions: number;
    reactions: number;
  }>;
  recentAnalytics: Array<AnalyticsEvent & {
    venue?: { id: string; name: string; category?: string; status?: string } | null;
  }>;
  recentReactions: Array<Reaction & {
    venue?: { id: string; name: string; category?: string; status?: string } | null;
  }>;
  recentAttendance: Array<{
    id: string;
    eventId: string;
    venueId: string;
    status: 'going' | 'not_going';
    updatedAt: string;
    event?: { id: string; title: string; date: string; time: string } | null;
    venue?: { id: string; name: string } | null;
  }>;
}

export interface VenueAudit {
  venueId: string;
  generatedAt: string;
  totals: {
    views: number;
    routes: number;
    phoneClicks: number;
    socialClicks: number;
    eventOpens: number;
    actions: number;
    likes: number;
    notMyPlace: number;
    vibeTags: number;
    eventsGoing: number;
    eventsNotGoing: number;
    uniqueUsers: number;
    conversionRate: number;
  };
  periods: {
    last7d: VenueAuditPeriod;
    last30d: VenueAuditPeriod;
  };
  daily: Array<{
    date: string;
    views: number;
    routes: number;
    phoneClicks: number;
    socialClicks: number;
    eventOpens: number;
    likes: number;
    notMyPlace: number;
    vibeTags: number;
  }>;
  reactions: {
    likes: number;
    notMyPlace: number;
    vibeTotal: number;
    vibeTags: Array<{ tag: string; count: number }>;
  };
  recentAnalytics: AnalyticsEvent[];
  recentReactions: Reaction[];
  recentAttendance: Array<{
    id: string;
    status: 'going' | 'not_going';
    updatedAt: string;
    event?: { id: string; title: string; date: string; time: string } | null;
    user?: { id: string; username: string; firstName: string } | null;
  }>;
  upcomingEvents: VenueEvent[];
  quality: {
    score: number;
    checks: Array<{
      id: string;
      label: string;
      ok: boolean;
      severity: 'critical' | 'warning' | 'info';
      detail: string;
    }>;
  };
}

export interface VenueAuditPeriod {
  views: number;
  routes: number;
  phoneClicks: number;
  socialClicks: number;
  eventOpens: number;
  actions: number;
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

export interface UserFeedback {
  id: string;
  kind: 'idea' | 'bug' | 'other';
  message: string;
  contact?: string;
  userId: string;
  userName?: string;
  status: 'new' | 'reviewed' | 'closed';
  createdAt: string;
  updatedAt: string;
}
