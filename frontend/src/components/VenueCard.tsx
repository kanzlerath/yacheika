/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  MapPin,
  Clock,
  Phone,
  Send,
  Instagram,
  Globe,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Venue, VenueEvent, Reaction, PremiumConfig } from "../types";
import { logAnalyticsEvent } from "../utils/analytics";
import { appEase, panelTransition, softTransition } from "../utils/motionPresets";
import { WEEKDAYS, formatTodaySchedule, normalizeSchedule } from "../utils/venueAdmin";

interface VenueCardProps {
  key?: string | number;
  venue: Venue;
  authToken?: string;
  userReactions: Reaction[];
  vEvents: VenueEvent[];
  onReact: (id: string, type: "like" | "not_my_place" | "vibe_tag", vibeTag?: string) => void;
  onClose?: () => void;
  onOpenRoute?: (venue: Venue) => void;
  onNavigateToCollection?: (tag: string) => void;
}

const VIBE_GROUPS = [
  { title: "Атмосфера", tags: ["уютно", "душевно", "романтично", "эстетично", "движ", "домашняя атмосфера", "для компании"] },
  { title: "Музыка", tags: ["DJ", "живая музыка", "рок", "электроника", "джаз", "хип-хоп", "техно", "хаус", "фоновая музыка", "караоке"] },
  { title: "Напитки", tags: ["настойки", "авторские коктейли", "крафтовое пиво", "вино", "виски", "шоты", "сидр", "безалкогольные коктейли"] },
  { title: "Еда", tags: ["полноценная кухня", "закуски", "бургеры", "пицца", "стейки", "морепродукты", "азиатская кухня", "поздняя кухня", "завтраки"] },
  { title: "Формат", tags: ["свидание", "компания", "после работы", "день рождения", "корпоратив", "девичник", "мальчишник", "предпати", "афтерпати", "один за баром"] },
  { title: "Развлечения", tags: ["танцы", "караоке", "спорт-трансляции", "настольные игры", "квизы", "стендап", "открытый микрофон"] },
  { title: "Локация", tags: ["центр", "академгородок", "левый берег", "правый берег", "у метро", "вид на город", "у воды"] },
  { title: "Особенности", tags: ["летник", "панорамные окна", "танцпол", "сцена", "ВИП-зона", "можно с животными", "можно с ноутбуком", "бронирование", "фейс-контроль"] },
  { title: "Цены", tags: ["недорого", "средний чек", "премиум"] },
];

