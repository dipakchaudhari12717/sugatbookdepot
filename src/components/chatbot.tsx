"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareText, RotateCcw, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isRazorpayConfigured } from "@/lib/firebase";
import { useCatalog } from "@/lib/catalog-context";
import { cn, formatPrice } from "@/lib/utils";
import { WhatsAppIcon } from "./brand-icons";

/**
 * "Sugat Sahayak" — a scripted shop assistant.
 *
 * Deliberately rule-based rather than an LLM: it costs nothing to run, works
 * offline of any API key, and can only ever say things the shop has approved.
 * Answers are matched on keywords, and anything it cannot answer is handed to
 * WhatsApp rather than guessed at.
 */

interface Reply {
  text: string;
  /** Optional links rendered as buttons under the reply. */
  links?: { label: string; href: string; external?: boolean }[];
}

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  links?: Reply["links"];
}

interface Rule {
  id: string;
  /** Any of these matching the message wins. */
  keywords: string[];
  reply: (ctx: Ctx) => Reply;
}

interface Ctx {
  freeShipping: number;
  shippingFlat: number;
  onlinePayment: boolean;
  whatsapp: string;
  phone: string;
  email: string;
  chivarPrice: string | null;
  chivarSlug: string | null;
  productCount: number;
}

const QUICK_PROMPTS = [
  "Chivar Daan",
  "Delivery & charges",
  "Track my order",
  "Payment options",
  "Bulk order for a vihara",
  "Do you have this book?",
];

