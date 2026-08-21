"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_SETTINGS,
  subscribeBanners,
  subscribeCategories,
  subscribeProducts,
  subscribeSettings,
} from "./repo";
import type { Banner, Category, Product, StoreSettings } from "./types";
import { decodeSlugParam } from "./utils";

interface CatalogValue {
  products: Product[];
  categories: Category[];
  banners: Banner[];
  settings: StoreSettings;
  loading: boolean;
  /** "fallback" means Firestore has no products yet. */
  source: "firestore" | "fallback";
  byId: Map<string, Product>;
  bySlug: Map<string, Product>;
  categoryBySlug: Map<string, Category>;
  countFor: (categorySlug: string) => number;
}

const CatalogContext = createContext<CatalogValue | null>(null);

/**
 * One subscription for the whole app. Every storefront page reads from here
 * rather than querying Firestore itself, which keeps document reads low and
 * means an admin edit repaints the shop instantly.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [source, setSource] = useState<"firestore" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      subscribeProducts((next, src) => {
        setProducts(next);
        setSource(src);
        setLoading(false);
      }),
      subscribeCategories(setCategories),
      subscribeBanners(setBanners),
      subscribeSettings(setSettings),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const value = useMemo<CatalogValue>(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const bySlug = new Map(products.map((p) => [decodeSlugParam(p.slug), p]));
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);

    return {
      products,
      categories,
      banners,
      settings,
      loading,
      source,
      byId,
      bySlug,
      categoryBySlug,
      countFor: (slug: string) => counts.get(slug) ?? 0,
    };
  }, [products, categories, banners, settings, loading, source]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}
