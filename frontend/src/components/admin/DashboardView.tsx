import { AdminDashboard, AnalyticsEvent, Venue } from "../../types";
import { AdminBlock, EmptyLine, Metric } from "./AdminShared";
import { Badge } from "@/components/ui/badge";

export function DashboardView({ dashboard, analytics, venues }: { dashboard: AdminDashboard | null; analytics: AnalyticsEvent[]; venues: Venue[] }) {
  const totals = dashboard?.totals;
  return (
    <div className="flex flex-col gap-6">
      <div className="border-b pb-4">
        <h1 className="font-display text-xl font-semibold text-foreground">Дашборд</h1>
        <p className="mt-1 text-xs text-muted-foreground">Сводка по аудитории, заведениям и действиям пользователей.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Пользователи" value={totals?.users ?? 0} note={`+${totals?.newUsers7d ?? 0} за 7 дней`} />
        <Metric label="Заведения" value={totals?.venues ?? venues.length} note={`${totals?.publishedVenues ?? 0} опубликовано`} />
        <Metric label="Действия за 24ч" value={totals?.analytics24h ?? 0} note={`${totals?.analytics7d ?? 0} за 7 дней`} />
        <Metric label="Реакции" value={totals?.reactions ?? 0} note={`${totals?.events ?? 0} событий`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <AdminBlock title="Топ заведений за неделю">
          {(dashboard?.topVenues || []).length === 0 ? (
            <EmptyLine>Пока нет событий аналитики.</EmptyLine>
          ) : (
            <div className="divide-y rounded-lg border">
              {dashboard?.topVenues.map((venue, index) => (
                <div key={venue.venueId} className="grid grid-cols-[28px_minmax(0,1fr)_52px] items-center gap-3 px-3 py-3">
                  <span className="text-center font-mono text-[10px] text-muted-foreground">{index + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">{venue.name}</div>
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">Открытия {venue.opens} · Маршруты {venue.routes} · Соц/тел {venue.socials}</div>
                  </div>
                  <div className="text-right text-sm font-semibold text-foreground">{venue.total}</div>
                </div>
              ))}
            </div>
          )}
        </AdminBlock>

        <AdminBlock title="Что проверить">
          {(dashboard?.incompleteVenues || []).length === 0 ? (
            <EmptyLine>Критичных пропусков не видно.</EmptyLine>
          ) : (
            <div className="divide-y rounded-lg border">
              {dashboard?.incompleteVenues.map((venue) => (
                <div key={venue.id} className="px-3 py-3">
                  <div className="font-semibold text-foreground">{venue.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {venue.issues.map((issue) => <Badge key={issue} variant="outline" className="text-[10px]">{issue}</Badge>)}
                  </div>
                </div>
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
    <div className="max-h-80 overflow-y-auto rounded-lg border">
      {analytics.length === 0 ? <EmptyLine>Пока нет действий.</EmptyLine> : (
        <div className="divide-y">
          {analytics.slice(0, 24).map((event) => (
            <div key={event.id} className="grid gap-1 px-3 py-2.5 text-[11px] sm:grid-cols-[150px_minmax(0,1fr)_90px] sm:items-center">
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
