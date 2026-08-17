import catalogJson from "@/data/catalog.json";
import type { Category, Product } from "./types";

/**
 * The catalog migrated off the legacy site, baked into the bundle.
 *
 * It is used in two situations:
 *   1. Firestore has not been seeded yet (fresh clone / first run), so the shop
 *      still renders instead of showing an empty store.
 *   2. Firestore is briefly unreachable — we prefer stale products to a blank
 *      page.
 *
 * Once `products` exists in Firestore it always wins.
 */

type RawProduct = (typeof catalogJson)["products"][number];
type RawCategory = (typeof catalogJson)["categories"][number];

function toProduct(raw: RawProduct): Product {
  return {
    ...raw,
    id: raw.slug,
    subtitle: raw.subtitle ?? null,
    badge: raw.badge ?? null,
    image: raw.image ?? null,
    salePrice: raw.salePrice ?? null,
    author: raw.author ?? null,
    language: raw.language ?? null,
    publisher: raw.publisher ?? null,
    binding: raw.binding ?? null,
    brand: raw.brand ?? null,
    material: raw.material ?? null,
    care: raw.care ?? null,
    sizeGuide: raw.sizeGuide ?? null,
    rating: raw.rating ?? null,
  } as Product;
}

function toCategory(raw: RawCategory): Category {
  return { ...raw, id: raw.slug };
}

export const FALLBACK_PRODUCTS: Product[] = catalogJson.products.map(toProduct);
export const FALLBACK_CATEGORIES: Category[] = catalogJson.categories
  .map(toCategory)
  .sort((a, b) => a.order - b.order);

export const CATALOG_GENERATED_AT = catalogJson.generatedAt;
