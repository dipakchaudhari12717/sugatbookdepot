import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl font-semibold text-saffron">404</p>
        <h1 className="rule-ornament mt-4 inline-block font-display text-2xl font-semibold text-ink">
          This page isn't on the shelf
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-ink-soft">
          The page you're looking for may have moved, or the link may be out of date. The catalogue
          is still right where you left it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/shop"
            className="inline-flex h-11 items-center rounded-full bg-saffron px-6 text-sm font-medium text-white transition hover:bg-saffron-deep"
          >
            Browse the collection
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-rule-strong bg-paper-raised px-6 text-sm font-medium text-ink transition hover:border-saffron hover:text-saffron-deep"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
