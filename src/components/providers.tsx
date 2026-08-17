"use client";

import { useEffect, type ReactNode } from "react";

import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { CatalogProvider } from "@/lib/catalog-context";
import { ToastProvider } from "@/lib/toast-context";
import { initAnalytics } from "@/lib/firebase";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Fire-and-forget; analytics must never block or break rendering.
    void initAnalytics();
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <CatalogProvider>
          <CartProvider>{children}</CartProvider>
        </CatalogProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
