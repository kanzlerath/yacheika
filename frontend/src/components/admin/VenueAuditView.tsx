import type React from "react";
import {
  BarChart3,
  Check,
  Eye,
  MousePointerClick,
  PhoneCall,
  Route,
  ThumbsUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { AnalyticsEvent, Venue, VenueAudit } from "../../types";

export function VenueAuditView({ audit, loading, venue }: { audit: VenueAudit | null; loading: boolean; venue: Venue }) {
  if (!venue.id) {
    return <AuditBlock title="Аудит карточки"><EmptyLine>Сначала сохраните заведение, потом появится аудит.</EmptyLine></AuditBlock>;
  }

  if (loading) {
    return <AuditBlock title="Аудит карточки"><EmptyLine>Загружаю аудит карточки...</EmptyLine></AuditBlock>;
  }

  if (!audit) {
    return <AuditBlock title="Аудит карточки"><EmptyLine>Не удалось загрузить аудит. Попробуйте открыть карточку заново.</EmptyLine></AuditBlock>;
  }

  const latestDaily = audit.daily.slice(-14);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AuditMetric icon={Eye} label="Просмотры" value={audit.totals.views} note={`${audit.periods.last7d.views} за 7 дней`} />
        <AuditMetric icon={MousePointerClick} label="Действия" value={audit.totals.actions} note={`${formatPercent(audit.totals.conversionRate)} конверсия`} />
        <AuditMetric icon={ThumbsUp} label="Реакции" value={audit.totals.likes + audit.totals.notMyPlace + audit.totals.vibeTags} note={`${audit.totals.likes} лайков`} />
        <AuditMetric icon={Users} label="Пользователи" value={audit.totals.uniqueUsers} note="уникальные авторизованные" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AuditBlock title="Воронка действий">
          <div className="grid gap-2 sm:grid-cols-4">
            <FunnelItem icon={Eye} label="Открыли" value={audit.totals.views} />
            <FunnelItem icon={Route} label="Маршрут" value={audit.totals.routes} />
            <FunnelItem icon={PhoneCall} label="Телефон" value={audit.totals.phoneClicks} />
            <FunnelItem icon={BarChart3} label="Соцсети/ивенты" value={audit.totals.socialClicks + audit.totals.eventOpens} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <PeriodBox title="7 дней" period={audit.periods.last7d} />
            <PeriodBox title="30 дней" period={audit.periods.last30d} />
          </div>
        </AuditBlock>

        <AuditBlock title={`Качество карточки: ${audit.quality.score}%`}>
          <div className="flex flex-col gap-2">
            {audit.quality.checks.map((check) => (
              <div key={check.id} className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {check.ok ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <TriangleAlert className="h-3.5 w-3.5 text-amber-300" />}
                    <div className="truncate text-xs font-semibold text-neutral-200">{check.label}</div>
                  </div>
                  <Badge variant="outline" className="border-neutral-800 text-[10px] text-neutral-500">
                    {check.ok ? "ok" : check.severity}
                  </Badge>
                </div>
                <div className="mt-1 pl-5 text-[10px] leading-relaxed text-neutral-500">{check.detail}</div>
              </div>
            ))}
          </div>
        </AuditBlock>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AuditBlock title="Динамика за 14 дней">
          {latestDaily.length === 0 ? (
            <EmptyLine>Пока нет дневной динамики.</EmptyLine>
          ) : (
            <div className="flex flex-col gap-2">
              {latestDaily.map((day) => {
                const max = Math.max(1, ...latestDaily.map((item) => item.views + item.routes + item.phoneClicks + item.socialClicks + item.eventOpens));
                const total = day.views + day.routes + day.phoneClicks + day.socialClicks + day.eventOpens;
                return (
                  <div key={day.date} className="grid grid-cols-[80px_minmax(0,1fr)_44px] items-center gap-2 text-[11px]">
                    <span className="font-mono text-neutral-500">{day.date.slice(5)}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-900">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(4, (total / max) * 100)}%` }} />
                    </div>
                    <span className="text-right text-neutral-400">{total}</span>
                  </div>
                );
              })}
            </div>
          )}
        </AuditBlock>

        <AuditBlock title="Vibe реакции">
          {audit.reactions.vibeTags.length === 0 ? (
            <EmptyLine>Vibe-тегов пока нет.</EmptyLine>
          ) : (
            <div className="flex flex-col gap-2">
              {audit.reactions.vibeTags.slice(0, 10).map((item) => (
                <div key={item.tag} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-900 bg-neutral-950/40 px-3 py-2">
                  <span className="truncate text-xs font-semibold text-neutral-200">{item.tag}</span>
                  <Badge variant="outline" className="border-neutral-800 text-neutral-400">{item.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </AuditBlock>
      </div>

      <AuditBlock title="Последние действия по карточке">
        <div className="max-h-80 overflow-y-auto">
          {audit.recentAnalytics.length === 0 ? (
            <EmptyLine>Действий пока нет.</EmptyLine>
          ) : (
            <div className="flex flex-col gap-2">
              {audit.recentAnalytics.map((event) => (
                <div key={event.id} className="grid gap-1 rounded-lg border border-neutral-900 bg-neutral-950/40 p-3 sm:grid-cols-[160px_minmax(0,1fr)_150px] sm:items-center">
                  <div className="text-xs font-semibold text-neutral-200">{formatEventType(event.eventType)}</div>
                  <div className="min-w-0 truncate font-mono text-[10px] text-neutral-500">
                    {event.userId || "anonymous"} {event.metadata ? `· ${JSON.stringify(event.metadata)}` : ""}
                  </div>
                  <div className="text-[10px] text-neutral-600 sm:text-right">{new Date(event.timestamp).toLocaleString("ru-RU")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AuditBlock>
    </div>
  );
}

function AuditBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="sm" className="admin-panel-minimal p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="font-display text-sm font-semibold text-neutral-100">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {children}
      </CardContent>
    </Card>
  );
}

function AuditMetric({ icon: Icon, label, value, note }: { icon: React.ElementType; label: string; value: number; note: string }) {
  return (
    <Card size="sm" className="venue-soft-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
        <Icon className="h-4 w-4 text-neutral-500" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-neutral-100">{value}</div>
      <div className="mt-1 text-[10px] text-neutral-500">{note}</div>
    </Card>
  );
}

function FunnelItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
        <Icon className="h-3.5 w-3.5 text-neutral-500" />
      </div>
      <div className="mt-2 text-lg font-semibold text-neutral-100">{value}</div>
    </div>
  );
}

function PeriodBox({ title, period }: { title: string; period: VenueAudit["periods"]["last7d"] }) {
  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-3">
      <div className="text-xs font-semibold text-neutral-200">{title}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-neutral-500">
        <span>Просмотры: <b className="text-neutral-300">{period.views}</b></span>
        <span>Действия: <b className="text-neutral-300">{period.actions}</b></span>
        <span>Маршруты: <b className="text-neutral-300">{period.routes}</b></span>
        <span>Контакты: <b className="text-neutral-300">{period.phoneClicks + period.socialClicks}</b></span>
      </div>
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <Empty className="rounded-lg border border-dashed border-neutral-900 p-4 text-center text-xs text-neutral-500">
      <EmptyDescription>{children}</EmptyDescription>
    </Empty>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatEventType(eventType: AnalyticsEvent["eventType"] | string) {
  const labels: Record<string, string> = {
    open_venue: "Открытие карточки",
    open_route: "Маршрут",
    click_phone: "Клик по телефону",
    click_social: "Клик по соцсети",
    open_event: "Открытие события",
    like: "Лайк",
    reaction: "Реакция",
  };
  return labels[eventType] || eventType;
}
