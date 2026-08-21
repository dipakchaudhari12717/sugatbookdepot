"use client";

import { MediaImage } from "@/components/media-image";
import { Pencil, Plus, Store, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase";
import { deleteBanner, saveBanner, subscribeBanners } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Banner } from "@/lib/types";
import { Button, Field, Input, Modal, Spinner, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/admin/admin-ui";
import { ImageField } from "@/components/admin/image-field";

interface Draft {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  active: boolean;
  order: number;
}

const EMPTY: Draft = {
  title: "",
  subtitle: "",
  ctaLabel: "Shop now",
  ctaHref: "/shop",
  image: "",
  active: true,
  order: 1,
};

export default function AdminBannersPage() {
  const toast = useToast();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return subscribeBanners((next) => {
      setBanners(next);
      setLoading(false);
    });
  }, []);

  function openNew() {
    setEditing(null);
    setDraft({ ...EMPTY, order: (banners.at(-1)?.order ?? 0) + 1 });
    setError(null);
    setOpen(true);
  }

  function openEdit(b: Banner) {
    setEditing(b);
    setDraft({
      title: b.title,
      subtitle: b.subtitle ?? "",
      ctaLabel: b.ctaLabel ?? "",
      ctaHref: b.ctaHref ?? "/shop",
      image: b.image ?? "",
      active: b.active,
      order: b.order ?? 1,
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!draft.title.trim()) return setError("A headline is required.");

    setBusy(true);
    try {
      await saveBanner(editing?.id ?? null, {
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        ctaLabel: draft.ctaLabel.trim(),
        ctaHref: draft.ctaHref.trim() || "/shop",
        image: draft.image.trim() || null,
        active: draft.active,
        order: Number(draft.order) || 1,
      });
      toast(editing ? "Banner updated" : "Banner created");
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
      await deleteBanner(confirmDelete.id);
      toast("Banner deleted");
      setConfirmDelete(null);
    } catch {
      toast("Could not delete that banner.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Homepage banners"
        description="Promotional panels shown on the homepage. The first active banner is displayed."
        action={
          <Button size="sm" onClick={openNew} disabled={!isFirebaseConfigured}>
            <Plus className="size-3.5" /> Add banner
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-14 text-center">
          <Store className="mx-auto size-6 text-ink-faint" />
          <p className="mt-3 text-sm text-ink-faint">
            No banners yet — the homepage simply skips this section.
          </p>
          <Button size="sm" className="mt-5" onClick={openNew} disabled={!isFirebaseConfigured}>
            Create a banner
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {banners.map((b) => (
            <li
              key={b.id}
              className="overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-page"
            >
              <div className="relative h-36 bg-gradient-to-br from-saffron-wash to-paper-sunk">
                {b.image && (
                  <MediaImage src={b.image} alt="" fill sizes="400px" className="object-cover opacity-70" />
                )}
                <div className="absolute inset-0 flex flex-col justify-center p-5">
                  <p className="font-display text-lg font-semibold text-ink">{b.title}</p>
                  {b.subtitle && (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{b.subtitle}</p>
                  )}
                </div>
                <span
                  className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[0.625rem] font-semibold ${
                    b.active ? "bg-leaf text-white" : "bg-paper-deep text-ink-soft"
                  }`}
                >
                  {b.active ? "Live" : "Off"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-3">
                <span className="truncate text-xs text-ink-faint">
                  {b.ctaLabel} → {b.ctaHref} · order {b.order}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-saffron-deep"
                    aria-label={`Edit ${b.title}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(b)}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-maroon"
                    aria-label={`Delete ${b.title}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit banner" : "New banner"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Headline" required>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Kathina Chivar Daan is open"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Sub-heading">
              <Textarea
                rows={2}
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                placeholder="Order robes for your vihara before the season ends."
              />
            </Field>
          </div>
          <Field label="Button label">
            <Input
              value={draft.ctaLabel}
              onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
              placeholder="Shop Chivar"
            />
          </Field>
          <Field label="Button link">
            <Input
              value={draft.ctaHref}
              onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value })}
              placeholder="/shop?category=chivar"
            />
          </Field>
          <div className="sm:col-span-2">
            <ImageField
              label="Background image"
              value={draft.image}
              onChange={(next) => setDraft({ ...draft, image: next })}
              hint="Optional — sits behind the headline at low opacity."
            />
          </div>
          <Field label="Order">
            <Input
              type="number"
              value={draft.order}
              onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
            />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="size-4 accent-[var(--color-saffron)]"
              />
              Show on the homepage
            </label>
          </div>
        </div>

        {error && <p className="mt-4 text-xs text-maroon">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? "Save changes" : "Create banner"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this banner?"
        size="sm"
      >
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">{confirmDelete?.title}</strong> will be removed from the
          homepage.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={remove} loading={busy}>
            Delete banner
          </Button>
        </div>
      </Modal>
    </div>
  );
}
