import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthPage } from "@/components/auth/auth-page";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Sugat Book Depot account to track orders and save addresses.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container-page flex min-h-[60vh] items-center justify-center">
          <Spinner className="size-7" />
        </div>
      }
    >
      <AuthPage />
    </Suspense>
  );
}
