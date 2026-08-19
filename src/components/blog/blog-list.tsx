"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Newspaper } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { subscribeBlogPosts } from "@/lib/repo";
import type { BlogPost } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState, Reveal, Spinner } from "@/components/ui";

export function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState("");

  useEffect(
    () =>
      subscribeBlogPosts((next) => {
        setPosts(next);
        setLoading(false);
      }),
    [],
  );

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const t of post.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [posts]);

  const visible = useMemo(
    () => (tag ? posts.filter((p) => (p.tags ?? []).includes(tag)) : posts),
    [posts, tag],
  );

  const [lead, ...rest] = visible;

  return (
    <div className="container-page py-10 lg:py-14">
      <p className="eyebrow">Journal</p>
      <h1 className="rule-ornament mt-4 font-display text-3xl leading-tight font-semibold text-ink sm:text-4xl">
        From the reading desk
      </h1>
      <p className="mt-5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
        Notes on Buddhist literature and Babasaheb&apos;s writings, guidance on Chivar Daan, and news
        from the shop.
      </p>

      {tags.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setTag("")}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
              !tag
                ? "border-saffron bg-saffron text-white"
                : "border-rule bg-paper-raised text-ink-soft hover:border-saffron/50 hover:text-ink",
            )}
          >
            All posts
          </button>
          {tags.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setTag(name)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
                tag === name
                  ? "border-saffron bg-saffron text-white"
                  : "border-rule bg-paper-raised text-ink-soft hover:border-saffron/50 hover:text-ink",
              )}
            >
              {name} <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-10">
        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <Spinner className="size-7" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Newspaper className="size-6" />}
            title="No posts yet"
            description="Writing from the shop will appear here."
          />
        ) : (
          <>
            {/* Lead story */}
            <Reveal>
              <Link
                href={`/blog/${lead.slug}`}
                className="group grid gap-6 overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-page transition-all duration-400 ease-[var(--ease-paper)] hover:-translate-y-1 hover:shadow-lift lg:grid-cols-2 lg:gap-0"
              >
                <div className="relative aspect-16/10 lg:aspect-auto lg:min-h-72">
                  {lead.coverImage ? (
                    <Image
                      src={lead.coverImage}
                      alt=""
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-saffron-wash to-paper-sunk">
                      <Newspaper className="size-10 text-saffron/40" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center p-6 sm:p-9">
                  <div className="flex flex-wrap items-center gap-2.5 text-[0.6875rem] text-ink-faint">
                    <span className="rounded-full bg-saffron-wash px-2.5 py-1 font-semibold uppercase tracking-[0.1em] text-saffron-deep">
                      Latest
                    </span>
                    {lead.publishedAt && <span>{formatDate(lead.publishedAt)}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {lead.readingMinutes || 1} min read
                    </span>
                  </div>

                  <h2 className="mt-4 font-display text-2xl leading-tight font-semibold text-ink transition-colors group-hover:text-saffron-deep sm:text-3xl">
                    {lead.title}
                  </h2>
                  {lead.excerpt && (
                    <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {lead.excerpt}
                    </p>
                  )}
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-saffron-deep">
                    Read the post
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </Reveal>

            {rest.length > 0 && (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post, i) => (
                  <Reveal key={post.id} delay={Math.min(i, 6) * 55} as="article">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-page transition-all duration-400 ease-[var(--ease-paper)] hover:-translate-y-1 hover:shadow-lift"
                    >
                      <div className="relative aspect-16/10 shrink-0">
                        {post.coverImage ? (
                          <Image
                            src={post.coverImage}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-gradient-to-br from-saffron-wash to-paper-sunk">
                            <Newspaper className="size-7 text-saffron/40" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-ink-faint">
                          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" /> {post.readingMinutes || 1} min
                          </span>
                        </div>
                        <h3 className="mt-2.5 font-display text-lg leading-snug font-semibold text-ink transition-colors group-hover:text-saffron-deep">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                            {post.excerpt}
                          </p>
                        )}
                        <span className="mt-auto pt-4 text-xs font-medium text-saffron-deep">
                          Read more →
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
