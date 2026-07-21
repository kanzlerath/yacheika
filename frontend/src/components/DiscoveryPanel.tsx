/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  X,
  Heart,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Venue, Collection, VenueEvent } from "../types";
import {
  VenueDiscoveryFilters,
  createEmptyVenueDiscoveryFilters,
  filterVenuesForDiscovery,
} from "../utils/venueFilters";

interface DiscoveryPanelProps {
  venues: Venue[];
  collections: Collection[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  filters: VenueDiscoveryFilters;
  setFilters: Dispatch<SetStateAction<VenueDiscoveryFilters>>;
  eventsList: VenueEvent[];
  setMobileView?: (view: "map" | "list") => void;
}

const UNIFIED_PILLS = [
  { id: "Бар", label: "Бар" },
  { id: "Паб", label: "Паб" },
  { id: "Кафе", label: "Кафе" },
  { id: "Рюмочная", label: "Рюмочная" },
  { id: "Коктейльный бар", label: "Коктейли" },
  { id: "Винный бар", label: "Вино" },
  { id: "Крафтовый бар", label: "Крафт" },
  { id: "Гастробар", label: "Гастробар" },
  { id: "Кальянная", label: "Кальянная" },
  { id: "Караоке", label: "Караоке" },
  { id: "Клуб", label: "Клуб" },
  { id: "Ресторан", label: "Ресторан" },
];

const VIBE_FILTER_GROUPS = [
  { title: "Атмосфера", tags: ["уютно", "душевно", "романтично", "эстетично", "движ", "для компании"] },
  { title: "Музыка", tags: ["живая музыка", "DJ", "джаз", "рок", "техно", "караоке"] },
  { title: "Еда и напитки", tags: ["авторские коктейли", "крафтовое пиво", "вино", "настойки", "полноценная кухня", "закуски"] },
  { title: "Формат", tags: ["свидание", "после работы", "день рождения", "танцы", "настольные игры", "спорт-трансляции"] },
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

  const activeFilterCount =
    filters.categories.length +
    filters.tags.length +
    Number(filters.openNow) +
    Number(filters.hasEventToday);

  const clearAllFilters = () => {
    setFilters(createEmptyVenueDiscoveryFilters());
  };

  return (
    <div 
      id="discovery-panel" 
      className="h-full min-h-0 overflow-y-auto overscroll-contain font-sans"
      style={{
        paddingTop: "calc(4.5rem + env(safe-area-inset-top, 0px))"
      }}
    >
      {/* Search Header Area */}
      <div className="discovery-header space-y-3 border-b p-4">
        
        {/* Sleek, simplified Search bar */}
        <div className="flex items-center gap-2">
          {setMobileView && (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={() => setMobileView("map")}
              className="discovery-icon-button md:hidden shrink-0"
              title="Назад к карте"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Найти..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="discovery-search-input h-10 text-xs pl-9 pr-8 rounded-xl"
            />
            {filters.search && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                aria-label="Очистить поиск"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ToggleGroup
              type="multiple"
              value={[
                ...(filters.openNow ? ["openNow"] : []),
                ...(filters.hasEventToday ? ["hasEventToday"] : []),
              ]}
              onValueChange={(values) => {
                setFilters((prev) => ({
                  ...prev,
                  openNow: values.includes("openNow"),
                  hasEventToday: values.includes("hasEventToday"),
                }));
              }}
              className="flex w-full flex-wrap items-start justify-start gap-1.5 py-0.5"
              spacing={1}
              variant="outline"
            >
              <ToggleGroupItem value="openNow" aria-label="Сейчас открыто" className="discovery-pill h-8 rounded-md px-3 text-[11px]">
                Сейчас открыто
              </ToggleGroupItem>
              <ToggleGroupItem value="hasEventToday" aria-label="События сегодня" className="discovery-pill h-8 rounded-md px-3 text-[11px]">
                События сегодня
              </ToggleGroupItem>
              </ToggleGroup>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={() => setIsFiltersExpanded((value) => !value)}
            className="discovery-icon-button shrink-0"
            title={isFiltersExpanded ? "Свернуть параметры" : "Все параметры"}
            aria-label={isFiltersExpanded ? "Свернуть параметры поиска" : "Открыть параметры поиска"}
          >
            {isFiltersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isFiltersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -8 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-4 pt-1">
                {activeFilterCount > 0 && (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-mono text-zinc-500">{activeFilterCount} выбрано</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={clearAllFilters}
                      title="Сбросить параметры"
                      aria-label="Сбросить параметры"
                    >
                      <RotateCcw />
                    </Button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-550">Тип места</div>
                  <ToggleGroup
                    type="multiple"
                    value={filters.categories}
                    onValueChange={(categories) => setFilters((prev) => ({ ...prev, categories }))}
                    className="flex w-full flex-wrap justify-start gap-1.5"
                    spacing={1}
                    variant="outline"
                  >
                    {UNIFIED_PILLS.map((pill) => (
                      <ToggleGroupItem
                        key={pill.id}
                        value={pill.id}
                        aria-label={pill.label}
                        className="discovery-pill h-8 rounded-md px-3 text-[11px]"
                      >
                        {pill.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                {VIBE_FILTER_GROUPS.map((group) => (
                  <div key={group.title} className="flex flex-col gap-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-550">{group.title}</div>
                    <ToggleGroup
                      type="multiple"
                      value={filters.tags}
                      onValueChange={(tags) => setFilters((prev) => ({ ...prev, tags }))}
                      className="flex w-full flex-wrap justify-start gap-1.5"
                      spacing={1}
                      variant="outline"
                    >
                      {group.tags.map((tag) => (
                        <ToggleGroupItem
                          key={tag}
                          value={tag}
                          aria-label={tag}
                          className="discovery-pill h-8 rounded-md px-3 text-[11px]"
                        >
                          {tag}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main body displaying listings */}
      <div
        className="space-y-5 px-4 pt-3"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Directory-style clean Listings */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-550">
              {formatVenuesFound(filteredVenues.length)}
            </div>
            {(activeFilterCount > 0 || filters.search) && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={clearAllFilters}
                title="Сбросить фильтры"
                aria-label="Сбросить фильтры"
              >
                <RotateCcw />
              </Button>
            )}
          </div>

          <div className="space-y-1" id="matching-venues-list">
            {filteredVenues.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500 border border-dashed border-zinc-900 rounded-xl space-y-1">
                <div>Места не найдены.</div>
                <div className="text-[10px]">Очистите выбранные параметры, чтобы увидеть полный список.</div>
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
                      <div className="size-[52px] shrink-0 overflow-hidden rounded-xl">
                        <img
                          src={venue.logoUrl || venue.gallery[0] || "/logo.png"}
                          alt={venue.name}
                          className="size-full object-cover object-center transition duration-250 group-hover:scale-105"
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
	                      <div className="text-sm font-semibold text-zinc-200 flex items-center justify-end gap-1 leading-none">
	                        <Heart className="block w-3.5 h-3.5 fill-rose-500 text-rose-500" />
	                        <span className="leading-none">{venue.likesCount}</span>
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
