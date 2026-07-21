import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { AdminTelegramUser, AdminUserDetail } from "../../types";
import { EmptyLine } from "./AdminShared";

export function UsersView({ users }: { users: AdminTelegramUser[] }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<"all" | "telegram" | "yandex">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(users[0]?.id || null);
  const [detailsByUser, setDetailsByUser] = useState<Record<string, AdminUserDetail>>({});
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesProvider = provider === "all" || (user.provider || "telegram") === provider;
      const matchesQuery = !normalizedQuery || [
        user.id,
        user.username,
        user.firstName,
        user.lastName,
        user.email,
        user.providerUserId,
        user.telegramId || "",
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesProvider && matchesQuery;
    });
  }, [provider, query, users]);
  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) || filteredUsers[0] || null;

  const loadUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    if (detailsByUser[userId]) return;
    setLoadingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error("Failed to load user detail");
      const detail = await res.json();
      setDetailsByUser((prev) => ({ ...prev, [userId]: detail }));
    } catch (error) {
      console.error("Failed to load user detail:", error);
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Пользователи</h1>
          <p className="mt-1 text-xs text-muted-foreground">{filteredUsers.length} из {users.length}</p>
        </div>
        <ToggleGroup type="single" value={provider} onValueChange={(value) => value && setProvider(value as typeof provider)} variant="outline" size="sm" spacing={0}>
          {(["all", "telegram", "yandex"] as const).map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              className="text-[11px]"
            >
              {item === "all" ? "Все" : item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: имя, username, email, id" />

      {filteredUsers.length === 0 ? (
        <EmptyLine>Пользователи не найдены.</EmptyLine>
      ) : (
        <div className="grid min-h-[520px] gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid content-start gap-2">
            {filteredUsers.map((user) => (
              <button key={user.id} type="button" onClick={() => loadUserDetail(user.id)} className="text-left">
                <Card size="sm" className={cn("rounded-lg shadow-none", selectedUser?.id === user.id && "border-foreground/40 bg-muted/40")}>
                  <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_120px_110px] sm:items-center">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">{user.firstName} {user.lastName || ""}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        @{user.username || "без username"} · {user.email || user.providerUserId || user.telegramId}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:justify-end">
                      <Badge variant="outline">{user.provider || "telegram"}</Badge>
                      <Badge variant="outline">{user.reactionsCount} реакций</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground sm:text-right">
                      {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
          <UserDetailPanel
            user={selectedUser}
            detail={selectedUser ? detailsByUser[selectedUser.id] : undefined}
            loading={Boolean(selectedUser && loadingUserId === selectedUser.id)}
            onLoad={() => selectedUser && loadUserDetail(selectedUser.id)}
          />
        </div>
      )}
    </div>
  );
}

function UserDetailPanel({
  user,
  detail,
  loading,
  onLoad,
}: {
  user: AdminTelegramUser | null;
  detail?: AdminUserDetail;
  loading: boolean;
  onLoad: () => void;
}) {
  if (!user) return <EmptyLine>Выберите пользователя.</EmptyLine>;

  return (
    <Card size="sm" className="sticky top-4 h-fit rounded-lg shadow-none">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-foreground">{user.firstName} {user.lastName || ""}</div>
            <div className="truncate text-xs text-muted-foreground">@{user.username || "без username"}</div>
          </div>
          <Badge variant="outline">{user.provider || "telegram"}</Badge>
        </div>

        {!detail && (
          <button type="button" onClick={onLoad} className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            {loading ? "Загружаю сводку..." : "Открыть сводку действий"}
          </button>
        )}

        {detail && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Действия" value={detail.totals.actions} />
              <Metric label="Реакции" value={detail.totals.reactions} />
              <Metric label="Активных дней 30д" value={detail.totals.activeDays30d} />
              <Metric label="Последний визит" value={detail.retention.daysSinceLastSeen === null ? "нет" : `${detail.retention.daysSinceLastSeen} дн.`} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Открытия" value={detail.totals.opens} compact />
              <Metric label="Маршруты" value={detail.totals.routes} compact />
              <Metric label="Лайки" value={detail.totals.likes} compact />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Пойдут на события" value={detail.totals.eventsGoing} compact />
              <Metric label="Не пойдут" value={detail.totals.eventsNotGoing} compact />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Последние действия</div>
              {detail.recentAnalytics.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                  <div className="font-semibold text-foreground">{event.eventType}</div>
                  <div className="text-muted-foreground">{event.venue?.name || "без заведения"} · {new Date(event.timestamp).toLocaleString("ru-RU")}</div>
                </div>
              ))}
              {detail.recentAnalytics.length === 0 && <EmptyLine>Событий пока нет.</EmptyLine>}
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Планы на мероприятия</div>
              {detail.recentAttendance.slice(0, 8).map((attendance) => (
                <div key={attendance.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                  <div className="font-semibold text-foreground">{attendance.status === "going" ? "Пойдёт" : "Не пойдёт"} · {attendance.event?.title || "Событие удалено"}</div>
                  <div className="text-muted-foreground">{attendance.venue?.name || "без заведения"} · {new Date(attendance.updatedAt).toLocaleString("ru-RU")}</div>
                </div>
              ))}
              {detail.recentAttendance.length === 0 && <EmptyLine>Решений по мероприятиям пока нет.</EmptyLine>}
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Реакции</div>
              {detail.recentReactions.slice(0, 8).map((reaction) => (
                <div key={reaction.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                  <div className="font-semibold text-foreground">{reaction.type}{reaction.vibeTag ? ` · ${reaction.vibeTag}` : ""}</div>
                  <div className="text-muted-foreground">{reaction.venue?.name || reaction.venueId} · {new Date(reaction.createdAt).toLocaleString("ru-RU")}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: number | string; compact?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={compact ? "mt-1 text-sm font-semibold text-foreground" : "mt-1 text-base font-semibold text-foreground"}>{value}</div>
    </div>
  );
}
