import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AdminTelegramUser } from "../../types";
import { EmptyLine } from "./AdminShared";

export function UsersView({ users }: { users: AdminTelegramUser[] }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<"all" | "telegram" | "yandex">("all");
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Пользователи</h2>
          <p className="text-xs text-muted-foreground">{filteredUsers.length} из {users.length}</p>
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
        <div className="grid gap-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} size="sm">
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
          ))}
        </div>
      )}
    </div>
  );
}
