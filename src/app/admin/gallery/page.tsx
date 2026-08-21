"use client";

import { MediaImage } from "@/components/media-image";
import { ImageIcon, Pencil, Plus, Trash2, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase";
import { deleteGalleryItem, saveGalleryItem, subscribeGallery } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import { GALLERY_ALBUMS, type GalleryItem } from "@/lib/types";
import { cn, youtubeId, youtubeThumb } from "@/lib/utils";
import { Button, Field, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { ImageField } from "@/components/admin/image-field";
import { PageHeader } from "@/components/admin/admin-ui";

interface Draft {
  title: string;
  description: string;
  kind: "photo" | "video";
  youtubeUrl: string;
  image: string;
  album: string;
  order: number;
  published: boolean;
  takenOn: string;
}

const EMPTY: Draft = {
  title: "",
  description: "",
  kind: "photo",
  youtubeUrl: "",
  image: "",
  album: "Shop",
  order: 1,
  published: true,
  takenOn: "",
};

export default function AdminGalleryPage() {
  const toast = useToast();

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GalleryItem | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    // `true` here includes drafts — the storefront never sees them.
    return subscribeGallery((next) => {
      setItems(next);
      setLoading(false);
    }, true);
  }, []);

  function openNew() {
    setEditing(null);
    setDraft({ ...EMPTY, order: (items.at(-1)?.order ?? 0) + 1 });
    setError(null);
    setOpen(true);
  }

  function openEdit(item: GalleryItem) {
    setEditing(item);
    setDraft({
      title: item.title ?? "",
      description: item.description ?? "",
      kind: item.kind ?? "photo",
      youtubeUrl: item.youtubeId ?? "",
      image: item.image ?? "",
      album: item.album ?? "Shop",
      order: item.order ?? 1,
      published: item.published !== false,
      takenOn: item.takenOn ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!draft.title.trim()) return setError("Give it a short title.");

    // A video only needs a link — YouTube supplies the still.
    let videoId: string | null = null;
    if (draft.kind === "video") {
      videoId = youtubeId(draft.youtubeUrl);
      if (!videoId) {
        return setError("That does not look like a YouTube link. Paste the address from the video's Share button.");
      }
    } else if (!draft.image.trim()) {
      return setError("Please choose a photograph.");
    }

    const poster = draft.kind === "video" ? youtubeThumb(videoId!) : draft.image.trim();

    setBusy(true);
    try {
      await saveGalleryItem(editing?.id ?? null, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        kind: draft.kind,
        youtubeId: videoId,
        image: poster,
        album: draft.album.trim(),
        order: Number(draft.order) || 0,
        published: draft.published,
        takenOn: draft.takenOn || null,
      });
      toast(editing ? "Photograph updated" : "Photograph added");
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError("Could not save. Check that you are signed in as an admin.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteGalleryItem(confirmDelete.id);
      toast("Photograph removed");
      setConfirmDelete(null);
    } catch {
      toast("Could not remove that photograph.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item: GalleryItem) {
    try {
      await saveGalleryItem(item.id, { published: item.published === false });
    } catch {
      toast("Could not change visibility.", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Gallery"
        description="Photographs and YouTube videos shown on the public gallery. Changes appear on the site immediately."
        action={
          <Button size="sm" onClick={openNew} disabled={!isFirebaseConfigured}>
            <Plus className="size-3.5" /> Add to gallery
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-14 text-center">
          <ImageIcon className="mx-auto size-6 text-ink-faint" />
          <p className="mt-3 text-sm text-ink-faint">
            No photographs yet. The gallery page stays empty until you add one.
          </p>
          <Button size="sm" className="mt-5" onClick={openNew} disabled={!isFirebaseConfigured}>
            Add the first photograph
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-paper-raised shadow-page transition",
                item.published === false ? "border-rule opacity-65" : "border-rule",
              )}
            >
              <div className="relative aspect-4/3 bg-paper-sunk">
                {item.image && (
                  <MediaImage
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                )}
                <span
                  className={cn(
                    "absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[0.625rem] font-semibold",
                    item.published === false ? "bg-paper-deep text-ink-soft" : "bg-leaf text-white",
                  )}
                >
                  {item.published === false ? "Draft" : "Live"}
                </span>
                {item.kind === "video" && (
                  <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-ink/80 px-2 py-1 text-[0.625rem] font-semibold text-paper">
                    <Video className="size-3" /> Video
                  </span>
                )}
              </div>

              <div className="p-4">
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-saffron-deep">
                  {item.album}
                </p>
                <p className="mt-1 truncate font-display text-sm font-semibold text-ink">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-ink-faint">{item.description}</p>
                )}

                <div className="mt-3 flex items-center gap-1 border-t border-rule pt-3">
                  <span className="mr-auto text-[0.6875rem] text-ink-faint">#{item.order}</span>
                  <button
                    type="button"
                    onClick={() => togglePublished(item)}
                    className="rounded-lg px-2 py-1.5 text-[0.6875rem] font-medium text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
                  >
                    {item.published === false ? "Publish" : "Unpublish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-saffron-deep"
                    aria-label={`Edit ${item.title}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(item)}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-maroon"
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit gallery item" : "Add to the gallery"}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">Type</span>
            <div className="flex gap-2">
              {(["photo", "video"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDraft({ ...draft, kind: k })}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
                    draft.kind === k
                      ? "border-saffron bg-saffron-wash text-saffron-deep"
                      : "border-rule-strong bg-paper-raised text-ink-soft hover:border-saffron/60",
                  )}
                >
                  {k === "photo" ? <ImageIcon className="size-3.5" /> : <Video className="size-3.5" />}
                  {k === "photo" ? "Photograph" : "YouTube video"}
                </button>
              ))}
            </div>
          </div>

          {draft.kind === "video" ? (
            <div className="sm:col-span-2">
              <Field
                label="YouTube link"
                required
                hint="Paste the address from the video's Share button. The still is taken from YouTube automatically."
              >
                <Input
                  value={draft.youtubeUrl}
                  onChange={(e) => setDraft({ ...draft, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </Field>

              {youtubeId(draft.youtubeUrl) && (
                <div className="mt-3 overflow-hidden rounded-xl border border-rule">
                  <div className="relative aspect-video">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${youtubeId(draft.youtubeUrl)}?rel=0`}
                      title="Preview"
                      allowFullScreen
                      className="absolute inset-0 size-full border-0"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="sm:col-span-2">
              <ImageField
                label="Photograph"
                value={draft.image}
                onChange={(next) => setDraft({ ...draft, image: next })}
                aspect="aspect-4/3"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <Field label="Title" required>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Kathina Chivar Daan at Deekshabhoomi"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="A sentence of context shown under the photograph."
              />
            </Field>
          </div>

          <Field label="Album">
            <Select
              value={draft.album}
              onChange={(e) => setDraft({ ...draft, album: e.target.value })}
            >
              {GALLERY_ALBUMS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Order" hint="Lower numbers appear first">
            <Input
              type="number"
              value={draft.order}
              onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
            />
          </Field>

          <Field label="Date taken">
            <Input
              type="date"
              value={draft.takenOn}
              onChange={(e) => setDraft({ ...draft, takenOn: e.target.value })}
            />
          </Field>

          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                className="size-4 accent-[var(--color-saffron)]"
              />
              Show on the public gallery
            </label>
          </div>
        </div>

        {error && <p className="mt-4 text-xs text-maroon">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? "Save changes" : "Add photograph"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Remove this photograph?"
        size="sm"
      >
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">{confirmDelete?.title}</strong> will be removed from the
          gallery. The image file itself is not deleted from wherever it is hosted.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={remove} loading={busy}>
            Remove photograph
          </Button>
        </div>
      </Modal>
    </div>
  );
}
