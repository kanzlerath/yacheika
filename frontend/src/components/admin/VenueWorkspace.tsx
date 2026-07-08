import type React from "react";
import { Check, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate font-display text-base font-semibold text-foreground">
                {editingVenue.name || "Новое заведение"}
              </CardTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{editingVenue.category}</Badge>
                <Badge variant="outline">{editingVenue.status}</Badge>
                {editingVenue.premiumConfig?.premiumActive && (
                  <Badge variant="secondary">Premium</Badge>
                )}
                {hasContacts && <Badge variant="secondary">Контакты</Badge>}
                {selectedVenueEvents.length > 0 && (
                  <Badge variant="outline">{selectedVenueEvents.length} событий</Badge>
                )}
              </div>
            </div>
            <div className="text-right text-[10px] text-muted-foreground">
              <div>ID: {editingVenue.id || "после сохранения"}</div>
              {editingVenue.updatedAt && <div>Обновлено {new Date(editingVenue.updatedAt).toLocaleDateString("ru-RU")}</div>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-4">
          <AuditMiniMetric label="Просмотры" value={selectedVenueAudit?.totals.views ?? 0} loading={selectedVenueAuditLoading} />
          <AuditMiniMetric label="Действия" value={selectedVenueAudit?.totals.actions ?? 0} loading={selectedVenueAuditLoading} />
          <AuditMiniMetric label="Лайки" value={selectedVenueAudit?.totals.likes ?? editingVenue.likesCount ?? 0} loading={selectedVenueAuditLoading} />
          <AuditMiniMetric label="Качество" value={selectedVenueAudit ? `${selectedVenueAudit.quality.score}%` : "—"} loading={selectedVenueAuditLoading} />
        </CardContent>
      </Card>

      <Tabs defaultValue="editor" className="w-full gap-4">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="editor" className="h-11 flex-none rounded-none px-4 text-sm">Редактор</TabsTrigger>
          <TabsTrigger value="events" className="h-11 flex-none rounded-none px-4 text-sm">События</TabsTrigger>
          <TabsTrigger value="audit" className="h-11 flex-none rounded-none px-4 text-sm">Аудит</TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          {editor}
        </TabsContent>

        <TabsContent value="events">
          {eventsEditor}
        </TabsContent>

        <TabsContent value="audit">
          <VenueAuditView audit={selectedVenueAudit} loading={selectedVenueAuditLoading} venue={editingVenue} />
        </TabsContent>
      </Tabs>

      {saveError && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">{saveError}</div>}

      <Card size="sm" className="sticky bottom-0 p-0 shadow-lg">
        <CardFooter className="justify-end gap-2 bg-card/95 p-3 backdrop-blur">
          {editingVenue.id && (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={() => {
                if (confirm("Удалить заведение?")) onDeleteVenue(editingVenue.id);
              }}
            >
              <Trash2 data-icon="inline-start" /> Удалить
            </Button>
          )}
          <Button type="button" onClick={saveVenue} size="lg">
            {saved ? <Check data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {saved ? "Сохранено" : "Сохранить"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function AuditMiniMetric({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{loading ? "..." : value}</div>
    </div>
  );
}
