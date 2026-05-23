/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Sparkles,
  MapPin,
  X,
  BookOpen,
  Heart,
  Compass,
  Map
} from "lucide-react";
import { Venue, Collection } from "../types";

interface DiscoveryPanelProps {
  venues: Venue[];
  collections: Collection[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  filters: {
    category: string;
    tag: string;
    openNow: boolean;
    hasEventToday: boolean;
    search: string;
  };
  setFilters: Dispatch<SetStateAction<{
    category: string;
    tag: string;
    openNow: boolean;
    hasEventToday: boolean;
    search: string;
  }>>;
  eventsList: any[];
  setMobileView?: (view: "map" | "list") => void;
}

const UNIFIED_PILLS = [
  { id: "all", label: "Все бары", type: "all" },
  { id: "коктейльный бар", label: "🍹 Коктейли", type: "category" },
  { id: "крафтовый бар", label: "🍺 Крафт", type: "category" },
  { id: "винный бар", label: "🍷 Вино", type: "category" },
  { id: "паб", label: "💂 Пабы", type: "category" },
  { id: "рюмочная", label: "🥃 Рюмочные", type: "category" },
  { id: "свидание", label: "❤️ Свидание", type: "tag" },
  { id: "летник", label: "🏮 Летник", type: "tag" },
  { id: "шумно", label: "🔥 Шумно", type: "tag" },
  { id: "тихо", label: "🕯️ Тихо", type: "tag" },
  { id: "DJ", label: "🎵 DJ & Винил", type: "tag" },
  { id: "openNow", label: "⏰ Открыто", type: "openNow" },
  { id: "hasEventToday", label: "⚡️ События", type: "hasEventToday" },
];

export default function DiscoveryPanel({
  venues,
  collections,
  onSelectVenue,
  filters,
  setFilters,
  eventsList,
  setMobileView,
}: DiscoveryPanelProps) {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  // Apply visual filtering on venues for sidebar list
  const filteredVenues = venues.filter((venue) => {
    if (venue.status !== "published") return false;

    // Filter by Active Collection if selected
    if (selectedCollection && !selectedCollection.venueIds.includes(venue.id)) {
      return false;
    }

    // Filter by Category
    if (filters.category && venue.category !== filters.category) {
      return false;
    }

    // Filter by Tag
    if (filters.tag && !venue.tags.includes(filters.tag)) {
      return false;
    }

    // Filter by Open Now
    if (filters.openNow) {
      const hours = new Date().getHours();
      // Simple logic check: closed between 4am and 3pm
      if (hours < 15 && hours >= 4) {
        return false;
      }
    }

    // Filter by Event Today
    if (filters.hasEventToday) {
      const hasEvent = eventsList.some(e => e.venueId === venue.id);
      if (!hasEvent) return false;
    }

    // Filter by Search text Input
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesName = venue.name.toLowerCase().includes(q);
      const matchesDesc = venue.shortDescription.toLowerCase().includes(q);
      const matchesTags = venue.tags.some(t => t.toLowerCase().includes(q));
      if (!matchesName && !matchesDesc && !matchesTags) {
        return false;
      }
    }

    return true;
  });

  const handlePillClick = (pill: typeof UNIFIED_PILLS[0]) => {
    // Reset other filters when toggling category/tags to keep it intuitive and single-focused
    const nextFilters = {
      category: "",
      tag: "",
      openNow: false,
      hasEventToday: false,
      search: filters.search, // Preserve search text
    };

    if (pill.type === "category") {
      nextFilters.category = pill.id;
    } else if (pill.type === "tag") {
      nextFilters.tag = pill.id;
    } else if (pill.type === "openNow") {
      nextFilters.openNow = true;
    } else if (pill.type === "hasEventToday") {
      nextFilters.hasEventToday = true;
    }

    setFilters(nextFilters);
  };

  const isPillActive = (pill: typeof UNIFIED_PILLS[0]) => {
    if (pill.type === "all") {
      return !filters.category && !filters.tag && !filters.openNow && !filters.hasEventToday;
    }
    if (pill.type === "category") {
      return filters.category === pill.id;
    }
    if (pill.type === "tag") {
      return filters.tag === pill.id;
    }
    if (pill.type === "openNow") {
      return filters.openNow;
    }
    if (pill.type === "hasEventToday") {
      return filters.hasEventToday;
    }
    return false;
  };

  const clearAllFilters = () => {
    setFilters({
      category: "",
      tag: "",
      openNow: false,
      hasEventToday: false,
      search: "",
    });
    setSelectedCollection(null);
  };

  const selectCrawlCollection = (coll: Collection) => {
    setSelectedCollection(coll);
    // Clear search and other filters to display collection clean
    setFilters({
      category: "",
      tag: "",
      openNow: false,
      hasEventToday: false,
      search: "",
    });
  };

