import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Venue } from "../../types";
import { AdminSelect, EmptyLine } from "./AdminShared";

export function VenueList({ venues, selectedVenue, onSelectVenue }: { venues: Venue[]; selectedVenue: Venue | null; onSelectVenue: (venue: Venue) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");
  const categories = useMemo(() => Array.from(new Set(venues.map((venue) => venue.category))).sort(), [venues]);
  const filteredVenues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return venues.filter((venue) => {
      const matchesQuery = !normalizedQuery || [
        venue.name,
        venue.address,
        venue.category,
        venue.status,
        venue.shortDescription,
        ...(venue.tags || []),
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      const matchesStatus = status === "all" || venue.status === status;
      const matchesCategory = category === "all" || venue.category === category;
      const matchesAudit = auditFilter === "all" || (auditFilter === "issues" && venueHasAuditIssues(venue));
      return matchesQuery && matchesStatus && matchesCategory && matchesAudit;
    });
  }, [auditFilter, category, query, status, venues]);

  const issueCount = venues.filter(venueHasAuditIssues).length;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Заведения</h1>
          <p className="mt-1 text-xs text-muted-foreground">{filteredVenues.length} из {venues.length} · {issueCount} требуют проверки</p>
        </div>
        <Badge variant="outline">{venues.filter((venue) => venue.status === "published").length} опубликовано</Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_180px_190px]">
        <div className="relative md:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Название, адрес или тег"
            className="pl-9"
          />
        </div>
        <AdminSelect
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "all", label: "Все статусы" },
            { value: "published", label: "Опубликовано" },
            { value: "draft", label: "Черновики" },
            { value: "hidden", label: "Скрыто" },
            { value: "archived", label: "Архив" },
          ]}
        />
        <AdminSelect
          value={category}
          onValueChange={setCategory}
          options={[
            { value: "all", label: "Все категории" },
            ...categories.map((item) => ({ value: item, label: item })),
          ]}
        />
        <AdminSelect
          value={auditFilter}
          onValueChange={setAuditFilter}
          options={[
            { value: "all", label: "Все карточки" },
            { value: "issues", label: "Требуют проверки" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="hidden grid-cols-[48px_minmax(220px,1.5fr)_minmax(160px,1fr)_140px_90px_28px] gap-3 border-b bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
          <span />
          <span>Заведение</span>
          <span>Адрес</span>
          <span>Статус</span>
          <span className="text-right">Реакции</span>
          <span />
        </div>
        <div className="divide-y">
          {filteredVenues.length === 0 ? (
            <EmptyLine>По этим фильтрам ничего не найдено.</EmptyLine>
          ) : filteredVenues.map((venue) => {
            const issues = getVenueAuditIssues(venue);
            return (
              <Button
                type="button"
                key={venue.id}
                variant="ghost"
                onClick={() => onSelectVenue(venue)}
                className={cn(
                  "h-auto w-full justify-start rounded-none border-0 px-3 py-3 text-left text-muted-foreground hover:bg-muted/40",
                  selectedVenue?.id === venue.id && "bg-muted text-foreground",
                )}
              >
                <div className="flex w-full min-w-0 items-center gap-3 lg:grid lg:grid-cols-[48px_minmax(220px,1.5fr)_minmax(160px,1fr)_140px_90px_28px]">
                  {venue.logoUrl ? (
                    <img src={venue.logoUrl} alt="" className="size-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/30 font-semibold text-foreground">
                      {venue.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 lg:block">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate font-semibold text-foreground">{venue.name}</div>
                      <span className="shrink-0 text-[10px] text-muted-foreground lg:hidden">{venue.category}</span>
                    </div>
                    {issues.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {issues.slice(0, 2).map((issue) => (
                          <Badge key={issue} variant="secondary" className="px-1.5 text-[9px]">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="hidden min-w-0 truncate text-[11px] text-muted-foreground lg:block">{venue.address || "Адрес не указан"}</div>
                  <div className="hidden lg:block">
                    <Badge variant="outline" className="px-1.5 text-[10px]">
                      {formatVenueStatus(venue.status)}
                    </Badge>
                  </div>
                  <div className="hidden text-left text-[11px] text-muted-foreground lg:block lg:text-right">{venue.likesCount || 0}</div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatVenueStatus(status: Venue["status"]) {
  return {
    published: "Опубликовано",
    draft: "Черновик",
    hidden: "Скрыто",
    archived: "Архив",
  }[status] || status;
}

function getVenueAuditIssues(venue: Venue) {
  return [
    venue.status !== "published" ? venue.status : null,
    !venue.gallery?.length ? "нет фото" : null,
    !venue.shortDescription ? "нет описания" : null,
    !venue.workingHoursSchedule && !venue.workingHours ? "нет графика" : null,
    !venue.contacts?.phone && !venue.contacts?.telegram && !venue.contacts?.website && !venue.contacts?.vk ? "нет контакта" : null,
    venue.premiumConfig?.premiumActive && (!venue.premiumConfig.heroImage || !venue.premiumConfig.ctaUrl || !venue.premiumConfig.ctaText) ? "premium" : null,
  ].filter(Boolean) as string[];
}

function venueHasAuditIssues(venue: Venue) {
  return getVenueAuditIssues(venue).length > 0;
}
