import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
          <h2 className="font-display text-lg font-semibold text-neutral-100">Пользователи</h2>
          <p className="text-xs text-neutral-500">{filteredUsers.length} из {users.length}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-neutral-900 bg-neutral-950 p-1">
          {(["all", "telegram", "yandex"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setProvider(item)}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${provider === item ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-200"}`}
            >
              {item === "all" ? "Все" : item}
            </button>
          ))}
        </div>
      </div>

      <Input value={query} onChange={(event) => setQuery(event.target.value)} className="admin-input" placeholder="Поиск: имя, username, email, id" />

      {filteredUsers.length === 0 ? (
        <EmptyLine>Пользователи не найдены.</EmptyLine>
      ) : (
        <div className="grid gap-2">
          {filteredUsers.map((user) => (
            <div key={user.id} className="venue-soft-panel grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_120px_110px] sm:items-center">
              <div className="min-w-0">
                <div className="truncate font-semibold text-neutral-100">{user.firstName} {user.lastName || ""}</div>
                <div className="truncate text-[10px] text-neutral-500">
                  @{user.username || "без username"} · {user.email || user.providerUserId || user.telegramId}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 sm:justify-end">
                <Badge variant="outline" className="border-neutral-800 text-neutral-400">{user.provider || "telegram"}</Badge>
                <Badge variant="outline" className="border-neutral-800 text-neutral-400">{user.reactionsCount} реакций</Badge>
              </div>
              <div className="text-[10px] text-neutral-500 sm:text-right">
                {new Date(user.createdAt).toLocaleDateString("ru-RU")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