  return (
    <div id="discovery-panel" className="flex flex-col h-full text-zinc-300 bg-[#060608] font-sans">
      
      {/* Search Header Area */}
      <div className="p-4 space-y-3 shrink-0 bg-[#060608] border-b border-zinc-900/40">
        
        {/* Sleek, simplified Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Найти бар или атмосферу..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full bg-zinc-950/80 focus:bg-zinc-950 text-xs pl-9 pr-8 py-2.5 rounded-xl border border-zinc-900 focus:border-zinc-800 outline-none text-zinc-100 placeholder-zinc-500 transition duration-150"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {setMobileView && (
            <button
              onClick={() => setMobileView("map")}
              className="md:hidden flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-750 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-200 transition duration-150 cursor-pointer select-none"
            >
              <Map className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>Карта</span>
            </button>
          )}
        </div>

        {/* Unified, single row of clean scrolling filter tags */}
        <div className="overflow-x-auto scrollbar-none flex gap-1.5 py-0.5 -mx-1 px-1">
          {UNIFIED_PILLS.map((pill) => {
            const active = isPillActive(pill);
            return (
              <button
                key={pill.id}
                onClick={() => handlePillClick(pill)}
                className={`text-[11px] px-3.5 py-1.5 rounded-lg font-medium transition shrink-0 select-none cursor-pointer duration-150 ${
                  active
                    ? "bg-zinc-100 text-zinc-950 font-semibold shadow"
                    : "bg-zinc-900/35 text-zinc-400 border border-zinc-900 hover:border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main body displaying Curated Playlists & Listings */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-3 space-y-5 scrollbar-thin"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        
        {/* Active Collection Description Card */}
        <AnimatePresence>
          {selectedCollection && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-900/10 relative space-y-1.5"
            >
              <button
                onClick={() => setSelectedCollection(null)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-amber-500">
                <BookOpen className="w-3.5 h-3.5" /> Подборка редактора
              </div>
              <h3 className="text-xs font-semibold text-zinc-100 pr-5">
                {selectedCollection.title}
              </h3>
              <p className="text-[11px] text-zinc-400 leading-normal pr-1">
                {selectedCollection.description}
              </p>
              <button
                onClick={() => setSelectedCollection(null)}
                className="text-[10px] text-amber-500/95 hover:text-amber-400 underline transition cursor-pointer"
              >
                Сбросить и показать все места
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Micro Elegant Curated Lists Shelf */}
        {!selectedCollection && (
          <div className="space-y-2 shrink-0">
            <div className="flex items-center gap-1.5 px-0.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-zinc-505">Редакторские списки</h3>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {collections.map((coll) => (
                <button
                  key={coll.id}
                  onClick={() => selectCrawlCollection(coll)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-zinc-950/70 border border-zinc-900 hover:border-zinc-800 text-zinc-350 hover:text-zinc-100 transition duration-150 cursor-pointer text-nowrap select-none"
                >
                  <Compass className="w-3 h-3 text-rose-500" />
                  <span>{coll.title}</span>
                  <span className="text-[9px] font-mono text-zinc-550">({coll.venueIds.length})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Directory-style clean Listings */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-505">
              {filteredVenues.length} заведений найдены
            </div>
            {(filters.category || filters.tag || filters.openNow || filters.hasEventToday || filters.search || selectedCollection) && (
              <button
                onClick={clearAllFilters}
                className="text-[10px] text-rose-400 hover:text-rose-300 underline font-mono select-none cursor-pointer"
              >
                Сбросить
              </button>
            )}
          </div>

          <div className="space-y-0.5 divide-y divide-zinc-950" id="matching-venues-list">
            {filteredVenues.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500 border border-dashed border-zinc-900 rounded-xl space-y-1">
                <div>Места не найдены.</div>
                <div className="text-[10px]">Кликните "Сбросить" для вызова полного списка.</div>
              </div>
            ) : (
              filteredVenues.map((venue) => {
                const total = venue.likesCount + venue.notMyPlaceCount;
                const ratio = total > 0 ? Math.round((venue.likesCount / total) * 100) : 100;
                const matchesPremium = venue.premiumConfig?.premiumActive;
                const customAccent = matchesPremium && venue.premiumConfig?.customColors?.accent ? venue.premiumConfig.customColors.accent : "#e11d48";

                return (
                  <button
                    key={venue.id}
                    onClick={() => onSelectVenue(venue)}
                    className="w-full text-left py-2.5 px-2 rounded-xl flex items-center justify-between gap-3.5 transition duration-150 hover:bg-zinc-950 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      
                      {/* Micro clean photo without aggressive sizes */}
                      <div className="w-11 h-11 rounded-lg bg-zinc-950 overflow-hidden shrink-0 border border-zinc-900/60 relative">
                        <img
                          src={venue.gallery[0]}
                          alt={venue.name}
                          className="w-full h-full object-cover filter brightness-[0.85] transition duration-250 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        {matchesPremium && (
                          <div 
                            className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full shadow"
                            style={{ backgroundColor: customAccent }}
                          />
                        )}
                      </div>
                      
                      {/* Name and secondary meta */}
                      <div className="space-y-0.5 overflow-hidden">
                        <h4 className="text-xs sm:text-[13px] font-semibold text-zinc-250 group-hover:text-white truncate">
                          {venue.name}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-450 shrink-0">
                            {venue.category}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{venue.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center justify-end gap-1">
                        <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                        <span>{venue.likesCount}</span>
                      </div>
                      <div className="text-[9px] font-mono text-zinc-550">{ratio}% лояльность</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
