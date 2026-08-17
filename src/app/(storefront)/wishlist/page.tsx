"use client";

import { Heart } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { useCatalog } from "@/lib/catalog-context";
import { ProductCard } from "@/components/product-card";
import { EmptyState, LinkButton, Reveal, Spinner } from "@/components/ui";

export default function WishlistPage() {
  const { wishlist, ready } = useCart();
  const { byId, loading } = useCatalog();

  const products = wishlist.map((id) => byId.get(id)).filter((p) => p != null);

  if (!ready || loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="rule-ornament font-display text-3xl font-semibold text-ink sm:text-4xl">
        Your wishlist
      </h1>
      <p className="mt-4 text-sm text-ink-soft">
        {products.length
          ? `${products.length} ${products.length === 1 ? "title" : "titles"} saved for later.`
          : "Titles you save will wait for you here."}
      </p>

      <div className="mt-10">
        {products.length === 0 ? (
          <EmptyState
            icon={<Heart className="size-6" />}
            title="Nothing saved yet"
            description="Tap the heart on any product to keep it here for your next visit."
            action={<LinkButton href="/shop">Browse the collection</LinkButton>}
          />
        ) : (
          <div className="shelf grid grid-cols-2 gap-x-5 gap-y-11 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 8) * 45}>
                <ProductCard product={p} priority={i < 4} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
