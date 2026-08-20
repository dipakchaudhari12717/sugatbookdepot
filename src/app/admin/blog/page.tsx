"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImagePlus, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase";
import { deleteBlogPost, estimateReadingMinutes, saveBlogPost, subscribeBlogPosts } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { BlogPost } from "@/lib/types";
import { cn, formatDate, slugify } from "@/lib/utils";
import { Button, Field, Input, Modal, Spinner, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/admin/admin-ui";
import { ImageField, MediaPicker } from "@/components/admin/image-field";

interface Draft {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  coverImage: string;
  author: string;
  tags: string;
  published: boolean;
}

const EMPTY: Draft = {
  title: "",
  slug: "",
  excerpt: "",
  contentHtml: "<p></p>",
  coverImage: "",
  author: "Sugat Book Depot",
  tags: "",
  published: true,
};

export default function AdminBlogPage() {
  const toast = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BlogPost | null>(null);
  const [insertOpen, setInsertOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Splice an <img> into the body at the caret, so a writer can alternate
   * paragraphs and pictures instead of only having a cover image.
   */
  function insertImage(dataUri: string) {
    const figure = `
<figure><img src="${dataUri}" alt="" /></figure>
`;
    const el = bodyRef.current;
    setDraft((d) => {
      const at = el ? (el.selectionStart ?? d.contentHtml.length) : d.contentHtml.length;
      return { ...d, contentHtml: d.contentHtml.slice(0, at) + figure + d.contentHtml.slice(at) };
    });
    setInsertOpen(false);
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return subscribeBlogPosts((next) => {
      setPosts(next);
      setLoading(false);
    }, true);
  }, []);

  function openNew() {
    setEditing(null);
    setDraft(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setDraft({
      title: post.title ?? "",
      slug: post.slug ?? "",
      excerpt: post.excerpt ?? "",
      contentHtml: post.contentHtml ?? "",
      coverImage: post.coverImage ?? "",
      author: post.author ?? "Sugat Book Depot",
      tags: (post.tags ?? []).join(", "),
      published: post.published !== false,
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!draft.title.trim()) return setError("A title is required.");
    if (!draft.slug.trim()) return setError("Please give the post a title.");
    if (!draft.contentHtml.replace(/<[^>]+>/g, "").trim())
      return setError("Write some content for the post.");

    const clash = posts.find((p) => p.slug === draft.slug.trim() && p.id !== editing?.id);
    if (clash) return setError("Another post already uses that slug. Pick a different one.");

    setBusy(true);
    try {
      await saveBlogPost(editing?.id ?? null, {
        title: draft.title.trim(),
        slug: draft.slug.trim(),
        excerpt: draft.excerpt.trim(),
        contentHtml: draft.contentHtml,
        coverImage: draft.coverImage.trim() || null,
        author: draft.author.trim() || "Sugat Book Depot",
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
        published: draft.published,
        readingMinutes: estimateReadingMinutes(draft.contentHtml),
        // Stamp the publish date the first time it actually goes live.
        publishedAt: draft.published ? (editing?.publishedAt ?? Date.now()) : null,
      });
      toast(editing ? "Post updated" : "Post published");
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
      await deleteBlogPost(confirmDelete.id);
      toast("Post deleted");
      setConfirmDelete(null);
    } catch {
      toast("Could not delete that post.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Posts published to the public journal. Saving makes them live immediately."
        action={
          <Button size="sm" onClick={openNew} disabled={!isFirebaseConfigured}>
            <Plus className="size-3.5" /> Write a post
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-14 text-center">
          <Newspaper className="mx-auto size-6 text-ink-faint" />
          <p className="mt-3 text-sm text-ink-faint">No posts yet.</p>
          <Button size="sm" className="mt-5" onClick={openNew} disabled={!isFirebaseConfigured}>
            Write the first post
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className={cn(
                "flex flex-wrap items-center gap-4 rounded-2xl border bg-paper-raised p-4 shadow-page",
                post.published === false ? "border-rule opacity-70" : "border-rule",
              )}
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-paper-sunk">
                {post.coverImage ? (
                  <Image
                    src={post.coverImage}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Newspaper className="size-5 text-ink-faint" />
                  </div>
                )}
              </div>

              <div className="min-w-40 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[0.625rem] font-semibold",
                      post.published === false
                        ? "bg-paper-deep text-ink-soft"
                        : "bg-leaf/12 text-leaf",
                    )}
                  >
                    {post.published === false ? "Draft" : "Live"}
                  </span>
                  <span className="text-[0.6875rem] text-ink-faint">
                    {post.publishedAt ? formatDate(post.publishedAt) : "Not published"} ·{" "}
                    {post.readingMinutes || 1} min
                  </span>
                </div>
                <p className="mt-1.5 font-display text-base font-semibold text-ink">{post.title}</p>
                {post.excerpt && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-faint">{post.excerpt}</p>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
                  aria-label={`View ${post.title}`}
                >
                  <ExternalLink className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => openEdit(post)}
                  className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-saffron-deep"
                  aria-label={`Edit ${post.title}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(post)}
                  className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-maroon"
                  aria-label={`Delete ${post.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit post" : "Write a post"}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" required>
              <Input
                value={draft.title}
                onChange={(e) => {
                  const title = e.target.value;
                  // The slug follows the title while drafting, but is frozen
                  // once a post exists so published links never break.
                  setDraft((d) => ({ ...d, title, slug: editing ? d.slug : slugify(title) }));
                }}
                placeholder="What Chivar Daan means, and how to offer one"
              />
            </Field>
            {draft.slug && (
              <p className="-mt-2 text-[0.6875rem] text-ink-faint">
                Web address: <code>/blog/{draft.slug}</code>
                {editing && " — kept as it is, so existing links keep working."}
              </p>
            )}
          </div>

          <Field label="Author">
            <Input
              value={draft.author}
              onChange={(e) => setDraft({ ...draft, author: e.target.value })}
            />
          </Field>

          <div className="sm:col-span-2">
            <ImageField
              label="Cover image"
              value={draft.coverImage}
              onChange={(next) => setDraft({ ...draft, coverImage: next })}
              hint="Shown at the top of the post and on the blog index."
            />
          </div>

          <div className="sm:col-span-2">
            <Field label="Excerpt" hint="One or two sentences shown on the blog index">
              <Textarea
                rows={2}
                value={draft.excerpt}
                onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Content"
              required
              hint="Basic HTML: <p> for paragraphs, <strong> for bold, <ul><li> for lists, <a href> for links."
            >
              <Textarea
                ref={bodyRef}
                rows={12}
                value={draft.contentHtml}
                onChange={(e) => setDraft({ ...draft, contentHtml: e.target.value })}
                className="font-mono text-xs"
                placeholder="<p>Your post…</p>"
              />
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setInsertOpen(true)}>
                <ImagePlus className="size-3.5" /> Insert image here
              </Button>
              <span className="text-[0.6875rem] text-ink-faint">
                Drops the picture in wherever the cursor is, so you can write a
                paragraph, add a picture, then keep writing.
              </span>
            </div>
          </div>

          {draft.contentHtml.replace(/<[^>]+>/g, "").trim() && (
            <div className="sm:col-span-2">
              <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Preview · about {estimateReadingMinutes(draft.contentHtml)} min read
              </p>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-rule bg-paper p-4">
                <div
                  className="prose-book text-sm"
                  dangerouslySetInnerHTML={{ __html: draft.contentHtml }}
                />
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <Field label="Tags" hint="Comma separated">
              <Input
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="chivar, dana, varshavas"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                className="size-4 accent-[var(--color-saffron)]"
              />
              Publish to the public blog
            </label>
          </div>
        </div>

        {error && <p className="mt-4 text-xs text-maroon">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? "Save changes" : draft.published ? "Publish post" : "Save draft"}
          </Button>
        </div>
      </Modal>

      <MediaPicker open={insertOpen} onClose={() => setInsertOpen(false)} onPick={insertImage} />

      <Modal
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this post?"
        size="sm"
      >
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">{confirmDelete?.title}</strong> will be removed from the blog
          permanently.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={remove} loading={busy}>
            Delete post
          </Button>
        </div>
      </Modal>
    </div>
  );
}
