import { AdminDashboard, AnalyticsEvent, Venue } from "../../types";
import { AdminBlock, EmptyLine, Metric } from "./AdminShared";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardView({ dashboard, analytics, venues }: { dashboard: AdminDashboard | null; analytics: AnalyticsEvent[]; venues: Venue[] }) {
  const totals = dashboard?.totals;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Дашборд</h2>
        <p className="text-xs text-muted-foreground">Сводка по аудитории, заведениям и действиям пользователей.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Пользователи" value={totals?.users ?? 0} note={`+${totals?.newUsers7d ?? 0} за 7 дней`} />
        <Metric label="Заведения" value={totals?.venues ?? venues.length} note={`${totals?.publishedVenues ?? 0} опубликовано`} />
        <Metric label="Действия за 24ч" value={totals?.analytics24h ?? 0} note={`${totals?.analytics7d ?? 0} за 7 дней`} />
        <Metric label="Реакции" value={totals?.reactions ?? 0} note={`${totals?.events ?? 0} событий`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminBlock title="Топ заведений за неделю">
          {(dashboard?.topVenues || []).length === 0 ? (
            <EmptyLine>Пока нет событий аналитики.</EmptyLine>
          ) : (
            <div className="flex flex-col gap-2">
              {dashboard?.topVenues.map((venue) => (
                <Card key={venue.venueId} size="sm">
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">{venue.name}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">Открытия {venue.opens} · Маршруты {venue.routes} · Соц/тел {venue.socials}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-foreground">{venue.total}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </AdminBlock>

        <AdminBlock title="Что проверить">
          {(dashboard?.incompleteVenues || []).length === 0 ? (
            <EmptyLine>Критичных пропусков не видно.</EmptyLine>
          ) : (
            <div className="flex flex-col gap-2">
              {dashboard?.incompleteVenues.map((venue) => (
                <Card key={venue.id} size="sm">
                  <CardContent className="p-3">
                    <div className="font-semibold text-foreground">{venue.name}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{venue.issues.join(", ")}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </AdminBlock>
      </div>

      <AdminBlock title="Последние действия">
        <ActivityFeed analytics={analytics} venues={venues} />
      </AdminBlock>
    </div>
  );
}

function ActivityFeed({ analytics, venues }: { analytics: AnalyticsEvent[]; venues: Venue[] }) {
  return (
    <div className="max-h-72 overflow-y-auto">
      {analytics.length === 0 ? <EmptyLine>Пока нет действий.</EmptyLine> : (
        <div className="flex flex-col gap-2">
          {analytics.slice(0, 24).map((event) => (
            <div key={event.id} className="grid gap-1 rounded-lg border bg-muted/30 p-3 text-[11px] sm:grid-cols-[150px_minmax(0,1fr)_90px] sm:items-center">
              <span className="font-semibold text-foreground">{formatEventType(event.eventType)}</span>
              <span className="min-w-0 truncate text-muted-foreground">{venues.find((venue) => venue.id === event.venueId)?.name || event.venueId || "global"}</span>
              <span className="text-muted-foreground sm:text-right">{new Date(event.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatEventType(eventType: AnalyticsEvent["eventType"] | string) {
  const labels: Record<string, string> = {
    open_venue: "Карточка",
    open_route: "Маршрут",
    click_phone: "Телефон",
    click_social: "Соцсеть",
    open_event: "Событие",
    like: "Лайк",
    reaction: "Реакция",
  };
  return labels[eventType] || eventType;
}
