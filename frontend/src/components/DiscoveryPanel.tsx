/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction } from "react";
import { motion } from "motion/react";
import {
  Search,
  X,
  BookOpen,
  Heart,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Venue, Collection, VenueEvent } from "../types";
import { filterVenuesForDiscovery } from "../utils/venueFilters";
import { contentSwitch, revealItem, revealList, softTransition } from "../utils/motionPresets";

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
  eventsList: VenueEvent[];
  setMobileView?: (view: "map" | "list") => void;
}

const UNIFIED_PILLS = [
  { id: "all", label: "Все бары", type: "all" },
  { id: "коктейльный бар", label: "Коктейли", type: "category" },
  { id: "крафтовый бар", label: "Крафт", type: "category" },
  { id: "винный бар", label: "Вино", type: "category" },
  { id: "паб", label: "Пабы", type: "category" },
  { id: "рюмочная", label: "Рюмочные", type: "category" },
  { id: "свидание", label: "Свидание", type: "tag" },
  { id: "летник", label: "Летник", type: "tag" },
  { id: "шумно", label: "Шумно", type: "tag" },
  { id: "тихо", label: "Тихо", type: "tag" },
  { id: "DJ", label: "DJ & Винил", type: "tag" },
  { id: "openNow", label: "Открыто", type: "openNow" },
  { id: "hasEventToday", label: "События", type: "hasEventToday" },
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
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const filteredVenues = filterVenuesForDiscovery(venues, filters, {
    collectionVenueIds: selectedCollection?.venueIds,
    events: eventsList,
  });

  const handlePillClick = (pill: typeof UNIFIED_PILLS[0]) => {
    const nextFilters = {
      category: "",
      tag: "",
      openNow: false,
      hasEventToday: false,
      search: filters.search,
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
    setFilters({
      category: "",
      tag: "",
      openNow: false,
      hasEventToday: false,
      search: "",
    });
  };

  // 1. Dedicated detailed view panel for curated collections
  if (selectedCollection) {
    return (
      <motion.div
        id="discovery-panel" 
        className="flex flex-col h-full font-sans"
        {...contentSwitch}
        style={{
          paddingTop: "calc(4.5rem + env(safe-area-inset-top, 0px))"
        }}
      >
        {/* Header */}
        <div className="discovery-header p-4 border-b flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSelectedCollection(null)}
            className="discovery-icon-button flex items-center justify-center border w-9 h-9 rounded-xl transition duration-150 cursor-pointer select-none"
            title="Назад к поиску"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-500">Подборка редактора</span>
            <span className="text-xs font-semibold text-zinc-100 truncate pr-2">{selectedCollection.title}</span>
          </div>
        </div>

        {/* Description & Venue Listings */}
        <div 
          className="flex-1 overflow-y-auto px-4 pt-4 space-y-5 scrollbar-thin"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="discovery-soft-card p-4 rounded-xl border space-y-1.5">
            <h3 className="text-xs font-bold text-zinc-100 pr-5">
              {selectedCollection.title}
            </h3>
            <p className="text-[11px] text-zinc-400 leading-normal">
              {selectedCollection.description}
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-550">
              В подборке: {filteredVenues.length} заведений
            </div>

            <motion.div className="space-y-0.5 divide-y divide-zinc-950" variants={revealList} initial="hidden" animate="show">
              {filteredVenues.map((venue) => {
                const total = venue.likesCount + venue.notMyPlaceCount;
                const ratio = total > 0 ? `${Math.round((venue.likesCount / total) * 100)}%` : "нет оценок";

                return (
                  <motion.button
                    key={venue.id}
                    onClick={() => onSelectVenue(venue)}
                    variants={revealItem}
                    whileTap={{ scale: 0.995 }}
                    className="discovery-list-row w-full text-left py-2.5 px-2 rounded-xl flex items-center justify-between gap-3.5 transition duration-150 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-11 h-11 rounded-lg bg-zinc-950 overflow-hidden shrink-0 border border-zinc-900/60 relative">
                        <img
                          src={venue.gallery[0] || "/logo.png"}
                          alt={venue.name}
                          className="w-full h-full object-cover filter brightness-[0.85] transition duration-250 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = "/logo.png";
                          }}
                        />
                      </div>
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
                      <div className="text-[9px] font-mono text-zinc-550">{ratio}</div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. Standard Search and Discovery Panel View
  return (
    <div 
      id="discovery-panel" 
      className="flex flex-col h-full font-sans"
      style={{
        paddingTop: "calc(4.5rem + env(safe-area-inset-top, 0px))"
      }}
    >
      {/* Search Header Area */}
      <div className="discovery-header p-4 space-y-3 shrink-0 border-b">
        
        {/* Sleek, simplified Search bar */}
        <div className="flex items-center gap-2">
          {setMobileView && (
            <button
              onClick={() => setMobileView("map")}
              className="discovery-icon-button md:hidden flex items-center justify-center border w-9 h-9 rounded-xl transition duration-150 cursor-pointer select-none shrink-0"
              title="Назад к карте"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Найти..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="discovery-search-input w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border outline-none transition duration-150"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible filter tags row with chevron toggle */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <motion.div
              layout
              transition={softTransition}
              className={isFiltersExpanded ? "flex flex-wrap gap-1.5 py-0.5" : "overflow-x-auto scrollbar-none flex gap-1.5 py-0.5 -mx-1 px-1"}
            >
                {(isFiltersExpanded ? UNIFIED_PILLS : UNIFIED_PILLS.slice(0, 5)).map((pill) => {
                  const active = isPillActive(pill);
                  return (
                    <button
                      key={pill.id}
                      onClick={() => handlePillClick(pill)}
                      className={`text-[11px] px-3.5 py-1.5 rounded-lg font-medium transition select-none cursor-pointer duration-150 ${
                        active
                          ? "discovery-pill-active font-semibold shadow"
                          : "discovery-pill border"
                      } ${isFiltersExpanded ? "" : "shrink-0"}`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </motion.div>
          </div>
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="discovery-icon-button flex items-center justify-center w-8 h-8 rounded-lg border transition shrink-0 cursor-pointer"
            title={isFiltersExpanded ? "Свернуть фильтры" : "Все фильтры"}
          >
            {isFiltersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main body displaying Curated Playlists & Listings */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-3 space-y-5 scrollbar-thin"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        
        {/* Micro Elegant Curated Lists Shelf */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center gap-1.5 px-0.5">
            <BookOpen className="w-3 h-3 text-amber-500" />
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-zinc-550">Редакторские списки</h3>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {collections.map((coll) => (
              <motion.button
                key={coll.id}
                onClick={() => selectCrawlCollection(coll)}
                whileTap={{ scale: 0.98 }}
                className="discovery-pill flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition duration-150 cursor-pointer text-nowrap select-none"
              >
                <span>{coll.title}</span>
                <span className="text-[9px] font-mono text-zinc-550">({coll.venueIds.length})</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Directory-style clean Listings */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-550">
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

          <motion.div className="space-y-0.5 divide-y divide-zinc-950" id="matching-venues-list" variants={revealList} initial="hidden" animate="show">
            {filteredVenues.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500 border border-dashed border-zinc-900 rounded-xl space-y-1">
                <div>Места не найдены.</div>
                <div className="text-[10px]">Кликните "Сбросить" для вызова полного списка.</div>
              </div>
            ) : (
              filteredVenues.map((venue) => {
                const total = venue.likesCount + venue.notMyPlaceCount;
                const ratio = total > 0 ? `${Math.round((venue.likesCount / total) * 100)}% лояльность` : "нет оценок";

                return (
                  <motion.button
                    key={venue.id}
                    onClick={() => onSelectVenue(venue)}
                    variants={revealItem}
                    whileTap={{ scale: 0.995 }}
                    className="discovery-list-row w-full text-left py-2.5 px-2 rounded-xl flex items-center justify-between gap-3.5 transition duration-150 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      
                      {/* Micro clean photo without aggressive sizes */}
                      <div className="w-11 h-11 rounded-lg bg-zinc-950 overflow-hidden shrink-0 border border-zinc-900/60 relative">
                        <img
                          src={venue.gallery[0] || "/logo.png"}
                          alt={venue.name}
                          className="w-full h-full object-cover filter brightness-[0.85] transition duration-250 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = "/logo.png";
                          }}
                        />
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
                      <div className="text-[9px] font-mono text-zinc-550">{ratio}</div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
