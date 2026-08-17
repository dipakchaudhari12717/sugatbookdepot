"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useCatalog } from "@/lib/catalog-context";
import { deleteProduct, setProductStock } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { Button, Input, LinkButton, Modal, Select } from "@/components/ui";
import { PageHeader, TableWrap, Td, Th } from "./admin-ui";

export function AdminProducts() {
  const { products, categories, source } = useCatalog();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingStock, setSavingStock] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products
      .filter((p) => {
        if (category && p.category !== category) return false;
        if (stockFilter === "out" && p.stock > 0) return false;
        if (stockFilter === "low" && (p.stock === 0 || p.stock > 5)) return false;
        if (needle) {
          const hay = `${p.title} ${p.sku} ${p.author ?? ""} ${p.brand ?? ""}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [products, query, category, stockFilter]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(confirmDelete.id);
      toast(`"${confirmDelete.title}" deleted`);
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
      toast("Could not delete that product. Check your permissions.", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function updateStock(product: Product, value: number) {
    setSavingStock(product.id);
    try {
      await setProductStock(product.id, Math.max(0, value));
    } catch {
      toast("Could not update stock.", "error");
    } finally {
      setSavingStock(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} products in the catalogue.`}
        action={
          <LinkButton href="/admin/products/new" size="sm">
            <Plus className="size-3.5" /> Add product
          </LinkButton>
        }
      />

      {source === "fallback" && (
        <p className="mb-5 rounded-xl border border-ochre/30 bg-ochre/8 px-4 py-3 text-xs text-ink-soft">
          These products are being served from the bundled migration file, not Firestore. Editing and
          deleting need the catalogue seeded first — run{" "}
          <code className="rounded bg-paper-sunk px-1.5 py-0.5">npm run seed</code>.
        </p>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, SKU, author…"
            className="pl-9"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-auto min-w-40"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="w-auto min-w-36"
        >
          <option value="">Any stock</option>
          <option value="low">Low stock (≤5)</option>
          <option value="out">Out of stock</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-14 text-center text-sm text-ink-faint">
          No products match those filters.
        </p>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="transition hover:bg-paper-sunk/60">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-paper-sunk shadow-page">
                      {p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="block max-w-64 truncate font-medium text-ink transition hover:text-saffron-deep"
                      >
                        {p.title}
                      </Link>
                      <span className="block text-[0.6875rem] text-ink-faint">
                        {p.sku}
                        {p.author ? ` · ${p.author}` : p.brand ? ` · ${p.brand}` : ""}
                      </span>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className="rounded-full bg-paper-sunk px-2.5 py-1 text-[0.6875rem] font-medium text-ink-soft">
                    {categories.find((c) => c.slug === p.category)?.shortName ?? p.category}
                  </span>
                </Td>
                <Td>
                  <span className="font-medium text-ink">{formatPrice(p.price)}</span>
                  {p.salePrice != null && (
                    <span className="ml-1.5 text-[0.6875rem] text-ink-faint line-through">
                      {formatPrice(p.mrp)}
                    </span>
                  )}
                </Td>
                <Td>
                  <input
                    type="number"
                    min={0}
                    defaultValue={p.stock}
                    disabled={source === "fallback"}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value !== p.stock) updateStock(p, value);
                    }}
                    className={cn(
                      "w-20 rounded-lg border bg-paper-raised px-2.5 py-1.5 text-sm tabular-nums transition",
                      "focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/25",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      p.stock === 0
                        ? "border-maroon/40 text-maroon"
                        : p.stock <= 5
                          ? "border-ochre/40 text-ochre"
                          : "border-rule-strong text-ink",
                      savingStock === p.id && "opacity-50",
                    )}
                    aria-label={`Stock for ${p.title}`}
                  />
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/product/${p.slug}`}
                      target="_blank"
                      className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
                      aria-label={`View ${p.title} on the shop`}
                    >
                      <Eye className="size-4" />
                    </Link>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-saffron-deep"
                      aria-label={`Edit ${p.title}`}
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(p)}
                      disabled={source === "fallback"}
                      className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-maroon disabled:opacity-40"
                      aria-label={`Delete ${p.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this product?"
        size="sm"
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          <strong className="text-ink">{confirmDelete?.title}</strong> will be removed from the shop
          immediately. Past orders containing it are not affected. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete product
          </Button>
        </div>
      </Modal>
    </div>
  );
}
