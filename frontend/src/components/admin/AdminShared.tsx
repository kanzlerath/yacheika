import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminBlock({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="font-display text-sm font-semibold text-foreground">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

export function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <Empty className="rounded-lg border border-dashed p-4 text-center text-xs">
      <EmptyDescription>{children}</EmptyDescription>
    </Empty>
  );
}

export function Metric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <Card size="sm">
      <CardContent className="pt-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
        <div className="mt-1 text-[10px] text-muted-foreground">{note}</div>
      </CardContent>
    </Card>
  );
}

export function AdminSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => {
            const normalized = typeof option === "string" ? { value: option, label: option } : option;
            return (
              <SelectItem key={normalized.value} value={normalized.value}>
                {normalized.label}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
