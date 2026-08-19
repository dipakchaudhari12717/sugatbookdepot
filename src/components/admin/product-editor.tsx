"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, GripVertical, ImageOff, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCatalog } from "@/lib/catalog-context";
import { saveProduct } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Product, ProductOption } from "@/lib/types";
import { cn, formatPrice, slugify } from "@/lib/utils";
import { Button, Card, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { PageHeader } from "./admin-ui";

/** Everything the form edits. Kept separate from `Product` so drafts can be partial. */
interface Draft {
  title: string;
  slug: string;
  sku: string;
  subtitle: string;
  badge: string;
  category: string;
  descriptionHtml: string;
  images: string[];
  mrp: string;
  salePrice: string;
  stock: string;
  author: string;
  language: string;
  publisher: string;
  binding: string;
  brand: string;
  material: string;
  care: string;
  tags: string;
  featured: boolean;
  bulkEnquiry: boolean;
  options: ProductOption[];
}

const EMPTY: Draft = {
  title: "",
  slug: "",
  sku: "",
  subtitle: "",
  badge: "",
  category: "buddhism",
  descriptionHtml: "",
  images: [],
  mrp: "",
  salePrice: "",
  stock: "10",
  author: "",
  language: "",
  publisher: "",
  binding: "",
  brand: "",
  material: "",
  care: "",
  tags: "",
  featured: false,
  bulkEnquiry: false,
  options: [],
};

function toDraft(p: Product): Draft {
  return {
    title: p.title,
    slug: p.slug,
    sku: p.sku ?? "",
    subtitle: p.subtitle ?? "",
    badge: p.badge ?? "",
    category: p.category,
    descriptionHtml: p.descriptionHtml ?? "",
    images: p.images ?? [],
    mrp: String(p.mrp ?? ""),
    salePrice: p.salePrice != null ? String(p.salePrice) : "",
    stock: String(p.stock ?? 0),
    author: p.author ?? "",
    language: p.language ?? "",
    publisher: p.publisher ?? "",
    binding: p.binding ?? "",
    brand: p.brand ?? "",
    material: p.material ?? "",
    care: p.care ?? "",
    tags: (p.tags ?? []).join(", "),
    featured: p.featured ?? false,
    bulkEnquiry: p.bulkEnquiry ?? false,
    options: p.options ?? [],
  };
}

export function ProductEditor({ productId }: { productId: string }) {
  const router = useRouter();
  const { byId, categories, loading, source } = useCatalog();
  const toast = useToast();

  const isNew = productId === "new";
  const existing = isNew ? null : byId.get(productId);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [imageInput, setImageInput] = useState("");

  useEffect(() => {
    if (isNew) {
      setHydrated(true);
      return;
    }
    if (existing && !hydrated) {
      setDraft(toDraft(existing));
      setHydrated(true);
    }
  }, [existing, isNew, hydrated]);

  const mrpNum = Number(draft.mrp) || 0;
  const saleNum = draft.salePrice.trim() === "" ? null : Number(draft.salePrice);
  const effectivePrice = saleNum != null && saleNum < mrpNum ? saleNum : mrpNum;
  const discount = saleNum != null && mrpNum > 0 ? Math.round(((mrpNum - saleNum) / mrpNum) * 100) : 0;

  const searchTokens = useMemo(() => {
    const source = [
      draft.title,
      draft.subtitle,
      draft.author,
      draft.language,
      draft.publisher,
      draft.brand,
      draft.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return [
      ...new Set(
        source
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter((t) => t.length > 1),
      ),
    ];
  }, [draft]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!draft.title.trim()) next.title = "A title is required.";
    if (!draft.slug.trim()) next.title = "Please give the product a title.";
    if (!mrpNum || mrpNum <= 0) next.mrp = "Enter the printed price.";
    if (saleNum != null && (Number.isNaN(saleNum) || saleNum <= 0))
      next.salePrice = "Offer price must be a number above zero.";
    if (saleNum != null && saleNum >= mrpNum)
      next.salePrice = "Offer price must be below the printed price.";
    if (!draft.images.length) next.images = "Add at least one image URL.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) {
      toast("Please fix the highlighted fields.", "error");
      return;
    }
    setSaving(true);
    try {
      const stock = Math.max(0, Number(draft.stock) || 0);
      const payload: Partial<Product> = {
        title: draft.title.trim(),
        slug: draft.slug.trim(),
        sku: draft.sku.trim(),
        subtitle: draft.subtitle.trim() || null,
        badge: draft.badge.trim() || null,
        category: draft.category,
        descriptionHtml: draft.descriptionHtml,
        description: draft.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        images: draft.images,
        image: draft.images[0] ?? null,
        mrp: mrpNum,
        salePrice: saleNum,
        price: effectivePrice,
        discountPercent: discount,
        currency: "INR",
        stock,
        inStock: stock > 0,
        author: draft.author.trim() || null,
        language: draft.language.trim() || null,
        publisher: draft.publisher.trim() || null,
        binding: draft.binding.trim() || null,
        brand: draft.brand.trim() || null,
        material: draft.material.trim() || null,
        care: draft.care.trim() || null,
        tags: draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        featured: draft.featured,
        bulkEnquiry: draft.bulkEnquiry,
        options: draft.options.filter((o) => o.title.trim() && o.values.length),
        searchTokens,
      };

      await saveProduct(isNew ? null : productId, payload);
      toast(isNew ? "Product created" : "Product saved");
      router.push("/admin/products");
    } catch (err) {
      console.error("[admin] save failed", err);
      toast("Could not save. Check that you're signed in as an admin.", "error");
      setSaving(false);
    }
  }

  function addImage() {
    const url = imageInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast("Image links must start with https://", "error");
      return;
    }
    set("images", [...draft.images, url]);
    setImageInput("");
  }

  if (!isNew && loading && !existing) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (!isNew && !existing) {
    return (
      <div>
        <PageHeader title="Product not found" />
        <p className="text-sm text-ink-soft">
          That product no longer exists.{" "}
          <Link href="/admin/products" className="text-saffron-deep underline underline-offset-2">
            Back to products
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> All products
      </Link>

      <PageHeader
        title={isNew ? "Add product" : "Edit product"}
        description={isNew ? undefined : existing?.title}
        action={
          <div className="flex gap-2">
            <Button variant="quiet" onClick={() => router.push("/admin/products")}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving} disabled={source === "fallback"}>
              {isNew ? "Create product" : "Save changes"}
            </Button>
          </div>
        }
      />

      {source === "fallback" && (
        <p className="mb-5 rounded-xl border border-ochre/30 bg-ochre/8 px-4 py-3 text-xs text-ink-soft">
          Saving is disabled until the catalogue is in Firestore. Run{" "}
          <code className="rounded bg-paper-sunk px-1.5 py-0.5">npm run seed</code> first.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Basics */}
          <Card className="p-6">
            <h2 className="mb-5 font-display text-lg font-semibold text-ink">Basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Title" required error={errors.title}>
                  <Input
                    value={draft.title}
                    onChange={(e) => {
                      set("title", e.target.value);
                      // Follows the title for a new product; frozen afterwards
                      // so an existing product page never changes address.
                      if (isNew) set("slug", slugify(e.target.value));
                    }}
                    placeholder="The Buddha and his Dhamma"
                  />
                </Field>
                {draft.slug && (
                  <p className="mt-1.5 text-[0.6875rem] text-ink-faint">
                    Web address: <code>/product/{draft.slug}</code>
                    {!isNew && " — kept as it is, so existing links keep working."}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Field label="Subtitle">
                  <Input
                    value={draft.subtitle}
                    onChange={(e) => set("subtitle", e.target.value)}
                    placeholder="A short line shown under the title"
                  />
                </Field>
              </div>

              <Field label="SKU">
                <Input value={draft.sku} onChange={(e) => set("sku", e.target.value)} placeholder="BUD-001" />
              </Field>

              <Field label="Category" required>
                <Select value={draft.category} onChange={(e) => set("category", e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Badge" hint="Shown on the cover, e.g. Best Seller">
                <Input
                  value={draft.badge}
                  onChange={(e) => set("badge", e.target.value)}
                  placeholder="Best Seller"
                />
              </Field>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-6">
            <h2 className="mb-1.5 font-display text-lg font-semibold text-ink">Description</h2>
            <p className="mb-4 text-xs text-ink-faint">
              Basic HTML is supported — use <code>&lt;p&gt;</code> for paragraphs,{" "}
              <code>&lt;strong&gt;</code> for bold and <code>&lt;ul&gt;&lt;li&gt;</code> for lists.
            </p>
            <Textarea
              value={draft.descriptionHtml}
              onChange={(e) => set("descriptionHtml", e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder="<p>About this title…</p>"
            />
            {draft.descriptionHtml && (
              <div className="mt-4 rounded-xl border border-rule bg-paper p-4">
                <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Preview
                </p>
                <div
                  className="prose-book text-sm"
                  dangerouslySetInnerHTML={{ __html: draft.descriptionHtml }}
                />
              </div>
            )}
          </Card>

          {/* Images */}
          <Card className="p-6">
            <h2 className="mb-1.5 font-display text-lg font-semibold text-ink">Images</h2>
            <p className="mb-4 text-xs text-ink-faint">
              Paste image links (https://). The first image is used as the cover. Firebase Storage
              needs a paid plan, so images are linked rather than uploaded — any public image host
              works.
            </p>

            <div className="flex gap-2">
              <Input
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImage();
                  }
                }}
                placeholder="https://…"
              />
              <Button variant="secondary" onClick={addImage}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
            {errors.images && <p className="mt-2 text-xs text-maroon">{errors.images}</p>}

            {draft.images.length > 0 && (
              <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {draft.images.map((src, i) => (
                  <li key={`${src}-${i}`} className="group relative">
                    <div className="relative aspect-3/4 overflow-hidden rounded-lg border border-rule bg-paper-sunk">
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized
                      />
                      {i === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/85 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-paper">
                          Cover
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex justify-center gap-1">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...draft.images];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            set("images", next);
                          }}
                          className="rounded p-1 text-ink-faint transition hover:text-ink"
                          aria-label="Move earlier"
                        >
                          <GripVertical className="size-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => set("images", draft.images.filter((_, x) => x !== i))}
                        className="rounded p-1 text-ink-faint transition hover:text-maroon"
                        aria-label="Remove image"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {draft.images.length === 0 && (
              <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-dashed border-rule-strong py-10 text-ink-faint">
                <ImageOff className="size-6" />
                <p className="text-xs">No images yet</p>
              </div>
            )}
          </Card>

          {/* Options */}
          <Card className="p-6">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Options</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => set("options", [...draft.options, { title: "", values: [] }])}
              >
                <Plus className="size-3.5" /> Add option
              </Button>
            </div>
            <p className="mb-4 text-xs text-ink-faint">
              For products sold in variations — the Chivar uses Size and Colour. Customers pick these
              on the product page before adding to their bag.
            </p>

            {draft.options.length === 0 ? (
              <p className="rounded-xl border border-dashed border-rule-strong py-8 text-center text-xs text-ink-faint">
                No options — this product is sold as a single variant.
              </p>
            ) : (
              <ul className="space-y-3">
                {draft.options.map((opt, i) => (
                  <li key={i} className="rounded-xl border border-rule bg-paper p-4">
                    <div className="flex gap-2">
                      <Input
                        value={opt.title}
                        onChange={(e) => {
                          const next = [...draft.options];
                          next[i] = { ...opt, title: e.target.value };
                          set("options", next);
                        }}
                        placeholder="Size"
                        className="max-w-40"
                      />
                      <Input
                        value={opt.values.join(", ")}
                        onChange={(e) => {
                          const next = [...draft.options];
                          next[i] = {
                            ...opt,
                            values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                          };
                          set("options", next);
                        }}
                        placeholder="Orange, Brown, Yellow"
                      />
                      <button
                        type="button"
                        onClick={() => set("options", draft.options.filter((_, x) => x !== i))}
                        className="shrink-0 rounded-lg p-2 text-ink-faint transition hover:text-maroon"
                        aria-label="Remove option"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-[0.6875rem] text-ink-faint">
                      Separate values with commas.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Pricing */}
          <Card className="p-6">
            <h2 className="mb-5 font-display text-lg font-semibold text-ink">Pricing &amp; stock</h2>
            <div className="space-y-4">
              <Field label="Printed price (MRP)" required error={errors.mrp}>
                <Input
                  type="number"
                  min={0}
                  value={draft.mrp}
                  onChange={(e) => set("mrp", e.target.value)}
                  placeholder="600"
                />
              </Field>
              <Field
                label="Offer price"
                error={errors.salePrice}
                hint="Leave blank to sell at MRP"
              >
                <Input
                  type="number"
                  min={0}
                  value={draft.salePrice}
                  onChange={(e) => set("salePrice", e.target.value)}
                  placeholder="550"
                />
              </Field>

              {mrpNum > 0 && (
                <div className="rounded-xl bg-paper-sunk px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-ink-faint">Customer pays</span>
                    <span className="font-display text-lg font-semibold text-ink">
                      {formatPrice(effectivePrice)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <p className="mt-1 text-right text-[0.6875rem] text-leaf">
                      {discount}% off · saves {formatPrice(mrpNum - effectivePrice)}
                    </p>
                  )}
                </div>
              )}

              <Field label="Stock on hand" required>
                <Input
                  type="number"
                  min={0}
                  value={draft.stock}
                  onChange={(e) => set("stock", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          {/* Book details */}
          <Card className="p-6">
            <h2 className="mb-5 font-display text-lg font-semibold text-ink">Details</h2>
            <div className="space-y-4">
              <Field label="Author">
                <Input
                  value={draft.author}
                  onChange={(e) => set("author", e.target.value)}
                  placeholder="Dr. B. R. Ambedkar"
                />
              </Field>
              <Field label="Language">
                <Input
                  value={draft.language}
                  onChange={(e) => set("language", e.target.value)}
                  placeholder="Marathi"
                />
              </Field>
              <Field label="Publisher">
                <Input
                  value={draft.publisher}
                  onChange={(e) => set("publisher", e.target.value)}
                  placeholder="Sugat Prakashan"
                />
              </Field>
              <Field label="Binding">
                <Input
                  value={draft.binding}
                  onChange={(e) => set("binding", e.target.value)}
                  placeholder="Paperback"
                />
              </Field>
              <Field label="Brand" hint="For stationery">
                <Input
                  value={draft.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="Nataraj"
                />
              </Field>
              <Field label="Material">
                <Input
                  value={draft.material}
                  onChange={(e) => set("material", e.target.value)}
                  placeholder="Breathable cotton"
                />
              </Field>
              <Field label="Care instructions">
                <Textarea
                  rows={3}
                  value={draft.care}
                  onChange={(e) => set("care", e.target.value)}
                  placeholder="Hand wash in cold water…"
                />
              </Field>
              <Field label="Tags" hint="Comma separated — used by search">
                <Input
                  value={draft.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  placeholder="dhamma, buddha, classic"
                />
              </Field>
            </div>
          </Card>

          {/* Flags */}
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Visibility</h2>
            <label className="flex cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-saffron)]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">Feature on the homepage</span>
                <span className="block text-xs text-ink-faint">
                  Appears in the “Essential reading” shelf.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={draft.bulkEnquiry}
                onChange={(e) => set("bulkEnquiry", e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-saffron)]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">Allow bulk enquiries</span>
                <span className="block text-xs text-ink-faint">
                  Shows a WhatsApp bulk-order prompt on the product page.
                </span>
              </span>
            </label>
          </Card>

          <Button full size="lg" onClick={save} loading={saving} disabled={source === "fallback"}>
            {isNew ? "Create product" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
