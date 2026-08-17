"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import { useCatalog } from "@/lib/catalog-context";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { Button, EmptyState, Reveal } from "@/components/ui";
import { FilterPanel, type Filters, EMPTY_FILTERS } from "./filter-panel";

const SORTS = [
  { value: "relevance", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest first" },
  { value: "popular", label: "Most popular" },
  { value: "name", label: "Title A–Z" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

function scoreForQuery(p: Product, needle: string): number {
  if (!needle) return 0;
  const terms = needle.split(/\s+/).filter(Boolean);
  const title = p.title.toLowerCase();
  let score = 0;
  if (title.startsWith(needle)) score += 100;
  else if (title.includes(needle)) score += 60;
  for (const term of terms) {
    if (p.searchTokens.includes(term)) score += 14;
    else if (p.searchTokens.some((t) => t.startsWith(term))) score += 9;
    else if (title.includes(term)) score += 5;
    else if ((p.description ?? "").toLowerCase().includes(term)) score += 2;
    else score -= 8;
  }
  return score;
}

export function ShopPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { products, categories, categoryBySlug, loading, countFor } = useCatalog();

  const categoryParam = params.get("category") ?? "";
  const queryParam = params.get("q") ?? "";
  const sortParam = (params.get("sort") as SortValue) ?? "relevance";

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const deferredQuery = useDeferredValue(queryParam);

  // Reset facet filters when the category changes — a price range that made
  // sense for books is meaningless for stationery.
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
  }, [categoryParam]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/shop${next.toString() ? `?${next}` : ""}`, { scroll: false });
    },
    [params, router],
  );

  /** Products in the active category — the pool the facets are built from. */
  const inCategory = useMemo(
    () => (categoryParam ? products.filter((p) => p.category === categoryParam) : products),
    [products, categoryParam],
  );

  const results = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    let list = inCategory.filter((p) => {
      if (filters.authors.length && !(p.author && filters.authors.includes(p.author))) return false;
      if (filters.languages.length && !(p.language && filters.languages.includes(p.language)))
        return false;
      if (filters.brands.length && !(p.brand && filters.brands.includes(p.brand))) return false;
      if (filters.inStockOnly && (!p.inStock || p.stock <= 0)) return false;
      if (filters.onSaleOnly && p.salePrice == null) return false;
      if (filters.minPrice != null && p.price < filters.minPrice) return false;
      if (filters.maxPrice != null && p.price > filters.maxPrice) return false;
      return true;
    });

    if (needle) {
      list = list
        .map((p) => ({ p, score: scoreForQuery(p, needle) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p);
    }

    const sorted = [...list];
    switch (sortParam) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        sorted.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.title.localeCompare(b.title));
        break;
      case "popular":
        sorted.sort(
          (a, b) =>
            Number(b.badge?.toLowerCase().includes("best") ?? false) -
              Number(a.badge?.toLowerCase().includes("best") ?? false) ||
            b.discountPercent - a.discountPercent,
        );
        break;
      case "name":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        // "relevance" keeps search order; with no query, put featured and
        // discounted titles first so the grid does not open on pens.
        if (!needle) {
          sorted.sort(
            (a, b) =>
              Number(b.featured) - Number(a.featured) ||
              Number(b.category !== "stationery") - Number(a.category !== "stationery") ||
              b.discountPercent - a.discountPercent,
          );
        }
    }
    return sorted;
  }, [inCategory, filters, deferredQuery, sortParam]);

  const activeCategory = categoryParam ? categoryBySlug.get(categoryParam) : null;
  const activeFilterCount =
    filters.authors.length +
    filters.languages.length +
    filters.brands.length +
    (filters.inStockOnly ? 1 : 0) +
    (filters.onSaleOnly ? 1 : 0) +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0);

  return (
    <div className="container-page py-8 lg:py-12">
      {/* Breadcrumbs (FR-2.3) */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-faint">
        <Link href="/" className="transition hover:text-ink">
          Home
        </Link>
        <ChevronRight className="size-3" />
        <Link href="/shop" className={cn("transition hover:text-ink", !activeCategory && "text-ink")}>
          Shop
        </Link>
        {activeCategory && (
          <>
            <ChevronRight className="size-3" />
            <span className="text-ink">{activeCategory.name}</span>
          </>
        )}
      </nav>

      {/* Header */}
      <div className="mt-5 max-w-2xl">
        <h1 className="rule-ornament font-display text-3xl leading-tight font-semibold text-ink sm:text-4xl">
          {queryParam
            ? `Results for “${queryParam}”`
            : (activeCategory?.name ?? "The whole collection")}
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
          {queryParam
            ? `${results.length} ${results.length === 1 ? "match" : "matches"} found.`
            : (activeCategory?.description ??
              "Every title and product we stock — Buddhist literature, Ambedkar Sahitya, biographies, exam guides, Chivar, statues and stationery.")}
        </p>
      </div>

      {/* Category pills */}
      <div className="no-scrollbar -mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setParam("category", null)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
            !categoryParam
              ? "border-saffron bg-saffron text-white"
              : "border-rule bg-paper-raised text-ink-soft hover:border-saffron/50 hover:text-ink",
          )}
        >
          All <span className="ml-1 opacity-60">{products.length}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setParam("category", c.slug)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
              categoryParam === c.slug
                ? "border-saffron bg-saffron text-white"
                : "border-rule bg-paper-raised text-ink-soft hover:border-saffron/50 hover:text-ink",
            )}
          >
            {c.shortName} <span className="ml-1 opacity-60">{countFor(c.slug)}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-rule py-3">
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPanelOpen(true)}
            className="lg:hidden"
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex size-4.5 items-center justify-center rounded-full bg-saffron text-[0.625rem] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <p className="text-[0.8125rem] text-ink-faint">
            <span className="font-semibold text-ink">{results.length}</span>{" "}
            {results.length === 1 ? "product" : "products"}
          </p>
          {queryParam && (
            <button
              type="button"
              onClick={() => setParam("q", null)}
              className="flex items-center gap-1 rounded-full bg-paper-sunk px-2.5 py-1 text-xs text-ink-soft transition hover:text-ink"
            >
              “{queryParam}” <X className="size-3" />
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-[0.8125rem] text-ink-faint">
          Sort
          <select
            value={sortParam}
            onChange={(e) => setParam("sort", e.target.value === "relevance" ? null : e.target.value)}
            className="cursor-pointer rounded-lg border border-rule bg-paper-raised px-2.5 py-1.5 text-[0.8125rem] text-ink transition focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/25"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Body */}
      <div className="mt-8 flex gap-10">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-28">
            <FilterPanel pool={inCategory} filters={filters} onChange={setFilters} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={<SlidersHorizontal className="size-6" />}
              title="Nothing matches those filters"
              description="Try clearing a filter or searching for an author or title instead."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    router.push("/shop");
                  }}
                >
                  Clear everything
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-11 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 8) * 45}>
                  <ProductCard product={p} priority={i < 4} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {panelOpen && (
        <div className="fixed inset-0 z-[85] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-rule bg-paper-raised p-5"
            style={{ animation: "rise 0.3s var(--ease-paper)" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Filters</h2>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
                aria-label="Close filters"
              >
                <X className="size-5" />
              </button>
            </div>
            <FilterPanel pool={inCategory} filters={filters} onChange={setFilters} />
            <Button full className="mt-6" onClick={() => setPanelOpen(false)}>
              Show {results.length} {results.length === 1 ? "product" : "products"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
