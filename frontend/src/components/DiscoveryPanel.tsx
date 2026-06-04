/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction } from "react";
import {
  Search,
  X,
  Heart,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Venue, Collection, VenueEvent } from "../types";
import { filterVenuesForDiscovery } from "../utils/venueFilters";

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
  { id: "Бар", label: "Бар", type: "category" },
  { id: "Паб", label: "Паб", type: "category" },
  { id: "Рюмочная", label: "Рюмочная", type: "category" },
  { id: "Коктейльный бар", label: "Коктейльный бар", type: "category" },
  { id: "Винный бар", label: "Винный бар", type: "category" },
  { id: "Крафтовый бар", label: "Крафтовый бар", type: "category" },
  { id: "Гастробар", label: "Гастробар", type: "category" },
  { id: "Кальянная", label: "Кальянная", type: "category" },
  { id: "Караоке", label: "Караоке", type: "category" },
  { id: "Клуб", label: "Клуб", type: "category" },
  { id: "Ресторан", label: "Ресторан", type: "category" },
];

const formatVenuesFound = (count: number) => {
  const lastTwo = count % 100;
  const last = count % 10;
  const word = lastTwo >= 11 && lastTwo <= 14
    ? "заведений"
    : last === 1
      ? "заведение"
      : last >= 2 && last <= 4
        ? "заведения"
        : "заведений";
  const verb = last === 1 && lastTwo !== 11 ? "найдено" : "найдены";
  return `${count} ${word} ${verb}`;
};

export default function DiscoveryPanel({
  venues,
  onSelectVenue,
  filters,
  setFilters,
  eventsList,
  setMobileView,
}: DiscoveryPanelProps) {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const filteredVenues = filterVenuesForDiscovery(venues, filters, {
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
    }

    setFilters(nextFilters);
  };

  const isPillActive = (pill: typeof UNIFIED_PILLS[0]) => {
    if (pill.type === "category") {
      return filters.category === pill.id;
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
  };

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
            <div
              className={`flex flex-wrap gap-1.5 overflow-hidden py-0.5 transition-[max-height] duration-300 ease-out ${
                isFiltersExpanded ? "max-h-44 pb-1" : "max-h-[36px]"
              }`}
            >
                {UNIFIED_PILLS.map((pill) => {
                  const active = isPillActive(pill);
                  return (
                    <button
                      key={pill.id}
                      onClick={() => handlePillClick(pill)}
                      className={`text-[11px] px-3.5 py-1.5 rounded-lg font-medium transition select-none cursor-pointer duration-150 ${
                        active
                          ? "discovery-pill-active font-semibold shadow"
                          : "discovery-pill border"
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
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

      {/* Main body displaying listings */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-3 space-y-5 scrollbar-thin"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Directory-style clean Listings */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-550">
              {formatVenuesFound(filteredVenues.length)}
            </div>
            {(filters.category || filters.tag || filters.openNow || filters.hasEventToday || filters.search) && (
              <button
                onClick={clearAllFilters}
                className="text-[10px] text-rose-400 hover:text-rose-300 underline font-mono select-none cursor-pointer"
              >
                Сбросить
              </button>
            )}
          </div>

          <div className="space-y-1" id="matching-venues-list">
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
                  <button
                    key={venue.id}
                    onClick={() => onSelectVenue(venue)}
                    className="discovery-list-row w-full text-left py-3 px-2 flex items-center justify-between gap-3.5 transition duration-150 group cursor-pointer"
                  >
                    <div className="grid min-w-0 flex-1 grid-cols-[52px_minmax(0,1fr)] items-center gap-3.5">
                      
                      {/* Micro clean photo without aggressive sizes */}
                      <div className="h-[52px] w-[52px] rounded-xl bg-zinc-950 overflow-hidden shrink-0 border border-zinc-900/60 relative">
                        <img
                          src={venue.logoUrl || venue.gallery[0] || "/logo.png"}
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
                      <div className="min-w-0 space-y-0.5 overflow-hidden">
                        <h4 className="text-sm font-semibold text-zinc-250 group-hover:text-white truncate">
                          {venue.name}
                        </h4>
                        
                        <div className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-1.5 text-[11px] text-zinc-500">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-450">
                            {venue.category}
                          </span>
                          <span>•</span>
                          <span className="min-w-0 truncate">{venue.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-zinc-200 flex items-center justify-end gap-1">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span>{venue.likesCount}</span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-550">{ratio}</div>
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
