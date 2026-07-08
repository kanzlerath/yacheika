import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
        <h2 className="font-display text-lg font-semibold text-neutral-100">Заявки на заведения</h2>
        <p className="text-xs text-neutral-500">{filteredSuggestions.length} из {suggestions.length} · предложения от гостей и пользователей</p>
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} className="admin-input" placeholder="Поиск: название, адрес, контакт" />
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-neutral-900 bg-neutral-950 p-1 sm:grid-cols-5">
          {(["all", "new", "reviewed", "rejected", "converted"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${status === item ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-200"}`}
            >
              {item === "all" ? "Все" : item}
            </button>
          ))}
        </div>
      </div>

      {filteredSuggestions.length === 0 ? (
        <EmptyLine>Заявок по этим фильтрам нет.</EmptyLine>
      ) : (
        <div className="grid gap-2">
          {filteredSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="venue-soft-panel p-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-neutral-100">{suggestion.name}</div>
                  <div className="mt-1 text-xs text-neutral-400">{suggestion.address}</div>
                </div>
                <div className="sm:text-right">
                  <Badge variant="outline" className="border-neutral-800 text-neutral-500">{suggestion.status}</Badge>
                </div>
              </div>
              {(suggestion.comment || suggestion.contact) && (
                <div className="mt-3 flex flex-col gap-1 border-t border-neutral-900 pt-3 text-xs text-neutral-400">
                  {suggestion.comment && <div>{suggestion.comment}</div>}
                  {suggestion.contact && <div className="font-mono text-neutral-500">Контакт: {suggestion.contact}</div>}
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-neutral-600">
                <span>{suggestion.userName || "гость"}</span>
                <span>{new Date(suggestion.createdAt).toLocaleString("ru-RU")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