const RULES: Rule[] = [
  {
    id: "chivar",
    keywords: ["chivar", "robe", "civar", "kathina", "varshavas", "daan", "dana", "monk"],
    reply: (c) => ({
      text:
        `Our Chivar is woven to Vinaya-prescribed patterns in breathable cotton, ` +
        `in three traditional shades — Orange, Brown and Yellow — as a free-size 2-piece set` +
        (c.chivarPrice ? `, at ${c.chivarPrice}.` : ".") +
        `\n\nOn the product page you can pick a shade and the photographs change to match. ` +
        `For Varshavas or Kathina offerings we also handle bulk orders for viharas and monastery trusts.`,
      links: [
        { label: "View Chivar", href: c.chivarSlug ? `/product/${c.chivarSlug}` : "/shop?category=chivar" },
        { label: "Ask about bulk pricing", href: bulkHref(c), external: true },
      ],
    }),
  },
  {
    id: "delivery",
    keywords: ["deliver", "delivery", "ship", "shipping", "courier", "charges", "how long", "days", "dispatch"],
    reply: (c) => ({
      text:
        `We deliver across India from Nagpur. Delivery is free on orders above ${formatPrice(c.freeShipping)}; ` +
        `below that a flat ${formatPrice(c.shippingFlat)} applies, shown at checkout before you pay.\n\n` +
        `Orders are packed in 1–2 working days. Delivery is usually 3–7 working days within Maharashtra ` +
        `and 5–10 elsewhere in India. Festival and Kathina season can add a few days.`,
      links: [{ label: "Shipping & returns", href: "/shipping" }],
    }),
  },
  {
    id: "track",
    keywords: ["track", "order status", "where is my", "my order", "delivered yet", "shipment"],
    reply: () => ({
      text:
        `You can follow an order from Placed → Confirmed → Packed → Shipped → Delivered.\n\n` +
        `If you have an account, open My orders. If you checked out as a guest, use your order ` +
        `number (it looks like SBD-XXXXXX) on the tracking page.`,
      links: [
        { label: "Track an order", href: "/orders" },
        { label: "My account", href: "/account" },
      ],
    }),
  },
  {
    id: "payment",
    keywords: ["pay", "payment", "upi", "cod", "cash on delivery", "card", "razorpay", "netbanking", "gpay", "phonepe"],
    reply: (c) => ({
      text: c.onlinePayment
        ? `Two ways to pay:\n\n` +
          `• Pay online — card, UPI, net banking or wallet, handled securely by ` +
          `Razorpay. Your order is confirmed the moment the payment goes through.\n` +
          `• Cash on Delivery — pay the courier when your parcel arrives.`
        : `Cash on Delivery for now — pay the courier when your parcel arrives.\n\n` +
          `Card, UPI and net banking are arriving shortly, once our payment gateway is approved.`,
      links: [{ label: "Go to checkout", href: "/checkout" }],
    }),
  },
  {
    id: "bulk",
    keywords: ["bulk", "wholesale", "vihara", "monastery", "institution", "school", "quantity", "discount for", "trust"],
    reply: (c) => ({
      text:
        `Yes — we supply viharas, monastery trusts, schools and institutions at special pricing, ` +
        `with consolidated dispatch. That covers Chivar for Kathina camps as well as book orders.\n\n` +
        `Message us with what you need and roughly how many, and we will send a quote.`,
      links: [
        { label: "Message us on WhatsApp", href: bulkHref(c), external: true },
        { label: "Contact form", href: "/contact" },
      ],
    }),
  },
  {
    id: "returns",
    keywords: ["return", "refund", "damaged", "damage", "exchange", "wrong item", "cancel"],
    reply: () => ({
      text:
        `If a book arrives damaged or you receive the wrong title, tell us within 7 days with a ` +
        `photograph and we will replace it or refund you.\n\n` +
        `Chivar is a religious article, so robes can only be returned unused, unwashed and in their ` +
        `original packing. Orders can be cancelled any time before they are marked packed.`,
      links: [{ label: "Full policy", href: "/shipping" }],
    }),
  },
  {
    id: "books",
    keywords: ["book", "title", "ambedkar", "buddha", "dhamma", "marathi", "hindi", "pali", "jatak", "author", "available", "stock", "have"],
    reply: (c) => ({
      text:
        `We stock ${c.productCount} products — Buddhist literature, the writings and speeches of ` +
        `Dr. Babasaheb Ambedkar, biographies, competitive-exam guides, Chivar, Buddha statues and stationery. ` +
        `Titles come in Marathi, Hindi, Pali and English.\n\n` +
        `The quickest way to check a specific title is the search box at the top of the page — it matches ` +
        `titles, authors and languages. If we do not list it, we can often source it.`,
      links: [
        { label: "Browse all products", href: "/shop" },
        { label: "Ask us to source a title", href: "/contact" },
      ],
    }),
  },
  {
    id: "hours",
    keywords: ["shop", "address", "location", "visit", "timing", "hours", "open", "nagpur", "where are you"],
    reply: (c) => ({
      text:
        `Our shop is in Nagpur, Maharashtra, and has been running since 1967. ` +
        `For directions or shop timings the quickest route is a call or a WhatsApp message.\n\n` +
        `Phone: ${c.phone}\nEmail: ${c.email}`,
      links: [
        { label: "Contact details", href: "/contact" },
        { label: "See the gallery", href: "/gallery" },
      ],
    }),
  },
  {
    id: "account",
    keywords: ["account", "login", "sign in", "register", "password", "wishlist"],
    reply: () => ({
      text:
        `An account keeps your bag, wishlist and delivery addresses together, and lets you follow ` +
        `every order. You can also check out as a guest without creating one.`,
      links: [
        { label: "Sign in or register", href: "/login" },
        { label: "My wishlist", href: "/wishlist" },
      ],
    }),
  },
  {
    id: "coupon",
    keywords: ["coupon", "code", "offer", "discount", "sale", "promo"],
    reply: () => ({
      text:
        `Discount codes go in the "Have a coupon?" box in your bag or at checkout, and the saving is ` +
        `applied before you pay. Seasonal offers are announced in the bar at the top of the site and ` +
        `to our newsletter subscribers.`,
      links: [{ label: "View your bag", href: "/cart" }],
    }),
  },
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "namaste", "namaskar", "jai bhim", "jaibhim", "good morning", "good evening"],
    reply: () => ({
      text:
        `Namaste, and welcome to Sugat Book Depot 🙏\n\n` +
        `I can help with Chivar Daan, delivery, payment, order tracking and bulk orders. ` +
        `What would you like to know?`,
    }),
  },
  {
    id: "thanks",
    keywords: ["thank", "thanks", "dhanyavad", "great", "ok thanks", "bye"],
    reply: () => ({
      text: `Happy to help. May your reading and practice go well 🙏`,
    }),
  },
];

function bulkHref(c: Ctx) {
  return `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(
    "Hello, I would like a quote for a bulk order from Sugat Book Depot.",
  )}`;
}

function fallback(c: Ctx): Reply {
  return {
    text:
      `I am not sure about that one — I only know the shop basics: Chivar, delivery, payment, ` +
      `order tracking, returns and bulk orders.\n\n` +
      `For anything else our team will answer properly on WhatsApp, usually within a working day.`,
    links: [
      { label: "Chat on WhatsApp", href: `https://wa.me/${c.whatsapp}`, external: true },
      { label: "Send a message", href: "/contact" },
    ],
  };
}

/** Score each rule by how many of its keywords appear in the message. */
function answer(input: string, c: Ctx): Reply {
  const text = input.toLowerCase();
  let best: { rule: Rule; score: number } | null = null;

  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw)) score += kw.length > 4 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { rule, score };
  }

  return best ? best.rule.reply(c) : fallback(c);
}

