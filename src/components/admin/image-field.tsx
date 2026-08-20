"use client";

import { ImageOff, Loader2, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { deleteMedia, getMediaFull, subscribeMedia, uploadMedia } from "@/lib/repo";
import { formatBytes, prepareImage } from "@/lib/media";
import { useToast } from "@/lib/toast-context";
import type { MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Modal, Spinner } from "@/components/ui";

/**
 * Picks an image: upload a new file, or reuse one already in the library.
 *
 * Everything the shop uploads is stored in Firestore (Firebase Storage is not
 * enabled on this project), so the value handed back is a data URI rather than
 * a URL. Callers just store the string.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
  aspect = "aspect-16/9",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  aspect?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">{label}</span>

      {value ? (
        <div className="space-y-2">
          <div className={cn("relative overflow-hidden rounded-xl border border-rule bg-paper-sunk", aspect)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="size-full object-contain" />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange("")}>
              <X className="size-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-rule-strong bg-paper text-ink-faint transition",
            "hover:border-saffron hover:text-saffron-deep",
            aspect,
          )}
        >
          <Upload className="size-6" />
          <span className="text-sm font-medium">Choose an image</span>
          <span className="text-xs">Upload a new one, or pick from the library</span>
        </button>
      )}

      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(dataUri) => {
          onChange(dataUri);
          setOpen(false);
        }}
      />
    </div>
  );
}

export function MediaPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (dataUri: string) => void;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    return subscribeMedia((next) => {
      setItems(next);
      setLoading(false);
    });
  }, [open]);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { thumb, full } = await prepareImage(file);
      const saved = await uploadMedia({
        name: file.name,
        thumb: thumb.dataUri,
        full: full.dataUri,
        width: full.width,
        height: full.height,
        bytes: full.bytes,
      });
      toast(`Uploaded ${saved.name}`);
      onPick(full.dataUri);
    } catch (err) {
      toast((err as Error).message || "That upload did not work.", "error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  /** The grid only holds thumbnails, so fetch the full copy when one is chosen. */
  async function choose(item: MediaItem) {
    setFetchingId(item.id);
    try {
      const full = await getMediaFull(item.id);
      onPick(full ?? item.thumb);
    } catch {
      toast("Could not load that image.", "error");
    } finally {
      setFetchingId(null);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    try {
      await deleteMedia(confirmDelete.id);
      toast("Image deleted");
      setConfirmDelete(null);
    } catch {
      toast("Could not delete that image.", "error");
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Choose an image" size="lg">
        {/* Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-5 py-8 text-center transition",
            dragOver ? "border-saffron bg-saffron-wash" : "border-rule-strong bg-paper",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-saffron" />
              <p className="text-sm font-medium text-ink">Preparing your image…</p>
              <p className="text-xs text-ink-faint">Resizing so it stores efficiently.</p>
            </>
          ) : (
            <>
              <Upload className="size-6 text-ink-faint" />
              <p className="text-sm font-medium text-ink">Drag an image here</p>
              <p className="text-xs text-ink-faint">or</p>
              <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                Browse your device
              </Button>
              <p className="mt-1 text-[0.6875rem] text-ink-faint">
                JPG, PNG or WebP. Large photos are resized automatically.
              </p>
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Library */}
        <div className="mt-6">
          <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Already uploaded
          </p>

          {loading ? (
            <div className="flex h-28 items-center justify-center">
              <Spinner className="size-5" />
            </div>
          ) : items.length === 0 ? (
            <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-rule-strong py-8 text-xs text-ink-faint">
              <ImageOff className="size-4" /> Nothing uploaded yet.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {items.map((item) => (
                <li key={item.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    disabled={fetchingId != null}
                    className="block w-full overflow-hidden rounded-lg border border-rule bg-paper-sunk transition hover:border-saffron disabled:opacity-60"
                  >
                    <span className="relative block aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.thumb} alt={item.name} className="size-full object-cover" />
                      {fetchingId === item.id && (
                        <span className="absolute inset-0 grid place-items-center bg-paper/70">
                          <Loader2 className="size-5 animate-spin text-saffron" />
                        </span>
                      )}
                    </span>
                    <span className="block truncate px-2 py-1.5 text-left text-[0.625rem] text-ink-faint">
                      {item.width}×{item.height} · {formatBytes(item.bytes)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(item)}
                    aria-label={`Delete ${item.name}`}
                    className="absolute right-1.5 top-1.5 rounded-md bg-paper-raised/90 p-1.5 text-ink-faint opacity-0 shadow-page transition group-hover:opacity-100 hover:text-maroon"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this image?"
        size="sm"
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          It will be removed from the library. Anywhere it is already in use — a
          published post, a gallery entry — keeps its own copy and is unaffected.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={remove}>
            Delete image
          </Button>
        </div>
      </Modal>
    </>
  );
}
