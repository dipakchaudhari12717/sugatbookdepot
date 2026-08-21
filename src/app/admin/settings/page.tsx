"use client";

import { useEffect, useState } from "react";

import { useCatalog } from "@/lib/catalog-context";
import { isFirebaseConfigured, isRazorpayConfigured } from "@/lib/firebase";
import { saveSettings } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { StoreSettings } from "@/lib/types";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/admin/admin-ui";

export default function AdminSettingsPage() {
  const { settings } = useCatalog();
  const toast = useToast();

  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [busy, setBusy] = useState(false);
  const [pincodeText, setPincodeText] = useState("");

  useEffect(() => {
    setDraft(settings);
    setPincodeText((settings.serviceablePincodes ?? []).join(", "));
  }, [settings]);

  async function save() {
    setBusy(true);
    try {
      await saveSettings({
        ...draft,
        freeShippingThreshold: Number(draft.freeShippingThreshold) || 0,
        shippingFlatRate: Number(draft.shippingFlatRate) || 0,
        serviceablePincodes: pincodeText
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      });
      toast("Settings saved");
    } catch (err) {
      console.error(err);
      toast("Could not save settings. Check that you're signed in as an admin.", "error");
    } finally {
      setBusy(false);
    }
  }

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <PageHeader
        title="Shop settings"
        description="Delivery charges, payment methods and the details shown across the site."
        action={
          <Button onClick={save} loading={busy} disabled={!isFirebaseConfigured}>
            Save settings
          </Button>
        }
      />

      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        {/* Delivery */}
        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-semibold text-ink">Delivery</h2>
          <div className="space-y-4">
            <Field label="Free delivery above (₹)" hint="Orders at or above this ship free">
              <Input
                type="number"
                min={0}
                value={draft.freeShippingThreshold}
                onChange={(e) => set("freeShippingThreshold", Number(e.target.value))}
              />
            </Field>
            <Field label="Delivery charge (₹)" hint="Applied below the free-delivery threshold">
              <Input
                type="number"
                min={0}
                value={draft.shippingFlatRate}
                onChange={(e) => set("shippingFlatRate", Number(e.target.value))}
              />
            </Field>
            <Field
              label="Serviceable PIN codes"
              hint="Comma-separated prefixes, e.g. 440, 441. Leave blank to deliver everywhere."
            >
              <Textarea
                rows={3}
                value={pincodeText}
                onChange={(e) => setPincodeText(e.target.value)}
                placeholder="Leave blank to deliver across India"
              />
            </Field>
          </div>
        </Card>

        {/* Payments */}
        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-semibold text-ink">Payments</h2>
          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={draft.codEnabled}
                onChange={(e) => set("codEnabled", e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-saffron)]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">Cash on Delivery</span>
                <span className="block text-xs text-ink-faint">
                  Customers pay the courier on arrival.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={draft.upiEnabled}
                onChange={(e) => set("upiEnabled", e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-saffron)]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">UPI transfer</span>
                <span className="block text-xs text-ink-faint">
                  Customers pay to your UPI ID and submit the reference number.
                </span>
              </span>
            </label>

            <Field label="UPI ID">
              <Input
                value={draft.upiId}
                onChange={(e) => set("upiId", e.target.value)}
                placeholder="yourshop@upi"
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={draft.razorpayEnabled ?? false}
                onChange={(e) => set("razorpayEnabled", e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-saffron)]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  Card, UPI, net banking &amp; wallets — via Razorpay
                </span>
                <span className="block text-xs text-ink-faint">
                  {isRazorpayConfigured
                    ? "Keys are configured. Customers can pay by card at checkout."
                    : "Waiting on the Razorpay keys. Until they are added this option stays hidden from customers, even when ticked."}
                </span>
              </span>
            </label>

            <p className="rounded-xl bg-paper-sunk px-4 py-3 text-xs leading-relaxed text-ink-soft">
              {isRazorpayConfigured
                ? "Razorpay is live. Payments settle to the bank account registered on your Razorpay dashboard."
                : "To switch card payments on, add NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET to the site's environment variables. Nothing else needs to change."}
            </p>
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-semibold text-ink">Contact details</h2>
          <div className="space-y-4">
            <Field label="Contact email">
              <Input
                type="email"
                value={draft.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </Field>
            <Field label="Contact phone">
              <Input
                value={draft.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </Field>
            <Field
              label="WhatsApp number"
              hint="Country code, no + or spaces — e.g. 917709001950"
            >
              <Input
                value={draft.whatsappNumber}
                onChange={(e) => set("whatsappNumber", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </div>
        </Card>

        {/* Shopfront banner */}
        <Card className="p-6">
          <h2 className="mb-1.5 font-display text-lg font-semibold text-ink">Shopfront banner</h2>
          <p className="mb-5 text-xs text-ink-faint">
            The blue sign shown across the very top of every page.
          </p>
          <Field label="Which version to show">
            <Select
              value={draft.bannerLang ?? "both"}
              onChange={(e) => set("bannerLang", e.target.value as "both" | "mr" | "en" | "off")}
            >
              <option value="both">Both — Marathi above English</option>
              <option value="mr">Marathi only</option>
              <option value="en">English only</option>
              <option value="off">Hide the banner</option>
            </Select>
          </Field>
          <p className="mt-3 rounded-xl bg-paper-sunk px-4 py-3 text-xs leading-relaxed text-ink-soft">
            Both language versions are already loaded, so switching takes effect
            immediately — nothing needs to be re-uploaded.
          </p>
        </Card>

        {/* Announcement */}
        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-semibold text-ink">Announcement bar</h2>
          <Field
            label="Message"
            hint="Shown across the top of every page. Leave blank to hide the bar."
          >
            <Textarea
              rows={3}
              value={draft.announcement}
              onChange={(e) => set("announcement", e.target.value)}
              placeholder="Free delivery across India on orders above ₹499"
            />
          </Field>

          {draft.announcement && (
            <div className="mt-4">
              <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Preview
              </p>
              <div className="rounded-lg bg-ink px-4 py-2 text-center">
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-paper">
                  {draft.announcement}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Button className="mt-6" onClick={save} loading={busy} disabled={!isFirebaseConfigured}>
        Save settings
      </Button>
    </div>
  );
}
