"use client";

import { useMemo } from "react";

import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

export interface Filters {
  authors: string[];
  languages: string[];
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  authors: [],
  languages: [],
  brands: [],
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  onSaleOnly: false,
};

/** Price buckets are derived from the pool so they stay meaningful per category. */
function priceBuckets(pool: Product[]) {
  if (!pool.length) return [];
  const max = Math.max(...pool.map((p) => p.price));
  if (max <= 100) return [
    { label: "Under ₹25", min: null, max: 25 },
    { label: "₹25 – ₹50", min: 25, max: 50 },
    { label: "₹50 – ₹100", min: 50, max: 100 },
  ];
  if (max <= 600) return [
    { label: "Under ₹100", min: null, max: 100 },
    { label: "₹100 – ₹250", min: 100, max: 250 },
    { label: "₹250 – ₹500", min: 250, max: 500 },
    { label: "Over ₹500", min: 500, max: null },
  ];
  return [
    { label: "Under ₹100", min: null, max: 100 },
    { label: "₹100 – ₹500", min: 100, max: 500 },
    { label: "₹500 – ₹1,000", min: 500, max: 1000 },
    { label: "Over ₹1,000", min: 1000, max: null },
  ];
}

function tally(pool: Product[], pick: (p: Product) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const p of pool) {
    const key = pick(p);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-rule pb-5 last:border-b-0 last:pb-0">
      <h3 className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 py-0.5">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? "border-saffron bg-saffron text-white"
            : "border-rule-strong bg-paper-raised group-hover:border-saffron/60",
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M2 6.2 4.7 9 10 3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1 text-[0.8125rem] leading-snug text-ink-soft transition group-hover:text-ink">
        {label}
      </span>
      {count != null && <span className="text-[0.6875rem] text-ink-faint">{count}</span>}
    </label>
  );
}

export function FilterPanel({
  pool,
  filters,
  onChange,
}: {
  pool: Product[];
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const authors = useMemo(() => tally(pool, (p) => p.author), [pool]);
  const languages = useMemo(() => tally(pool, (p) => p.language), [pool]);
  const brands = useMemo(() => tally(pool, (p) => p.brand), [pool]);
  const buckets = useMemo(() => priceBuckets(pool), [pool]);

  const range = useMemo(() => {
    if (!pool.length) return null;
    const prices = pool.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [pool]);

  function toggle(key: "authors" | "languages" | "brands", value: string) {
    const list = filters[key];
    onChange({
      ...filters,
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    });
  }

  const anyActive =
    filters.authors.length ||
    filters.languages.length ||
    filters.brands.length ||
    filters.inStockOnly ||
    filters.onSaleOnly ||
    filters.minPrice != null ||
    filters.maxPrice != null;

  return (
    <div className="space-y-5">
      {anyActive ? (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-xs font-medium text-saffron-deep transition hover:text-maroon"
        >
          Clear all filters
        </button>
      ) : null}

      <Group title="Availability">
        <CheckRow
          label="In stock only"
          checked={filters.inStockOnly}
          onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
        />
        <CheckRow
          label="On offer"
          checked={filters.onSaleOnly}
          onChange={() => onChange({ ...filters, onSaleOnly: !filters.onSaleOnly })}
        />
      </Group>

      {buckets.length > 0 && (
        <Group title="Price">
          {buckets.map((b) => {
            const active = filters.minPrice === b.min && filters.maxPrice === b.max;
            return (
              <CheckRow
                key={b.label}
                label={b.label}
                checked={active}
                onChange={() =>
                  onChange(
                    active
                      ? { ...filters, minPrice: null, maxPrice: null }
                      : { ...filters, minPrice: b.min, maxPrice: b.max },
                  )
                }
              />
            );
          })}
          {range && (
            <p className="pt-1 text-[0.6875rem] text-ink-faint">
              This selection: {formatPrice(range.min)} – {formatPrice(range.max)}
            </p>
          )}
        </Group>
      )}

      {authors.length > 0 && (
        <Group title="Author">
          {authors.map(([name, count]) => (
            <CheckRow
              key={name}
              label={name}
              count={count}
              checked={filters.authors.includes(name)}
              onChange={() => toggle("authors", name)}
            />
          ))}
        </Group>
      )}

      {languages.length > 0 && (
        <Group title="Language">
          {languages.map(([name, count]) => (
            <CheckRow
              key={name}
              label={name}
              count={count}
              checked={filters.languages.includes(name)}
              onChange={() => toggle("languages", name)}
            />
          ))}
        </Group>
      )}

      {brands.length > 0 && (
        <Group title="Brand">
          {brands.map(([name, count]) => (
            <CheckRow
              key={name}
              label={name}
              count={count}
              checked={filters.brands.includes(name)}
              onChange={() => toggle("brands", name)}
            />
          ))}
        </Group>
      )}
    </div>
  );
}
