import type React from "react";
import { Check, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Venue, VenueAudit, VenueEvent } from "../../types";
import { VenueAuditView } from "./VenueAuditView";

interface VenueWorkspaceProps {
  editingVenue: Venue;
  selectedVenueAudit: VenueAudit | null;
  selectedVenueAuditLoading: boolean;
  selectedVenueEvents: VenueEvent[];
  saveError: string | null;
  saved: boolean;
  onDeleteVenue: (id: string) => void;
  saveVenue: () => void;
  editor: React.ReactNode;
  eventsEditor: React.ReactNode;
}

export function VenueWorkspace({
  editingVenue,
  selectedVenueAudit,
  selectedVenueAuditLoading,
  selectedVenueEvents,
  saveError,
  saved,
  onDeleteVenue,
  saveVenue,
  editor,
  eventsEditor,
}: VenueWorkspaceProps) {
  const hasContacts = Boolean(
    editingVenue.contacts?.phone ||
    editingVenue.contacts?.telegram ||
    editingVenue.contacts?.instagram ||
    editingVenue.contacts?.vk ||
    editingVenue.contacts?.website,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card size="sm" className="admin-panel-minimal p-4">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate font-display text-base font-semibold text-neutral-100">
                {editingVenue.name || "Новое заведение"}
              </CardTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="border-neutral-800 text-neutral-400">{editingVenue.category}</Badge>
                <Badge variant="outline" className="border-neutral-800 text-neutral-400">{editingVenue.status}</Badge>
                {editingVenue.premiumConfig?.premiumActive && (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-200">Premium</Badge>
                )}
                {hasContacts && <Badge variant="outline" className="border-emerald-900/60 text-emerald-300">Контакты</Badge>}
                {selectedVenueEvents.length > 0 && (
                  <Badge variant="outline" className="border-neutral-800 text-neutral-400">{selectedVenueEvents.length} событий</Badge>
                )}
              </div>
            </div>
            <div className="text-right text-[10px] text-neutral-500">
              <div>ID: {editingVenue.id || "после сохранения"}</div>
              {editingVenue.updatedAt && <div>Обновлено {new Date(editingVenue.updatedAt).toLocaleDateString("ru-RU")}</div>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 px-0 pb-0 sm:grid-cols-4">
          <AuditMiniMetric label="Просмотры" value={selectedVenueAudit?.totals.views ?? 0} loading={selectedVenueAuditLoading} />
          <AuditMiniMetric label="Действия" value={selectedVenueAudit?.totals.actions ?? 0} loading={selectedVenueAuditLoading} />
          <AuditMiniMetric label="Лайки" value={selectedVenueAudit?.totals.likes ?? editingVenue.likesCount ?? 0} loading={selectedVenueAuditLoading} />
          <AuditMiniMetric label="Качество" value={selectedVenueAudit ? `${selectedVenueAudit.quality.score}%` : "—"} loading={selectedVenueAuditLoading} />
        </CardContent>
      </Card>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 bg-neutral-900/80">
          <TabsTrigger value="editor" className="min-h-9 text-xs">Редактор</TabsTrigger>
          <TabsTrigger value="events" className="min-h-9 text-xs">События</TabsTrigger>
          <TabsTrigger value="audit" className="min-h-9 text-xs">Аудит</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-2">
          {editor}
        </TabsContent>

        <TabsContent value="events" className="mt-2">
          {eventsEditor}
        </TabsContent>

        <TabsContent value="audit" className="mt-2">
          <VenueAuditView audit={selectedVenueAudit} loading={selectedVenueAuditLoading} venue={editingVenue} />
        </TabsContent>
      </Tabs>

      {saveError && <div className="rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-rose-200">{saveError}</div>}

      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-neutral-900 bg-neutral-950/95 py-3 backdrop-blur">
        {editingVenue.id && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (confirm("Удалить заведение?")) onDeleteVenue(editingVenue.id);
            }}
            className="admin-danger flex items-center gap-1.5 rounded-xl border px-4 py-2 font-semibold"
          >
            <Trash2 className="h-4 w-4" /> Удалить
          </Button>
        )}
        <Button type="button" variant="outline" onClick={saveVenue} className="admin-primary flex items-center gap-1.5 rounded-xl border px-5 py-2 font-semibold">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Сохранено" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}

function AuditMiniMetric({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-neutral-100">{loading ? "..." : value}</div>
    </div>
  );
}
