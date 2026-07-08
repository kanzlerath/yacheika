import { useMemo, useState } from "react";
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
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">Заведения</h2>
          <p className="text-[10px] text-muted-foreground">{filteredVenues.length} из {venues.length} · {issueCount} требуют проверки</p>
        </div>
        <Badge variant="outline">{venues.filter((venue) => venue.status === "published").length} published</Badge>
      </div>

      <div className="flex flex-col gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск: название, адрес, тег"
        />
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
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
      </div>

      <div className="max-h-[72vh] overflow-y-auto pr-1">
        <div className="flex flex-col gap-1.5">
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
                  "h-auto w-full justify-start rounded-lg border border-transparent p-2 text-left text-muted-foreground",
                  selectedVenue?.id === venue.id && "border-border bg-muted text-foreground",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="truncate font-semibold">{venue.name}</div>
                    <Badge variant="outline" className="shrink-0 px-1.5 text-[10px]">
                      {venue.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate">{venue.category}</span>
                    <span className="shrink-0">{venue.likesCount || 0} лайков</span>
                  </div>
                  {issues.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {issues.slice(0, 3).map((issue) => (
                        <Badge key={issue} variant="secondary" className="px-1.5 text-[10px]">
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getVenueAuditIssues(venue: Venue) {
  return [
    venue.status !== "published" ? venue.status : null,
    !venue.gallery?.length ? "нет фото" : null,
    !venue.shortDescription ? "нет описания" : null,
    !venue.workingHoursSchedule && !venue.workingHours ? "нет графика" : null,
    !venue.contacts?.phone && !venue.contacts?.telegram && !venue.contacts?.website && !venue.contacts?.instagram && !venue.contacts?.vk ? "нет контакта" : null,
    venue.premiumConfig?.premiumActive && (!venue.premiumConfig.heroImage || !venue.premiumConfig.ctaUrl || !venue.premiumConfig.ctaText) ? "premium" : null,
  ].filter(Boolean) as string[];
}

function venueHasAuditIssues(venue: Venue) {
  return getVenueAuditIssues(venue).length > 0;
}
