"use client";

import Link from "next/link";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useState } from "react";

import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "./brand-icons";

import { useCatalog } from "@/lib/catalog-context";
import { createEnquiry } from "@/lib/repo";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { isValidEmail } from "@/lib/utils";
import { Button, Input } from "./ui";

export function SiteFooter() {
  const { categories, settings } = useCatalog();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast("Please enter a valid email address.", "error");
      return;
    }
    setSending(true);
    try {
      if (isFirebaseConfigured) {
        await createEnquiry({
          name: "",
          email: email.trim(),
          phone: "",
          subject: "Newsletter signup",
          message: "",
          kind: "newsletter",
        });
      }
      toast("Thank you — we'll keep you posted on new titles.");
      setEmail("");
    } catch {
      toast("Could not save that right now. Please try again.", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <footer className="mt-24 border-t border-rule bg-paper-sunk">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          {/* Brand */}
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-2xl font-semibold text-ink">Sugat</span>
              <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.24em] text-saffron-deep">
                Book Depot
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
              Since 1967, publishing and retailing Buddhist literature and the writings of
              Dr. Babasaheb Ambedkar — fostering knowledge and enlightenment.
            </p>
            <div className="mt-5 flex gap-2">
              <a
                href="https://www.facebook.com/profile.php?id=100088998762000"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex size-9 items-center justify-center rounded-full border border-rule bg-paper-raised text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
              >
                <FacebookIcon className="size-4" />
              </a>
              <a
                href="https://www.instagram.com/sugat_book_depot/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex size-9 items-center justify-center rounded-full border border-rule bg-paper-raised text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
              >
                <InstagramIcon className="size-4" />
              </a>
              <a
                href={`https://wa.me/${settings.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex size-9 items-center justify-center rounded-full border border-rule bg-paper-raised text-ink-soft transition hover:border-leaf hover:text-leaf"
              >
                <WhatsAppIcon className="size-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="eyebrow mb-4">Shop</h3>
            <ul className="space-y-2.5">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="text-sm text-ink-soft transition hover:text-saffron-deep"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/shop" className="text-sm text-ink-soft transition hover:text-saffron-deep">
                  All products
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="eyebrow mb-4">Help</h3>
            <ul className="space-y-2.5">
              {[
                ["Track your order", "/orders"],
                ["My account", "/account"],
                ["Wishlist", "/wishlist"],
                ["Gallery", "/gallery"],
                ["Blog", "/blog"],
                ["About us", "/about"],
                ["Contact", "/contact"],
                ["Shipping & returns", "/shipping"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-ink-soft transition hover:text-saffron-deep">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + newsletter */}
          <div>
            <h3 className="eyebrow mb-4">Get in touch</h3>
            <ul className="space-y-3 text-sm text-ink-soft">
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-start gap-2.5 transition hover:text-saffron-deep"
                >
                  <Mail className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                  {settings.contactEmail}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                  className="flex items-start gap-2.5 transition hover:text-saffron-deep"
                >
                  <Phone className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                  {settings.contactPhone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                Nagpur, Maharashtra, India
              </li>
            </ul>

            <form onSubmit={subscribe} className="mt-6">
              <label htmlFor="footer-email" className="mb-2 block text-xs font-medium text-ink">
                New titles &amp; festival offers
              </label>
              <div className="flex gap-2">
                <Input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-10 text-[0.8125rem]"
                />
                <Button type="submit" size="sm" loading={sending} aria-label="Subscribe">
                  {!sending && <Send className="size-3.5" />}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-rule pt-6 sm:flex-row">
          <p className="text-xs text-ink-faint">
            © {new Date().getFullYear()} Sugat Book Depot. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs text-ink-faint transition hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-ink-faint transition hover:text-ink">
              Terms
            </Link>
            <Link href="/shipping" className="text-xs text-ink-faint transition hover:text-ink">
              Shipping
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
