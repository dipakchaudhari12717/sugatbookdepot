"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <h1 className="rule-ornament inline-block font-display text-2xl font-semibold text-ink">
          Something went wrong
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-ink-soft">
          We hit an unexpected problem loading this page. Trying again usually clears it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center rounded-full bg-saffron px-6 text-sm font-medium text-white transition hover:bg-saffron-deep"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-rule-strong bg-paper-raised px-6 text-sm font-medium text-ink transition hover:border-saffron hover:text-saffron-deep"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
