"use client";

import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { ChevronLeft, Clock, Copy, Newspaper } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { subscribeBlogPosts } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { BlogPost } from "@/lib/types";
import { decodeSlugParam, formatDate } from "@/lib/utils";
import { EmptyState, LinkButton, Reveal, Spinner } from "@/components/ui";

export function BlogPostView({ slug }: { slug: string }) {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      subscribeBlogPosts((next) => {
        setPosts(next);
        setLoading(false);
      }),
    [],
  );

  // Decode on both sides: the route param may still be percent-encoded, and
  // stored Devanagari slugs are not guaranteed to be normalised the same way.
  const post = useMemo(() => {
    const wanted = decodeSlugParam(slug);
    return posts.find((p) => decodeSlugParam(p.slug ?? "") === wanted);
  }, [posts, slug]);

  // Prefer posts sharing a tag, then fall back to whatever else is recent.
  const related = useMemo(() => {
    if (!post) return [];
    const others = posts.filter((p) => p.id !== post.id);
    const shared = others.filter((p) => (p.tags ?? []).some((t) => (post.tags ?? []).includes(t)));
    return [...new Map([...shared, ...others].map((p) => [p.id, p])).values()].slice(0, 3);
  }, [post, posts]);

  // Keep the document title in step once the post resolves client-side.
  useEffect(() => {
    if (post) document.title = `${post.title} | Sugat Book Depot`;
  }, [post]);

  if (loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<Newspaper className="size-6" />}
          title="This post isn't available"
          description="It may have been unpublished or the link may be out of date."
          action={<LinkButton href="/blog">All posts</LinkButton>}
        />
      </div>
    );
  }

  return (
    <article className="container-page py-10 lg:py-14">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> All posts
      </Link>

      <header className="mx-auto mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2.5 text-[0.6875rem] text-ink-faint">
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {post.readingMinutes || 1} min read
          </span>
          {post.author && <span>by {post.author}</span>}
        </div>

        <h1 className="rule-ornament mt-4 font-display text-3xl leading-tight font-semibold text-ink sm:text-5xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">{post.excerpt}</p>
        )}

        {(post.tags ?? []).length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-rule bg-paper-raised px-3 py-1 text-[0.6875rem] font-medium text-ink-soft"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      {post.coverImage && (
        <div className="mx-auto mt-9 max-w-4xl">
          <div className="relative aspect-16/9 overflow-hidden rounded-2xl border border-rule shadow-page">
            <MediaImage
              src={post.coverImage}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
            />
          </div>
        </div>
      )}

      <div
        className="prose-book mx-auto mt-10 max-w-3xl text-base"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
        <p className="text-xs text-ink-faint">
          Published by Sugat Book Depot
          {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ""}
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast("Link copied", "info");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper-raised px-3.5 py-2 text-xs font-medium text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
        >
          <Copy className="size-3.5" /> Copy link
        </button>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl">
          <h2 className="rule-ornament font-display text-2xl font-semibold text-ink">Read next</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 55}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-page transition-all duration-400 ease-[var(--ease-paper)] hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="relative aspect-16/10 shrink-0">
                    {p.coverImage ? (
                      <MediaImage
                        src={p.coverImage}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-saffron-wash to-paper-sunk">
                        <Newspaper className="size-6 text-saffron/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-base leading-snug font-semibold text-ink transition-colors group-hover:text-saffron-deep">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{p.excerpt}</p>
                    )}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
