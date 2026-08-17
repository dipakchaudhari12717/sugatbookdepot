"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  tone?: "neutral" | "saffron" | "leaf" | "maroon";
}) {
  const tones = {
    neutral: "text-ink",
    saffron: "text-saffron-deep",
    leaf: "text-leaf",
    maroon: "text-maroon",
  };
  return (
    <div className="rounded-2xl border border-rule bg-paper-raised p-5 shadow-page">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          {label}
        </p>
        {icon && <span className="shrink-0 text-ink-faint">{icon}</span>}
      </div>
      <p className={cn("mt-3 font-display text-3xl font-semibold tabular-nums", tones[tone])}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

/** Horizontally scrollable table wrapper so wide admin tables never break the page. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-rule bg-paper-raised shadow-page">
      <table className="w-full min-w-max text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-rule px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-faint",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-rule/60 px-4 py-3 text-ink-soft", className)}>{children}</td>;
}
