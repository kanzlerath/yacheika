import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VenueSuggestion } from "../../types";
import { EmptyLine } from "./AdminShared";

type SuggestionStatusFilter = "all" | VenueSuggestion["status"];
const STATUS_OPTIONS: Array<{ value: VenueSuggestion["status"]; label: string }> = [
  { value: "new", label: "Новая" },
  { value: "reviewed", label: "В работе" },
  { value: "converted", label: "Принята" },
  { value: "rejected", label: "Отказ" },
];

export function SuggestionsView({ suggestions }: { suggestions: VenueSuggestion[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SuggestionStatusFilter>("all");
  const [localSuggestions, setLocalSuggestions] = useState(suggestions);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const sourceSuggestions = localSuggestions;

  useEffect(() => {
    setLocalSuggestions(suggestions);
  }, [suggestions]);
  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sourceSuggestions.filter((suggestion) => {
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
  }, [query, status, sourceSuggestions]);

  const updateStatus = async (suggestion: VenueSuggestion, nextStatus: VenueSuggestion["status"]) => {
    setUpdatingId(suggestion.id);
    try {
      const res = await fetch(`/api/admin/venue-suggestions/${suggestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update suggestion status");
      const updated = await res.json();
      setLocalSuggestions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      console.error("Failed to update suggestion status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b pb-4">
        <h1 className="font-display text-xl font-semibold text-foreground">Заявки на заведения</h1>
        <p className="mt-1 text-xs text-muted-foreground">{filteredSuggestions.length} из {sourceSuggestions.length} · предложения от гостей и пользователей</p>
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
            <Card key={suggestion.id} size="sm" className="rounded-lg shadow-none">
              <CardContent className="p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">{suggestion.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{suggestion.address}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    {STATUS_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={suggestion.status === option.value ? "default" : "outline"}
                        size="xs"
                        disabled={updatingId === suggestion.id}
                        onClick={() => updateStatus(suggestion, option.value)}
                        className="text-[10px]"
                      >
                        {option.label}
                      </Button>
                    ))}
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
                {suggestion.contact && suggestion.status !== "new" && (
                  <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="mb-1 font-semibold text-foreground">Текст ответа</div>
                    {suggestion.status === "converted"
                      ? `Спасибо за заявку «${suggestion.name}». Мы рассмотрели место и добавили его в работу.`
                      : suggestion.status === "rejected"
                        ? `Спасибо за заявку «${suggestion.name}». Мы рассмотрели место, но пока не можем добавить его в каталог.`
                        : `Спасибо за заявку «${suggestion.name}». Мы взяли ее в рассмотрение.`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
