import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UserFeedback } from "../../types";
import { EmptyLine } from "./AdminShared";

type FeedbackFilter = "all" | UserFeedback["status"];

const statusLabel: Record<UserFeedback["status"], string> = {
  new: "Новое",
  reviewed: "В работе",
  closed: "Закрыто",
};

const kindLabel: Record<UserFeedback["kind"], string> = {
  idea: "Идея",
  bug: "Ошибка",
  other: "Другое",
};

export function FeedbackView({ feedback }: { feedback: UserFeedback[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FeedbackFilter>("all");
  const [localFeedback, setLocalFeedback] = useState(feedback);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalFeedback(feedback);
  }, [feedback]);

  const filteredFeedback = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return localFeedback.filter((item) => {
      const matchesStatus = status === "all" || item.status === status;
      const matchesQuery = !normalizedQuery || [item.message, item.contact, item.userName, item.userId]
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [localFeedback, query, status]);

  const updateStatus = async (item: UserFeedback, nextStatus: UserFeedback["status"]) => {
    setUpdatingId(item.id);
    try {
      const response = await fetch(`/api/admin/feedback/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error("Failed to update feedback status");
      const updated = await response.json();
      setLocalFeedback((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (error) {
      console.error("Failed to update feedback status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Обращения</h2>
        <p className="text-xs text-muted-foreground">{filteredFeedback.length} из {localFeedback.length} · идеи, ошибки и вопросы от пользователей</p>
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: текст, пользователь, контакт" />
        <ToggleGroup type="single" value={status} onValueChange={(value) => value && setStatus(value as FeedbackFilter)} variant="outline" size="sm" spacing={0} className="grid w-full grid-cols-4">
          <ToggleGroupItem value="all" className="text-[10px]">Все</ToggleGroupItem>
          <ToggleGroupItem value="new" className="text-[10px]">Новые</ToggleGroupItem>
          <ToggleGroupItem value="reviewed" className="text-[10px]">В работе</ToggleGroupItem>
          <ToggleGroupItem value="closed" className="text-[10px]">Закрыто</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {filteredFeedback.length === 0 ? (
        <EmptyLine>Обращений по этим параметрам нет.</EmptyLine>
      ) : (
        <div className="grid gap-2">
          {filteredFeedback.map((item) => (
            <Card key={item.id} size="sm">
              <CardContent className="p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{kindLabel[item.kind]}</Badge>
                      <Badge variant="outline">{statusLabel[item.status]}</Badge>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span>{item.userName || item.userId}</span>
                      {item.contact && <span>{item.contact}</span>}
                      <span>{new Date(item.createdAt).toLocaleString("ru-RU")}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap content-start gap-1 sm:justify-end">
                    {(["new", "reviewed", "closed"] as const).map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        type="button"
                        variant={item.status === nextStatus ? "default" : "outline"}
                        size="xs"
                        disabled={updatingId === item.id}
                        onClick={() => updateStatus(item, nextStatus)}
                        className="text-[10px]"
                      >
                        {statusLabel[nextStatus]}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
