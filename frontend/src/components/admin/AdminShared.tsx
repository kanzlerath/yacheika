import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";

export function AdminBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="sm" className="admin-panel-minimal flex flex-col gap-3 p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="font-display text-sm font-semibold text-neutral-100">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {children}
      </CardContent>
    </Card>
  );
}

export function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <Empty className="rounded-lg border border-dashed border-neutral-900 p-4 text-center text-xs text-neutral-500">
      <EmptyDescription>{children}</EmptyDescription>
    </Empty>
  );
}

export function Metric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <Card size="sm" className="venue-soft-panel p-4">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-neutral-100">{value}</div>
      <div className="mt-1 text-[10px] text-neutral-500">{note}</div>
    </Card>
  );
}