export default function VenueCard({
  venue,
  authToken,
  userReactions,
  vEvents,
  onReact,
  onClose,
  onOpenRoute,
}: VenueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "events" | "vibes">("info");
  const [showVibeCreator, setShowVibeCreator] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filter user's reactions
  const hasLiked = userReactions.some(r => r.venueId === venue.id && r.type === "like");
  const hasNotMyPlace = userReactions.some(r => r.venueId === venue.id && r.type === "not_my_place");
  const likedVibeTags = userReactions
    .filter(r => r.venueId === venue.id && r.type === "vibe_tag" && r.vibeTag)
    .map(r => r.vibeTag!);

  const premium: PremiumConfig = venue.premiumConfig || { premiumActive: false };
  const isPremiumActive = premium.premiumActive;

  // Custom colors from Premium settings if active
  const customColors = isPremiumActive && premium.customColors ? premium.customColors : null;
  const accentColor = customColors?.accent || "#d2a56b";
  const glowColor = customColors?.glowColor || accentColor;
  const tagColor = customColors?.tagColor || accentColor;
  const moodEmoji = premium.moodEmoji || "✨";
  const compactHeight = "calc(226px + env(safe-area-inset-bottom, 0px))";
  const schedule = venue.workingHoursSchedule ? normalizeSchedule(venue.workingHoursSchedule) : null;
  const galleryImages = venue.gallery.filter(Boolean);
  const lightboxImages = isPremiumActive && premium.heroImage ? [premium.heroImage, ...galleryImages] : galleryImages;
  const logoImage = venue.logoUrl || galleryImages[0] || "/logo.png";
  const topItems = premium.topItems || premium.featuredDrinks || [];

  // Reputation metrics
  const totalFeedback = venue.likesCount + venue.notMyPlaceCount;
  const likesRatio = totalFeedback > 0 ? Math.round((venue.likesCount / totalFeedback) * 100) : null;
  const tabOrder = ["info", "vibes", "events"] as const;
  const activeTabIndex = tabOrder.indexOf(activeTab);
  const setVenueTab = (tab: "info" | "events" | "vibes") => {
    setActiveTab(tab);
  };

  const handleRouteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenRoute) onOpenRoute(venue);

    logAnalyticsEvent({
      eventType: "open_route",
      venueId: venue.id,
      metadata: { address: venue.address },
      authToken,
    });

    const mapUrl = `https://yandex.ru/maps/?text=Новосибирск, ${encodeURIComponent(venue.address)} ${encodeURIComponent(venue.name)}`;
    window.open(mapUrl, "_blank");
  };

  const handleSocialClick = (platform: string, label?: string) => {
    logAnalyticsEvent({
      eventType: platform === "phone" ? "click_phone" : "click_social",
      venueId: venue.id,
      metadata: { platform, label },
      authToken,
    });
  };

  const handleEventsTabClick = () => {
    setVenueTab("events");

    if (vEvents.length > 0) {
      logAnalyticsEvent({
        eventType: "open_event",
        venueId: venue.id,
        metadata: {
          action: "open_events_tab",
          eventCount: vEvents.length,
          eventIds: vEvents.map((event) => event.id),
        },
        authToken,
      });
    }
  };

  const handleEventOpen = (event: VenueEvent) => {
    logAnalyticsEvent({
      eventType: "open_event",
      venueId: venue.id,
      metadata: {
        action: "open_event_card",
        eventId: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
      },
      authToken,
    });
  };

  // Drag handler for Framer Motion to enable smooth native Swipes / Gestures
  const handleDragEnd = (_event: any, info: any) => {
    const swipedY = info.offset.y;
    const velocityY = info.velocity.y;

    if (swipedY < -60 || velocityY < -300) {
      // Swipe UP -> expand
      setIsExpanded(true);
    } else if (swipedY > 60 || velocityY > 300) {
      // Swipe DOWN -> collapse or close
      if (isExpanded) {
        setIsExpanded(false);
      } else {
        if (onClose) onClose();
      }
    }
  };

  return (
    <>
    <motion.div
      drag={isExpanded ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.6 }}
      onDragEnd={handleDragEnd}
      initial={{ y: "100%", opacity: 0.96 }}
      animate={{ 
        x: 0,
        y: 0,
        opacity: 1,
        height: compactHeight
      }}
      exit={{ y: "100%", opacity: 0.96 }}
      transition={panelTransition}
      className={`absolute text-neutral-200 shadow-2xl backdrop-blur-2xl overflow-hidden bottom-0 inset-x-0 w-full md:max-w-xl md:mx-auto md:bottom-2 md:rounded-2xl border z-30 ${
        isPremiumActive ? "venue-card-premium" : ""
      }`}
      style={{
        background: "linear-gradient(to bottom, var(--app-panel), var(--app-bg))",
        borderColor: isPremiumActive ? `color-mix(in srgb, ${accentColor} 38%, var(--app-border))` : "var(--app-border)",
        boxShadow: "var(--app-shadow)",
        ["--venue-accent" as any]: accentColor,
        ["--venue-glow" as any]: glowColor,
        ["--venue-tag" as any]: tagColor,
      }}
      id={`venue-card-${venue.id}`}
    >
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className="w-full flex flex-col items-center pt-3 pb-2 cursor-pointer select-none active:bg-neutral-900/10"
        >
          <div className="w-12 h-1 bg-neutral-800 rounded-full hover:bg-neutral-600 transition duration-200" />
        </div>
      )}

      {/* Main Contents Wrapper */}
      <div 
        className={`flex flex-col h-full ${
          "overflow-hidden"
        }`}
        style={{ paddingBottom: 0 }}
      >
        <AnimatePresence initial={false}>
          {(
            /* ==================== PEEK COMPACT PREVIEW (MORE AIR, NATIVE, CLASSY) ==================== */
            <div
              className="px-5 space-y-4 text-left"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <div className="flex items-start gap-4 justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Classiest image thumbnail rounded */}
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 overflow-hidden shrink-0 border border-neutral-800/60 shadow">
                    <img
                      src={logoImage}
                      alt={venue.name}
                      className="w-full h-full object-cover filter brightness-[0.95]"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = "/logo.png";
                      }}
                    />
                  </div>

                  {/* Core Meta */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                        {venue.category}
                      </span>
                    </div>
                    
                    <h2 className="text-xl font-display font-bold text-white tracking-tight leading-tight truncate">
                      {venue.name}
                    </h2>
                    
                    <p className="text-[13.5px] text-neutral-400 leading-snug line-clamp-2">
                      {venue.shortDescription}
                    </p>
                  </div>
                </div>

                {/* Close Button / Simple Native Circle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onClose) onClose();
                  }}
                  className="venue-close-button flex items-center justify-center text-2xl leading-none transition shrink-0"
                  aria-label="Закрыть карточку"
                >
                  ×
                </button>
              </div>

              {/* Status details line */}
              <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono border-t border-neutral-900/70 pt-2.5">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span className="text-neutral-200 font-semibold">
                    {likesRatio === null ? "оценок пока нет" : `${likesRatio}% одобрения`}
                  </span>
                </div>
                <div className="w-1 h-1 bg-neutral-800 rounded-full" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{formatTodaySchedule(schedule || undefined, venue.workingHours)}</span>
                </div>
              </div>

              {/* Airy & Native Primary Buttons strip */}
              <div className="flex gap-2.5 pt-1.5">
                <button
                  onClick={handleRouteClick}
                  className="app-text-button flex-1"
                >
                  Проложить маршрут
                </button>

                <button
                  onClick={() => setIsExpanded(true)}
                  className="app-icon-button w-12"
                  title="Подробнее"
                  aria-label="Подробнее"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>

    <AnimatePresence>
      {isExpanded && (
            /* ==================== EXPANDED PANEL (CLEATER, LESS BOXED GRIDS, SPACIOUS) ==================== */
            <motion.div
              key="venue-fullscreen"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={panelTransition}
              className="fixed inset-0 z-[80] overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1rem)] space-y-6 text-left text-neutral-200 shadow-2xl"
              style={{
                paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
                background: "var(--app-bg)",
                ["--venue-accent" as any]: accentColor,
                ["--venue-glow" as any]: glowColor,
                ["--venue-tag" as any]: tagColor,
              }}
            >
              {/* Simplified airy title and header bar */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-neutral-800/70 bg-neutral-950">
                    <img
                      src={logoImage}
                      alt={venue.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = "/logo.png";
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#a1a1aa]">{venue.category}</span>
                  </div>
                  <h1 className="text-[27px] font-display font-extrabold text-white tracking-tight leading-none mb-1.5">
                    {venue.name}
                  </h1>
                  <p className="text-sm text-neutral-400 font-sans leading-relaxed max-w-sm">{venue.shortDescription}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="venue-close-button flex items-center justify-center text-2xl leading-none transition"
                  aria-label="Свернуть карточку"
                >
                  ×
                </button>
              </div>

              {isPremiumActive && premium.heroImage && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(0)}
                  className="relative h-48 sm:h-56 w-full rounded-2xl overflow-hidden group border border-neutral-900/60 shadow-xl bg-neutral-950"
                >
                  <img
                    src={premium.heroImage}
                    alt={venue.name}
                    className="w-full h-full object-cover filter brightness-[0.85]"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = "/logo.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                </button>
              )}

              {isPremiumActive && premium.ctaUrl && (
                <a
                  href={premium.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="premium-cta app-text-button w-full"
                  onClick={() => handleSocialClick("premium_cta", premium.ctaText || "Подробнее")}
                >
                  {premium.ctaText || "Подробнее"}
                </a>
              )}

              {/* Premium Mood Daily Quote overlay if present */}
              {isPremiumActive && premium.moodBlock && (
                <div className="premium-mood-panel p-4 py-4.5 flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950/70 text-2xl">
                    {moodEmoji}
                  </div>
                  <div>
                    <p className="text-[15px] text-neutral-200 leading-relaxed italic">«{premium.moodBlock}»</p>
                  </div>
                </div>
              )}

              {/* Classy primary voting buttons */}
              <div className="grid grid-cols-2 gap-3" id="reactions-controls-expanded">
                <button
                  onClick={() => onReact(venue.id, "like")}
                  className={`app-text-button ${
                    hasLiked
                      ? "app-text-button-active"
                      : ""
                  }`}
                >
                  <span>Рекомендую ({venue.likesCount})</span>
                </button>

                <button
                  onClick={() => onReact(venue.id, "not_my_place")}
                  className={`app-text-button ${
                    hasNotMyPlace
                      ? "app-text-button-muted-active"
                      : ""
                  }`}
                >
                  <span>Не моё место ({venue.notMyPlaceCount})</span>
                </button>
              </div>

              {/* Modern Segmented Tab Controls */}
              <div className="venue-tabs text-sm">
                <button
                  onClick={() => setVenueTab("info")}
                  className={`venue-tab font-display transition cursor-pointer ${
                    activeTab === "info" ? "venue-tab-active" : ""
                  }`}
                >
                  О заведении
                  {activeTab === "info" && (
                    <motion.div
                      layoutId="activeTabSurface"
                      transition={softTransition}
                      className="absolute inset-0 rounded-[10px] -z-10"
                    />
                  )}
                </button>
                <button
                  onClick={() => setVenueTab("vibes")}
                  className={`venue-tab font-display transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "vibes" ? "venue-tab-active" : ""
                  }`}
                >
                  Атмосфера
                  <span className="text-[10px] w-4.5 h-4.5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 font-mono">
                    {Object.keys(venue.vibeRatings || {}).length}
                  </span>
                  {activeTab === "vibes" && (
                    <motion.div
                      layoutId="activeTabSurface"
                      transition={softTransition}
                      className="absolute inset-0 rounded-[10px] -z-10"
                    />
                  )}
                </button>
                <button
                  onClick={handleEventsTabClick}
                  className={`venue-tab font-display transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "events" ? "venue-tab-active" : ""
                  }`}
                >
                  События
                  {vEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                  {activeTab === "events" && (
                    <motion.div
                      layoutId="activeTabSurface"
                      transition={softTransition}
                      className="absolute inset-0 rounded-[10px] -z-10"
                    />
                  )}
                </button>
              </div>

              {/* Tab Workspace Panel */}
              <div className="overflow-hidden pb-6">
                <motion.div
                  className="flex items-start"
                  animate={{ x: `${-activeTabIndex * 100}%` }}
                  transition={{ duration: 0.3, ease: appEase }}
                >
                    <div className="min-w-full space-y-6 text-[15px]">
                      {/* Gorgeous airy Typography */}
                      <p className="leading-relaxed text-neutral-300 font-sans whitespace-pre-line">
                        {venue.fullDescription || venue.shortDescription}
                      </p>

                      {/* Clean minimalist borderless tag pill layout */}
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-900/40">
                        {venue.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`px-3.5 py-1.5 text-xs font-mono rounded-lg select-none ${
                              isPremiumActive ? "premium-tag-pill" : "bg-neutral-900/60 text-neutral-400 border border-neutral-900"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Atmosphere Horizontal Scroll Gallery */}
                      <div className="space-y-3 pt-2">
                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none snap-x">
                          {galleryImages.map((photoUrl, index) => (
                            <button
                              key={photoUrl}
                              type="button"
                              onClick={() => setLightboxIndex((isPremiumActive && premium.heroImage ? 1 : 0) + index)}
                              className="w-60 h-36 rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-900/50 shadow shrink-0 snap-start"
                            >
                              <img
                                src={photoUrl}
                                alt="Атмосфера"
                                className="w-full h-full object-cover select-none filter brightness-95"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.src = "/logo.png";
                                }}
                              />
                            </button>
                          ))}
                          {galleryImages.length === 0 && (
                            <div className="border border-dashed border-neutral-900 w-60 h-36 rounded-2xl flex items-center justify-center text-center p-5 text-neutral-500 text-xs shrink-0 bg-neutral-900/10 font-mono">
                              Дополнительные кадры пока не добавлены
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Curated featured suggestions */}
                      {isPremiumActive && topItems.length > 0 && (
                        <div className="recommended-panel p-5 space-y-4">
                          <div>
                            <span className="text-xs font-display font-bold uppercase tracking-[0.1em] text-white">Рекомендуем</span>
                          </div>
                          
                          <div className="space-y-2.5 text-sm">
                            {topItems.map((drink, i) => (
                              <div key={i} className="flex items-start gap-3 leading-relaxed">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-505 shrink-0" />
                                <span className="font-semibold text-neutral-300">{drink}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clean classy contact coordinates */}
                      <div className="grid sm:grid-cols-2 gap-6 border-t border-neutral-900 pt-5 text-[13px] font-mono venue-info-grid">
                        <div className="space-y-4">
                          <div className="venue-info-row">
                            <Clock className="w-4 h-4 text-neutral-500 shrink-0" />
                            <div className="venue-info-content">
                              <div className="text-[9px] text-[#8e8e93] uppercase tracking-wider mb-0.5">ВРЕМЯ РАБОТЫ</div>
                              {schedule ? (
                                <div className="space-y-1 font-sans text-neutral-200">
                                  {WEEKDAYS.map((day) => {
                                    const intervals = schedule[day.key] || [];
                                    return (
                                      <div key={day.key} className="venue-schedule-row">
                                        <span className="text-neutral-500">{day.short}</span>
                                        <span>{intervals.length ? intervals.map((slot) => `${slot.from}-${slot.to}`).join(", ") : "выходной"}</span>
                                      </div>
                                    );
                                  })}
                                  {schedule.note && <div className="pt-1 text-[11px] text-neutral-500">{schedule.note}</div>}
                                </div>
                              ) : (
                                <span className="text-neutral-200 font-sans">{venue.workingHours}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="venue-info-row">
                            <Phone className="w-4 h-4 text-neutral-500 shrink-0" />
                            <div className="venue-info-content">
                              <div className="text-[9px] text-[#8e8e93] uppercase tracking-wider mb-0.5">КОНТАКТЫ</div>
                              {venue.contacts.phone ? (
                                <a
                                  href={`tel:${venue.contacts.phone}`}
                                  className="text-neutral-200 hover:text-white underline decoration-white/20 transition font-sans"
                                  onClick={() => handleSocialClick("phone", venue.contacts.phone)}
                                >
                                  {venue.contacts.phone}
                                </a>
                              ) : (
                                <span className="text-neutral-500 font-sans">Только онлайн-заказ</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 text-[13px] font-mono">
                          <div className="venue-info-row">
                            <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
                            <div className="venue-info-content">
                              <div className="text-[9px] text-[#8e8e93] uppercase tracking-wider mb-0.5">АДРЕС</div>
                              <span className="text-neutral-200 font-sans">{venue.address}</span>
                            </div>
                          </div>

                          <button
                            onClick={handleRouteClick}
                            className="app-text-button w-full"
                          >
                            Найти на Яндекс Картах
                          </button>
                        </div>
                      </div>

                      {/* External Classy links row */}
                      <div className="flex items-center gap-2 border-t border-neutral-900 pt-4">
                          {venue.contacts.telegram && (
                            <a
                              href={`https://t.me/${venue.contacts.telegram}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center bg-neutral-900 hover:bg-neutral-850 border border-neutral-800/60 rounded-xl transition"
                              onClick={() => handleSocialClick("telegram", venue.contacts.telegram)}
                            >
                              <Send className="w-4 h-4 text-[#38bdf8] fill-[#38bdf8]/10" />
                            </a>
                          )}
                          {venue.contacts.instagram && (
                            <a
                              href={`https://instagram.com/${venue.contacts.instagram}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center bg-neutral-900 hover:bg-neutral-850 border border-neutral-800/60 rounded-xl transition"
                              onClick={() => handleSocialClick("instagram", venue.contacts.instagram)}
                            >
                              <Instagram className="w-4 h-4 text-[#fb7185]" />
                            </a>
                          )}
                          {venue.contacts.website && (
                            <a
                              href={venue.contacts.website}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center bg-neutral-900 hover:bg-neutral-850 border border-neutral-800/60 rounded-xl transition"
                              onClick={() => handleSocialClick("website", venue.contacts.website)}
                            >
                              <Globe className="w-4 h-4 text-[#818cf8]" />
                            </a>
                          )}
                      </div>
                    </div>

                    <div className="min-w-full space-y-4">
                      <p className="text-sm text-[#8e8e93] leading-relaxed pt-1">
                        Оценки гостей помогают понять настроение места. Нажмите на тег, чтобы поддержать его.
                      </p>

                      <div className="space-y-4 pt-1">
                        {Object.keys(venue.vibeRatings || {}).length === 0 ? (
                          <div className="text-center py-10 text-sm text-neutral-500 border border-dashed border-neutral-900 rounded-2xl">
                            Рейтинг тегов пуст. Станьте первым!
                          </div>
                        ) : (
                          <div className="space-y-3 pt-1">
                            {Object.entries(venue.vibeRatings)
                              .sort((a, b) => b[1] - a[1])
                              .map(([tag, votes]) => {
                                const userLikedThisVibe = likedVibeTags.includes(tag);
                                const totalVotes = Object.values(venue.vibeRatings).reduce((sum, v) => sum + v, 0);
                                const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                                
                                const activeColor = isPremiumActive ? accentColor : "#e11d48";

                                return (
                                  <button
                                    key={tag}
                                    onClick={() => {
                                      onReact(venue.id, "vibe_tag", tag);
                                    }}
                                    className="w-full text-left py-2 px-1 relative transition duration-200 group cursor-pointer block"
                                  >
                                    <div className="flex justify-between items-center text-sm text-neutral-300 font-display relative z-10">
                                      <span className={`font-medium flex items-center gap-2 ${userLikedThisVibe ? "text-white font-semibold" : "text-neutral-300 group-hover:text-white"}`}>
                                        {userLikedThisVibe ? (
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
                                        ) : (
                                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 group-hover:bg-neutral-600 transition" />
                                        )}
                                        {tag}
                                      </span>
                                      <span className="font-mono text-xs text-[#8e8e93] group-hover:text-neutral-300 transition">
                                        {votes} {votes === 1 ? "голос" : votes < 5 ? "года" : "голосов"}
                                      </span>
                                    </div>
                                    
                                    <div className="w-full h-1 bg-neutral-900 rounded-full mt-2 overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ 
                                          width: `${percentage}%`,
                                          backgroundColor: userLikedThisVibe ? activeColor : "#444"
                                        }}
                                      />
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      <div className="pt-3">
                        <button
                          onClick={() => setShowVibeCreator(!showVibeCreator)}
                          className="app-icon-button w-full min-h-11"
                          aria-label="Выразить свою атмосферу"
                          title="Выразить свою атмосферу"
                        >
                          <Plus className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                          {showVibeCreator && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, y: -6 }}
                              animate={{ opacity: 1, height: "auto", y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -6 }}
                              transition={{ duration: 0.22, ease: appEase }}
                              className="venue-soft-panel mt-3.5 p-4.5 space-y-5"
                            >
                              {VIBE_GROUPS.map((group) => (
                                <div key={group.title} className="space-y-2.5">
                                  <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest leading-none">{group.title}</div>
                                  <div className="flex flex-wrap gap-2">
                                {group.tags.map((vibe) => {
                                  const isVoted = likedVibeTags.includes(vibe);
                                  return (
                                    <button
                                      key={vibe}
                                      onClick={() => {
                                        onReact(venue.id, "vibe_tag", vibe);
                                      }}
                                      className={`text-xs px-3.5 py-1.5 rounded-full border font-display transition duration-200 cursor-pointer ${
                                        isVoted
                                          ? "bg-rose-950/20 text-rose-400 border-rose-900"
                                          : "bg-neutral-900 text-neutral-400 border-neutral-800/70 hover:border-neutral-700"
                                      }`}
                                    >
                                      {vibe}
                                    </button>
                                  );
                                })}
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="min-w-full space-y-3.5">
                      {vEvents.length === 0 ? (
                        <div className="text-center py-10 text-sm text-neutral-500 border border-dashed border-neutral-900 rounded-2xl">
                          На сегодня событий в регламенте нет. Загляните позже!
                        </div>
                      ) : (
                        <div className="space-y-4 pt-1">
                          {vEvents.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => handleEventOpen(ev)}
                              className="venue-soft-panel w-full overflow-hidden flex flex-col sm:flex-row gap-4 p-4.5 transition duration-200 cursor-pointer"
                            >
                              {ev.coverImage && (
                                <div className="w-full sm:w-36 shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                                  <img
                                    src={ev.coverImage}
                                    alt={ev.title}
                                    className="w-full h-auto object-contain"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="space-y-2 text-left">
                                <div className="flex flex-wrap items-center gap-1 text-xs font-mono text-violet-400 uppercase tracking-widest">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    {ev.date === new Date().toISOString().split("T")[0]
                                      ? "Сегодня"
                                      : new Date(ev.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}, {ev.time}
                                  </span>
                                </div>
                                
                                <h4 className="text-base font-display font-medium text-white leading-snug">{ev.title}</h4>
                                <p className="text-sm text-[#8e8e93] leading-relaxed">{ev.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                </motion.div>
              </div>
            </motion.div>
      )}
    </AnimatePresence>

      <AnimatePresence>
        {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setLightboxIndex(null);
              }}
              className="venue-close-button absolute right-4 top-4 text-3xl"
              aria-label="Закрыть галерею"
            >
              ×
            </button>
            {lightboxImages.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length);
                }}
                className="app-icon-button absolute left-4 top-1/2 h-11 w-11 -translate-y-1/2"
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <img
              src={lightboxImages[lightboxIndex]}
              alt=""
              className="max-h-[86dvh] max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
            {lightboxImages.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % lightboxImages.length);
                }}
                className="app-icon-button absolute right-4 top-1/2 h-11 w-11 -translate-y-1/2"
                aria-label="Следующее фото"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
