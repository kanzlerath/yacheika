import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VenueSuggestion } from "../../types";
import { EmptyLine } from "./AdminShared";

type SuggestionStatusFilter = "all" | VenueSuggestion["status"];

export function SuggestionsView({ suggestions }: { suggestions: VenueSuggestion[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SuggestionStatusFilter>("all");
  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return suggestions.filter((suggestion) => {
      const matchesStatus = status === "all" || suggestion.status === status;
      const matchesQuery = !normalizedQuery || [
        suggestion.name,
        suggestion.address,
        suggestion.comment,
        suggestion.contact,
        suggestion.userName,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [query, status, suggestions]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Заявки на заведения</h2>
        <p className="text-xs text-muted-foreground">{filteredSuggestions.length} из {suggestions.length} · предложения от гостей и пользователей</p>
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: название, адрес, контакт" />
        <ToggleGroup type="single" value={status} onValueChange={(value) => value && setStatus(value as SuggestionStatusFilter)} variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-3 sm:grid-cols-5">
          {(["all", "new", "reviewed", "rejected", "converted"] as const).map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              className="text-[10px]"
            >
              {item === "all" ? "Все" : item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {filteredSuggestions.length === 0 ? (
        <EmptyLine>Заявок по этим фильтрам нет.</EmptyLine>
      ) : (
        <div className="grid gap-2">
          {filteredSuggestions.map((suggestion) => (
            <Card key={suggestion.id} size="sm">
              <CardContent className="p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">{suggestion.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{suggestion.address}</div>
                  </div>
                  <div className="sm:text-right">
                    <Badge variant="outline">{suggestion.status}</Badge>
                  </div>
                </div>
                {(suggestion.comment || suggestion.contact) && (
                  <div className="mt-3 flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground">
                    {suggestion.comment && <div>{suggestion.comment}</div>}
                    {suggestion.contact && <div className="font-mono">Контакт: {suggestion.contact}</div>}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>{suggestion.userName || "гость"}</span>
                  <span>{new Date(suggestion.createdAt).toLocaleString("ru-RU")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
