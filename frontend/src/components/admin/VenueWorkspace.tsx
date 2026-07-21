import type React from "react";
import { Check, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Venue } from "../../types";

interface VenueWorkspaceProps {
  editingVenue: Venue;
  title: string;
  description: string;
  saveError: string | null;
  saved: boolean;
  showActions?: boolean;
  onDeleteVenue: (id: string) => void;
  saveVenue: () => void;
  children: React.ReactNode;
}

export function VenueWorkspace({
  editingVenue,
  title,
  description,
  saveError,
  saved,
  showActions = false,
  onDeleteVenue,
  saveVenue,
  children,
}: VenueWorkspaceProps) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-xl font-semibold text-foreground">
              {title}
            </h1>
            {editingVenue.id && <Badge variant="outline">{editingVenue.category}</Badge>}
            {editingVenue.id && <Badge variant="outline">{editingVenue.status}</Badge>}
            {editingVenue.premiumConfig?.premiumActive && <Badge variant="secondary">Premium</Badge>}
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="shrink-0 text-left text-[10px] text-muted-foreground sm:text-right">
          <div>{editingVenue.name || "Черновик нового заведения"}</div>
          {editingVenue.id && <div>ID: {editingVenue.id}</div>}
        </div>
      </header>

      {children}

      {saveError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
          {saveError}
        </div>
      )}

      {showActions && (
        <Card size="sm" className="sticky bottom-0 z-10 p-0 shadow-lg">
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
      )}
    </div>
  );
}
