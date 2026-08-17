"use client";

import { LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useCatalog } from "@/lib/catalog-context";
import { deleteCategory, saveCategory } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Category } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { PageHeader, TableWrap, Td, Th } from "@/components/admin/admin-ui";

type Draft = Omit<Category, "id" | "productCount">;

const EMPTY: Draft = {
  slug: "",
  name: "",
  shortName: "",
  order: 10,
  featured: true,
  tagline: "",
  description: "",
};

export default function AdminCategoriesPage() {
  const { categories, countFor, source } = useCatalog();
  const toast = useToast();

  const [editing, setEditing] = useState<Category | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setDraft({ ...EMPTY, order: (categories.at(-1)?.order ?? 0) + 1 });
    setError(null);
    setOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    const { id: _id, productCount: _count, ...rest } = category;
    setDraft(rest);
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) return setError("A name is required.");
    if (!draft.slug.trim()) return setError("A slug is required.");

    setBusy(true);
    try {
      await saveCategory(editing?.id ?? null, {
        ...draft,
        shortName: draft.shortName.trim() || draft.name.trim(),
        order: Number(draft.order) || 0,
      });
      toast(editing ? "Category updated" : "Category created");
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError("Could not save. Check that you're signed in as an admin.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteCategory(confirmDelete.id);
      toast("Category deleted");
      setConfirmDelete(null);
    } catch {
      toast("Could not delete that category.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="The shelves customers browse. Order controls where they appear in the menu."
        action={
          <Button size="sm" onClick={openNew} disabled={source === "fallback"}>
            <Plus className="size-3.5" /> Add category
          </Button>
        }
      />

      {source === "fallback" && (
        <p className="mb-5 rounded-xl border border-ochre/30 bg-ochre/8 px-4 py-3 text-xs text-ink-soft">
          Categories are coming from the bundled migration file. Run{" "}
          <code className="rounded bg-paper-sunk px-1.5 py-0.5">npm run seed</code> to manage them
          here.
        </p>
      )}

      <TableWrap>
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Category</Th>
            <Th>Tagline</Th>
            <Th>Products</Th>
            <Th>In menu</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.slug} className="transition hover:bg-paper-sunk/60">
              <Td className="tabular-nums">{c.order}</Td>
              <Td>
                <span className="block font-medium text-ink">{c.name}</span>
                <span className="block text-[0.6875rem] text-ink-faint">/{c.slug}</span>
              </Td>
              <Td className="max-w-64 truncate">{c.tagline}</Td>
              <Td className="tabular-nums">{countFor(c.slug)}</Td>
              <Td>
                {c.featured ? (
                  <span className="rounded-full bg-leaf/12 px-2.5 py-1 text-[0.6875rem] font-semibold text-leaf">
                    Yes
                  </span>
                ) : (
                  <span className="rounded-full bg-paper-deep px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-soft">
                    Hidden
                  </span>
                )}
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    disabled={source === "fallback"}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-saffron-deep disabled:opacity-40"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(c)}
                    disabled={source === "fallback"}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-maroon disabled:opacity-40"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      {categories.length === 0 && (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-rule-strong bg-paper-raised py-12 text-sm text-ink-faint">
          <LayoutGrid className="size-4" /> No categories yet.
        </p>
      )}

      {/* Editor */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit category" : "Add category"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input
              value={draft.name}
              onChange={(e) => {
                const name = e.target.value;
                setDraft((d) => ({
                  ...d,
                  name,
                  slug: editing ? d.slug : slugify(name),
                }));
              }}
              placeholder="Buddhism"
            />
          </Field>
          <Field label="Short name" hint="Used in the top menu">
            <Input
              value={draft.shortName}
              onChange={(e) => setDraft({ ...draft, shortName: e.target.value })}
              placeholder="Buddhism"
            />
          </Field>
          <Field label="Slug" required hint="/shop?category=…">
            <Input
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
              placeholder="buddhism"
            />
          </Field>
          <Field label="Menu order" required>
            <Input
              type="number"
              value={draft.order}
              onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tagline">
              <Input
                value={draft.tagline}
                onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                placeholder="The Dhamma, in your language"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Shown at the top of the category page."
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                className="size-4 accent-[var(--color-saffron)]"
              />
              Show in the main navigation
            </label>
          </div>
        </div>

        {error && <p className="mt-4 text-xs text-maroon">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? "Save changes" : "Create category"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this category?"
        size="sm"
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          <strong className="text-ink">{confirmDelete?.name}</strong> will be removed from the
          navigation. Products in it are <em>not</em> deleted, but they will stop appearing under a
          category until you move them.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={remove} loading={busy}>
            Delete category
          </Button>
        </div>
      </Modal>
    </div>
  );
}