export function Chatbot() {
  const pathname = usePathname();
  const { settings, products } = useCatalog();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nudged, setNudged] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const ctx = useMemo<Ctx>(() => {
    const chivar = products.find((p) => p.category === "chivar");
    return {
      freeShipping: settings.freeShippingThreshold,
      shippingFlat: settings.shippingFlatRate,
      onlinePayment: Boolean(settings.razorpayEnabled && isRazorpayConfigured),
      whatsapp: settings.whatsappNumber,
      phone: settings.contactPhone,
      email: settings.contactEmail,
      chivarPrice: chivar ? formatPrice(chivar.price) : null,
      chivarSlug: chivar?.slug ?? null,
      productCount: products.length,
    };
  }, [settings, products]);

  const greet = useCallback(() => {
    setMessages([
      {
        id: nextId.current++,
        from: "bot",
        text:
          "Namaste 🙏 I'm Sugat Sahayak, the shop assistant.\n\n" +
          "Ask me about Chivar Daan, delivery, payment, tracking an order or bulk orders for a vihara.",
      },
    ]);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) greet();
  }, [open, messages.length, greet]);

  // Gentle one-time nudge so the assistant is noticed without nagging.
  useEffect(() => {
    if (nudged) return;
    const t = setTimeout(() => setNudged(true), 6000);
    return () => clearTimeout(t);
  }, [nudged]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      setMessages((prev) => [...prev, { id: nextId.current++, from: "user", text }]);
      setInput("");
      setTyping(true);

      // A short pause reads as considered rather than instant and robotic.
      const reply = answer(text, ctx);
      window.setTimeout(
        () => {
          setTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: nextId.current++, from: "bot", text: reply.text, links: reply.links },
          ]);
        },
        420 + Math.random() * 280,
      );
    },
    [ctx],
  );

  // The admin panel has its own chrome; keep the assistant to the storefront.
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close the shop assistant" : "Open the shop assistant"}
        aria-expanded={open}
        className={cn(
          "fixed bottom-4 right-4 z-[70] flex items-center gap-2.5 rounded-full py-3 pl-3.5 pr-4 shadow-lift",
          "transition-all duration-400 ease-[var(--ease-paper)] active:scale-95",
          open
            ? "bg-ink text-paper"
            : "bg-saffron text-white hover:bg-saffron-deep",
        )}
      >
        {open ? (
          <X className="size-5 shrink-0" />
        ) : (
          <MessageSquareText className="size-5 shrink-0" />
        )}
        <span className="hidden text-sm font-medium sm:inline">
          {open ? "Close" : "Ask us"}
        </span>
        {!open && nudged && messages.length === 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-maroon opacity-70" />
            <span className="relative inline-flex size-3 rounded-full bg-maroon" />
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Sugat Sahayak, the shop assistant"
          className={cn(
            "fixed z-[75] flex flex-col overflow-hidden border border-rule bg-paper-raised shadow-lift",
            "inset-x-3 bottom-20 max-h-[72vh] rounded-2xl",
            "sm:inset-x-auto sm:right-4 sm:w-[23rem] sm:max-h-[34rem]",
          )}
          style={{ animation: "rise 0.28s var(--ease-paper)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-rule bg-gradient-to-br from-saffron-wash to-paper-raised px-4 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-saffron text-white">
              <MessageSquareText className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-ink">Sugat Sahayak</p>
              <p className="flex items-center gap-1.5 text-[0.6875rem] text-ink-faint">
                <span className="size-1.5 rounded-full bg-leaf" />
                Shop assistant · replies instantly
              </p>
            </div>
            <button
              type="button"
              onClick={greet}
              aria-label="Start over"
              className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.8125rem] leading-relaxed",
                    m.from === "user"
                      ? "rounded-br-sm bg-saffron text-white"
                      : "rounded-bl-sm bg-paper-sunk text-ink",
                  )}
                  style={{ animation: "rise 0.25s var(--ease-paper)" }}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.links && m.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.links.map((l) =>
                        l.external ? (
                          <a
                            key={l.href}
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-paper-raised px-3 py-1.5 text-[0.6875rem] font-medium text-saffron-deep shadow-page transition hover:bg-saffron hover:text-white"
                          >
                            <WhatsAppIcon className="size-3" />
                            {l.label}
                          </a>
                        ) : (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className="rounded-full bg-paper-raised px-3 py-1.5 text-[0.6875rem] font-medium text-saffron-deep shadow-page transition hover:bg-saffron hover:text-white"
                          >
                            {l.label}
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-paper-sunk px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full bg-ink-faint"
                      style={{
                        animation: "drift 1s ease-in-out infinite",
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick prompts, shown until the visitor asks something */}
            {messages.length <= 1 && !typing && (
              <div className="pt-1">
                <p className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Popular questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-full border border-rule bg-paper px-3 py-1.5 text-[0.6875rem] font-medium text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-rule bg-paper px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Chivar, delivery, payment…"
              aria-label="Your message"
              className="h-10 flex-1 rounded-full border border-rule-strong bg-paper-raised px-4 text-[0.8125rem] text-ink placeholder:text-ink-faint focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/25"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-saffron text-white transition hover:bg-saffron-deep disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
