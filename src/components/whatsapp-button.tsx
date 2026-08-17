"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { WhatsAppIcon } from "./brand-icons";

import { useCatalog } from "@/lib/catalog-context";
import { cn } from "@/lib/utils";
//hello world
/**
 * Floating WhatsApp contact. The legacy site relied heavily on WhatsApp for
 * enquiries and bulk Chivar orders, so it stays a first-class entry point.
 */
export function WhatsAppButton() {
  const { settings } = useCatalog();
  const pathname = usePathname();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1400);
    return () => clearTimeout(t);
  }, []);

  // Would sit on top of the sticky checkout summary.
  if (pathname.startsWith("/checkout") || pathname.startsWith("/admin")) return null;

  const href = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
    "Welcome to Sugat Book Depot! How can we assist you today?",
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "group fixed bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] py-3 pl-3.5 pr-4 text-white shadow-lift",
        "transition-all duration-500 ease-[var(--ease-paper)] hover:pr-5",
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      )}
    >
      <WhatsAppIcon className="size-5 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-400 group-hover:max-w-40 sm:max-w-40">
        Chat with us
      </span>
    </a>
  );
}
