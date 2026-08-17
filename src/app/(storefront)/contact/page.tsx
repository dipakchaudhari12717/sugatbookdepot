"use client";

import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useState } from "react";

import { useCatalog } from "@/lib/catalog-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { createEnquiry } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import { isValidEmail, isValidPhone } from "@/lib/utils";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/brand-icons";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";

export default function ContactPage() {
  const { settings } = useCatalog();
  const toast = useToast();

  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Please tell us your name.");
    if (!isValidEmail(form.email)) return setError("Please enter a valid email address.");
    if (form.phone && !isValidPhone(form.phone)) return setError("That phone number doesn't look right.");
    if (!form.message.trim()) return setError("Please write a short message.");

    setSending(true);
    try {
      if (isFirebaseConfigured) {
        await createEnquiry({ ...form, kind: "contact" });
      }
      setSent(true);
      toast("Thank you — we'll get back to you soon.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      setError("We could not send that just now. Please try WhatsApp or email instead.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">Contact</p>
        <h1 className="rule-ornament mt-4 font-display text-4xl leading-tight font-semibold text-ink sm:text-5xl">
          We're happy to help
        </h1>
        <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">
          Questions about a title, a bulk Chivar order for your vihara, or an order already on its
          way — reach us whichever way suits you.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
          {/* Form */}
          <Card className="p-7">
            <h2 className="font-display text-xl font-semibold text-ink">Send us a message</h2>

            {sent ? (
              <div className="mt-6 rounded-xl border border-leaf/25 bg-leaf/6 px-5 py-6 text-center">
                <p className="font-display text-lg font-semibold text-ink">Message received</p>
                <p className="mt-2 text-sm text-ink-soft">
                  Thank you for writing to us. We usually reply within a working day.
                </p>
                <Button variant="secondary" size="sm" className="mt-5" onClick={() => setSent(false)}>
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Your name" required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email address" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                  />
                </Field>
                <Field label="Phone (optional)">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    autoComplete="tel"
                  />
                </Field>
                <Field label="Subject">
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Bulk Chivar order, book enquiry…"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Message" required>
                    <Textarea
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="How can we help?"
                    />
                  </Field>
                </div>

                {error && (
                  <p className="sm:col-span-2 rounded-lg bg-maroon/8 px-3.5 py-2.5 text-xs text-maroon">
                    {error}
                  </p>
                )}

                <div className="sm:col-span-2">
                  <Button type="submit" size="lg" loading={sending}>
                    <Send className="size-4" /> Send message
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Details */}
          <aside className="space-y-4">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Reach us directly</h2>
              <ul className="mt-5 space-y-4 text-sm">
                <li>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="flex items-start gap-3 text-ink-soft transition hover:text-saffron-deep"
                  >
                    <Mail className="mt-0.5 size-4 shrink-0 text-saffron" />
                    <span>
                      <span className="block text-xs text-ink-faint">Email</span>
                      {settings.contactEmail}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                    className="flex items-start gap-3 text-ink-soft transition hover:text-saffron-deep"
                  >
                    <Phone className="mt-0.5 size-4 shrink-0 text-saffron" />
                    <span>
                      <span className="block text-xs text-ink-faint">Phone</span>
                      {settings.contactPhone}
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 text-ink-soft">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-saffron" />
                  <span>
                    <span className="block text-xs text-ink-faint">Shop</span>
                    Nagpur, Maharashtra, India
                  </span>
                </li>
              </ul>

              <a
                href={`https://wa.me/${settings.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95"
              >
                <WhatsAppIcon className="size-4" /> Chat on WhatsApp
              </a>
            </Card>

            <Card className="p-6">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink">
                Follow along
              </h2>
              <div className="mt-4 flex gap-2">
                <a
                  href="https://www.facebook.com/profile.php?id=100088998762000"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex size-10 items-center justify-center rounded-full border border-rule text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
                >
                  <FacebookIcon className="size-4" />
                </a>
                <a
                  href="https://www.instagram.com/sugat_book_depot/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex size-10 items-center justify-center rounded-full border border-rule text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
                >
                  <InstagramIcon className="size-4" />
                </a>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
