/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Frown,
  MapPin,
  Clock,
  Phone,
  Check,
  Send,
  Instagram,
  Globe,
  Plus,
  Sparkles,
  Calendar,
  Share2,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Venue, VenueEvent, Reaction, PremiumConfig } from "../types";
import { logAnalyticsEvent } from "../utils/analytics";

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

const AVAILABLE_VIBES = [
  "Душевно",
  "Громкий бит",
  "Свечи и полумрак",
  "Летний дворик",
  "Много воздуха",
  "Качественное пиво",
  "Виниловые сеты"
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
  const [copiedSlug, setCopiedSlug] = useState(false);

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
  const accentColor = customColors?.accent || "#e11d48"; // Default rose
  const compactHeight = "calc(256px + env(safe-area-inset-bottom, 0px))";
  const expandedHeight = "min(84dvh, calc(100dvh - 5rem - env(safe-area-inset-top, 0px)))";

  // Reputation metrics
  const totalFeedback = venue.likesCount + venue.notMyPlaceCount;
  const likesRatio = totalFeedback > 0 ? Math.round((venue.likesCount / totalFeedback) * 100) : 100;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#venue=${venue.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);

    logAnalyticsEvent({
      eventType: "click_social",
      venueId: venue.id,
      metadata: { platform: "share", slug: venue.slug },
      authToken,
    });
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
    setActiveTab("events");

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
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.6 }}
      onDragEnd={handleDragEnd}
      initial={{ y: "100%" }}
      animate={{ 
        y: 0,
        height: isExpanded 
          ? expandedHeight
          : compactHeight
      }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="absolute bottom-0 inset-x-0 w-full md:max-w-xl md:mx-auto md:bottom-2 md:rounded-3xl border border-neutral-800/80 text-neutral-200 z-30 shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-300"
      style={{
        background: isPremiumActive 
          ? "linear-gradient(to bottom, #09090b, #020202)" 
          : "linear-gradient(to bottom, #08080a, #010101)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)"
      }}
      id={`venue-card-${venue.id}`}
    >
      {/* Native Drag Handle Trigger Area */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex flex-col items-center pt-3 pb-2 cursor-pointer select-none active:bg-neutral-900/10"
      >
        <div className="w-12 h-1 bg-neutral-800 rounded-full hover:bg-neutral-600 transition duration-200" />
      </div>

      {/* Main Contents Wrapper */}
      <div 
        className={`flex flex-col h-full ${
          isExpanded ? "overflow-y-auto" : "overflow-hidden"
        }`}
        style={{ paddingBottom: isExpanded ? "env(safe-area-inset-bottom, 0px)" : 0 }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* ==================== PEEK COMPACT PREVIEW (MORE AIR, NATIVE, CLASSY) ==================== */
            <motion.div
              key="peek"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-5 space-y-4 text-left"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <div className="flex items-start gap-4 justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Classiest image thumbnail rounded */}
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 overflow-hidden shrink-0 border border-neutral-800/60 shadow">
                    <img
                      src={venue.gallery[0]}
                      alt={venue.name}
                      className="w-full h-full object-cover filter brightness-[0.9]"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Core Meta */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400">
                        {venue.category}
                      </span>
                      {vEvents.length > 0 && (
                        <span className="text-[8px] font-mono font-medium tracking-wide text-violet-400 bg-violet-950/15 border border-violet-900/25 px-1.5 py-0.2 rounded" title="Событие сегодня">
                          Событие сегодня
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-lg font-display font-bold text-white tracking-tight leading-tight truncate">
                      {venue.name}
                    </h2>
                    
                    <p className="text-xs text-neutral-400 truncate leading-snug">
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
                  className="w-7 h-7 bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800/80 rounded-full flex items-center justify-center text-[10px] text-neutral-400 hover:text-white transition shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Status details line */}
              <div className="flex items-center gap-4 text-[11px] text-neutral-400 font-mono border-t border-neutral-900/70 pt-2.5">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                  <span className="text-neutral-200 font-semibold">{likesRatio}% одобрения</span>
                </div>
                <div className="w-1 h-1 bg-neutral-800 rounded-full" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{venue.workingHours}</span>
                </div>
              </div>

              {/* Airy & Native Primary Buttons strip */}
              <div className="flex gap-2.5 pt-1.5">
                <button
                  onClick={() => onReact(venue.id, "like")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-display text-xs font-semibold transition duration-200 cursor-pointer ${
                    hasLiked
                      ? "bg-rose-950/10 text-rose-300 border-rose-900/80"
                      : "bg-neutral-950/40 border-neutral-900 hover:border-neutral-800 text-neutral-300"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${hasLiked ? "fill-rose-500 text-rose-500" : "text-neutral-500"}`} />
                  <span>Хочу пойти</span>
                </button>

                <button
                  onClick={handleRouteClick}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-neutral-950/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 rounded-2xl text-xs font-semibold text-neutral-300 transition duration-200 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-neutral-500" />
                  <span>Проложить маршрут</span>
                </button>

                <button
                  onClick={() => setIsExpanded(true)}
                  className="w-12 flex items-center justify-center bg-white hover:bg-neutral-100 text-black rounded-2xl shadow transition duration-200 cursor-pointer"
                  title="Подробнее"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* ==================== EXPANDED PANEL (CLEATER, LESS BOXED GRIDS, SPACIOUS) ==================== */
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-5 space-y-6 text-left"
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
            >
              {/* Simplified airy title and header bar */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-[#a1a1aa]">{venue.category}</span>
                  </div>
                  <h1 className="text-2xl font-display font-extrabold text-white tracking-tight leading-none mb-1.5">
                    {venue.name}
                  </h1>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed max-w-sm">{venue.shortDescription}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800/80 rounded-full transition text-neutral-400 hover:text-white"
                    title="Поделиться"
                  >
                    {copiedSlug ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="w-7 h-7 bg-neutral-900/80 border border-neutral-800 rounded-full flex items-center justify-center text-xs text-neutral-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Airy Beautiful Photo Cover Gallery */}
              <div className="relative h-48 sm:h-56 w-full rounded-3xl overflow-hidden group border border-neutral-900/60 shadow-xl bg-neutral-950">
                <img
                  src={venue.gallery[0]}
                  alt={venue.name}
                  className="w-full h-full object-cover filter brightness-[0.85]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                
                <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Атмосфера места</span>
                    <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>{likesRatio}% Одобрено гостями ({totalFeedback} оценок)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium Mood Daily Quote overlay if present */}
              {isPremiumActive && premium.moodBlock && (
                <div className="p-4 rounded-2xl border border-neutral-900/60 bg-neutral-950/20 py-4.5 flex items-start gap-4 animate-fadeIn">
                  <div className="p-1.5 rounded-xl bg-neutral-900 shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#a1a1aa]">Вайб дня сегодня:</div>
                    <p className="text-xs sm:text-sm text-neutral-200 mt-1 leading-relaxed italic">«{premium.moodBlock}»</p>
                  </div>
                </div>
              )}

              {/* Classy primary voting buttons */}
              <div className="grid grid-cols-2 gap-3" id="reactions-controls-expanded">
                <button
                  onClick={() => onReact(venue.id, "like")}
                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl border font-display text-xs font-semibold transition duration-200 cursor-pointer ${
                    hasLiked
                      ? "bg-rose-950/10 text-rose-300 border-rose-900"
                      : "bg-neutral-950/50 border-neutral-900 hover:border-neutral-800 text-neutral-300"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${hasLiked ? "fill-rose-500 text-rose-500" : "text-neutral-500"}`} />
                  <span>Рекомендую ({venue.likesCount})</span>
                </button>

                <button
                  onClick={() => onReact(venue.id, "not_my_place")}
                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl border font-display text-xs font-semibold transition duration-200 cursor-pointer ${
                    hasNotMyPlace
                      ? "bg-amber-950/10 text-amber-300 border-amber-900/60"
                      : "bg-neutral-950/50 border-neutral-900 hover:border-neutral-800 text-neutral-400"
                  }`}
                >
                  <Frown className={`w-4 h-4 ${hasNotMyPlace ? "text-amber-500" : "text-neutral-500"}`} />
                  <span>Не моё место ({venue.notMyPlaceCount})</span>
                </button>
              </div>

              {/* Modern Segmented Tab Controls */}
              <div className="flex border-b border-neutral-900/60 text-xs sm:text-sm pt-2">
                <button
                  onClick={() => setActiveTab("info")}
                  className={`pb-3 px-4 font-display font-semibold relative transition cursor-pointer ${
                    activeTab === "info" ? "text-white" : "text-neutral-400 hover:text-neutral-205"
                  }`}
                >
                  О заведении
                  {activeTab === "info" && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 inset-x-0 h-0.5 bg-white"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("vibes")}
                  className={`pb-3 px-4 font-display font-semibold relative transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "vibes" ? "text-white" : "text-neutral-400 hover:text-neutral-205"
                  }`}
                >
                  Народный вайб
                  <span className="text-[10px] w-4.5 h-4.5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 font-mono">
                    {Object.keys(venue.vibeRatings || {}).length}
                  </span>
                  {activeTab === "vibes" && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 inset-x-0 h-0.5 bg-white"
                    />
                  )}
                </button>
                <button
                  onClick={handleEventsTabClick}
                  className={`pb-3 px-4 font-display font-semibold relative transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "events" ? "text-white" : "text-neutral-400 hover:text-neutral-205"
                  }`}
                >
                  События сегодня
                  {vEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                  {activeTab === "events" && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 inset-x-0 h-0.5 bg-white"
                    />
                  )}
                </button>
              </div>

              {/* Tab Workspace Panel */}
              <div className="min-h-[160px] pb-6">
                <AnimatePresence mode="wait">
                  {activeTab === "info" && (
                    <motion.div
                      key="info-content"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 text-sm"
                    >
                      {/* Gorgeous airy Typography */}
                      <p className="leading-relaxed text-neutral-300 font-sans whitespace-pre-line text-[13.5px]">
                        {venue.fullDescription || venue.shortDescription}
                      </p>

                      {/* Clean minimalist borderless tag pill layout */}
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-900/40">
                        {venue.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3.5 py-1.5 bg-neutral-900/60 text-[10px] text-neutral-400 font-mono border border-neutral-900 rounded-lg select-none"
                          >
                            # {tag}
                          </span>
                        ))}
                      </div>

                      {/* Atmosphere Horizontal Scroll Gallery */}
                      <div className="space-y-3 pt-3 border-t border-neutral-905">
                        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.15em] px-0.5">Кадры атмосферы</div>
                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none snap-x">
                          {venue.gallery.slice(1).map((photoUrl, index) => (
                            <div key={index} className="w-60 h-36 rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-900/50 shadow shrink-0 snap-start">
                              <img
                                src={photoUrl}
                                alt="Атмосфера"
                                className="w-full h-full object-cover select-none filter brightness-95"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                          {venue.gallery.length < 2 && (
                            <div className="border border-dashed border-neutral-900 w-60 h-36 rounded-2xl flex items-center justify-center text-center p-5 text-neutral-500 text-xs shrink-0 bg-neutral-900/10 font-mono">
                              Дополнительные кадры пока не добавлены
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Curated featured suggestions */}
                      {isPremiumActive && premium.featuredDrinks && premium.featuredDrinks.length > 0 && (
                        <div className="p-5 bg-neutral-950 border border-neutral-900/60 rounded-3xl space-y-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-display font-bold uppercase tracking-[0.1em] text-white">Рекомендации бармена:</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {premium.featuredDrinks.map((drink, i) => (
                              <div key={i} className="flex items-center gap-2.5 bg-neutral-900/20 p-2 py-2.5 rounded-xl border border-neutral-900/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-505 shrink-0" />
                                <span className="font-semibold text-neutral-300">{drink}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clean classy contact coordinates */}
                      <div className="grid sm:grid-cols-2 gap-6 border-t border-neutral-900 pt-5 text-xs font-mono">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[9px] text-[#8e8e93] uppercase tracking-wider mb-0.5">ВРЕМЯ РАБОТЫ</div>
                              <span className="text-neutral-200 font-sans text-xs">{venue.workingHours}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <Phone className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[9px] text-[#8e8e93] uppercase tracking-wider mb-0.5">КОНТАКТЫ</div>
                              {venue.contacts.phone ? (
                                <a
                                  href={`tel:${venue.contacts.phone}`}
                                  className="text-neutral-200 hover:text-white underline decoration-white/20 transition font-sans text-xs"
                                  onClick={() => handleSocialClick("phone", venue.contacts.phone)}
                                >
                                  {venue.contacts.phone}
                                </a>
                              ) : (
                                <span className="text-neutral-500 font-sans text-xs">Только онлайн-заказ</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 text-xs font-mono">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[9px] text-[#8e8e93] uppercase tracking-wider mb-0.5">АДРЕС</div>
                              <span className="text-neutral-200 font-sans text-xs">{venue.address}</span>
                            </div>
                          </div>

                          <button
                            onClick={handleRouteClick}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-200 transition cursor-pointer font-sans"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Найти на Яндекс Картах
                          </button>
                        </div>
                      </div>

                      {/* External Classy links row */}
                      <div className="flex items-center gap-3 border-t border-neutral-900 pt-4">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Ресурсы:</span>
                        <div className="flex gap-2">
                          {venue.contacts.telegram && (
                            <a
                              href={`https://t.me/${venue.contacts.telegram}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800/60 rounded-xl transition"
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
                              className="p-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800/60 rounded-xl transition"
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
                              className="p-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800/60 rounded-xl transition"
                              onClick={() => handleSocialClick("website", venue.contacts.website)}
                            >
                              <Globe className="w-4 h-4 text-[#818cf8]" />
                            </a>
                          )}
                        </div>

                        {isPremiumActive && premium.ctaUrl && (
                          <a
                            href={premium.ctaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto text-[10px] font-display font-bold uppercase tracking-widest px-4.5 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-xl transition shadow"
                          >
                            {premium.ctaText || "Подробнее"}
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "vibes" && (
                    <motion.div
                      key="vibes-content"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <p className="text-xs text-[#8e8e93] leading-relaxed pt-1 font-mono">
                        ГОЛОСА ЗАВЕДЕНИЯ: ТАДИТЕ НА ЛЮБОЙ ТЕГ ДЛЯ ОЦЕНКИ ИЛИ ПОДДЕРЖКИ
                      </p>

                      <div className="space-y-4 pt-1">
                        {Object.keys(venue.vibeRatings || {}).length === 0 ? (
                          <div className="text-center py-10 text-xs text-neutral-500 border border-dashed border-neutral-900 rounded-2xl">
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
                                    <div className="flex justify-between items-center text-xs text-neutral-300 font-display relative z-10">
                                      <span className={`font-medium flex items-center gap-2 ${userLikedThisVibe ? "text-white font-semibold" : "text-neutral-300 group-hover:text-white"}`}>
                                        {userLikedThisVibe ? (
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
                                        ) : (
                                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 group-hover:bg-neutral-600 transition" />
                                        )}
                                        {tag}
                                      </span>
                                      <span className="font-mono text-[10px] text-[#8e8e93] group-hover:text-neutral-300 transition">
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
                          className="flex items-center gap-1.5 text-xs text-white bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 py-3 px-5 rounded-2xl transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4 animate-pulse" /> Выразить Свой Вайб
                        </button>

                        <AnimatePresence>
                          {showVibeCreator && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="mt-3.5 p-4.5 bg-neutral-950 border border-neutral-900/80 rounded-2xl space-y-3"
                            >
                              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest leading-none mb-1">Свободная подборка:</div>
                              <div className="flex flex-wrap gap-2">
                                {AVAILABLE_VIBES.map((vibe) => {
                                  const isVoted = likedVibeTags.includes(vibe);
                                  return (
                                    <button
                                      key={vibe}
                                      onClick={() => {
                                        onReact(venue.id, "vibe_tag", vibe);
                                      }}
                                      className={`text-[11px] px-3.5 py-1.5 rounded-full border font-display transition duration-200 cursor-pointer ${
                                        isVoted
                                          ? "bg-rose-950/20 text-rose-400 border-rose-900"
                                          : "bg-neutral-900 text-neutral-400 border-neutral-800/70 hover:border-neutral-700"
                                      }`}
                                    >
                                      {isVoted ? `✓ ${vibe}` : `+ ${vibe}`}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "events" && (
                    <motion.div
                      key="events-content"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3.5"
                    >
                      {vEvents.length === 0 ? (
                        <div className="text-center py-10 text-xs text-neutral-500 border border-dashed border-neutral-900 rounded-2xl">
                          На сегодня событий в регламенте нет. Загляните позже!
                        </div>
                      ) : (
                        <div className="space-y-4 pt-1">
                          {vEvents.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => handleEventOpen(ev)}
                              className="w-full bg-neutral-950 rounded-2xl border border-neutral-900 overflow-hidden flex flex-col sm:flex-row gap-4 p-4.5 transition duration-200 hover:border-neutral-800 cursor-pointer"
                            >
                              {ev.coverImage && (
                                <div className="w-full sm:w-32 h-24 shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                                  <img
                                    src={ev.coverImage}
                                    alt={ev.title}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                              <div className="space-y-2 text-left">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-violet-400 uppercase tracking-widest">
                                    <Calendar className="w-3.5 h-3.5" /> Сегодня
                                  </span>
                                  <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-neutral-400 font-mono">
                                    {ev.time}
                                  </span>
                                </div>
                                
                                <h4 className="text-xs sm:text-sm font-display font-medium text-white leading-snug">{ev.title}</h4>
                                <p className="text-[11.5px] text-[#8e8e93] leading-relaxed">{ev.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
