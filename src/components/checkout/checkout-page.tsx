"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Check, ChevronLeft, Lock, Smartphone, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCatalog } from "@/lib/catalog-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { createOrder, evaluateCoupon, findCoupon, updateUserProfile } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Address, Coupon, PaymentMethod } from "@/lib/types";
import {
  cn,
  formatPrice,
  isValidEmail,
  isValidPhone,
  isValidPincode,
} from "@/lib/utils";
import { Button, Card, Field, Input, LinkButton, Select, Spinner, Textarea } from "@/components/ui";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman & Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu",
  "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const EMPTY_ADDRESS: Address = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "Maharashtra",
  pincode: "",
  landmark: "",
};

type Errors = Partial<Record<keyof Address | "email", string>>;

export function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear, ready } = useCart();
  const { settings } = useCatalog();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [paymentRef, setPaymentRef] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [placing, setPlacing] = useState(false);

  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // Prefill from the signed-in customer's saved profile.
  useEffect(() => {
    if (!profile) return;
    setEmail((prev) => prev || profile.email);
    const saved = profile.addresses?.[0];
    if (saved) setAddress((prev) => (prev.line1 ? prev : saved));
    else if (profile.phone) setAddress((prev) => ({ ...prev, phone: prev.phone || profile.phone }));
    if (profile.displayName) {
      setAddress((prev) => ({ ...prev, fullName: prev.fullName || profile.displayName }));
    }
  }, [profile]);

  useEffect(() => {
    if (ready && lines.length === 0 && !placing) router.replace("/cart");
  }, [ready, lines.length, placing, router]);

  const { discount } = evaluateCoupon(coupon, subtotal);
  const afterDiscount = subtotal - discount;
  const shipping =
    afterDiscount >= settings.freeShippingThreshold ? 0 : settings.shippingFlatRate;
  const total = afterDiscount + shipping;

  /** Delivery-zone check (FR-9.3): empty list means we ship everywhere. */
  const pincodeServiceable = useMemo(() => {
    const list = settings.serviceablePincodes;
    if (!list?.length) return true;
    if (!isValidPincode(address.pincode)) return true;
    return list.some((prefix) => address.pincode.startsWith(prefix.trim()));
  }, [settings.serviceablePincodes, address.pincode]);

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !isFirebaseConfigured) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const found = await findCoupon(code);
      const { error } = evaluateCoupon(found, subtotal);
      if (error) {
        setCoupon(null);
        setCouponError(error);
      } else {
        setCoupon(found);
        toast(`Coupon ${found!.code} applied`);
      }
    } catch {
      setCouponError("Could not check that code right now.");
    } finally {
      setCheckingCoupon(false);
    }
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!address.fullName.trim()) next.fullName = "Please enter the recipient's name.";
    if (!isValidPhone(address.phone)) next.phone = "Enter a valid 10-digit mobile number.";
    if (!isValidEmail(email)) next.email = "We need a valid email to send your receipt.";
    if (!address.line1.trim()) next.line1 = "Please enter the street address.";
    if (!address.city.trim()) next.city = "Please enter the city.";
    if (!isValidPincode(address.pincode)) next.pincode = "Enter a valid 6-digit PIN code.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(next).length === 0;
  }

  async function placeOrder() {
    if (!validate()) return;
    if (!pincodeServiceable) {
      toast("We do not deliver to that PIN code yet. Please contact us.", "error");
      return;
    }
    if (!isFirebaseConfigured) {
      toast("Checkout needs the Firebase connection to be configured.", "error");
      return;
    }

    setPlacing(true);
    try {
      const order = await createOrder({
        userId: user?.uid ?? null,
        isGuest: !user,
        email: email.trim(),
        phone: address.phone.trim(),
        address,
        lines,
        subtotal,
        discount,
        couponCode: coupon?.code ?? null,
        shipping,
        total,
        paymentMethod: payment,
        paymentStatus: payment === "cod" ? "pending" : "awaiting_verification",
        paymentReference: payment === "upi" ? paymentRef.trim() || null : null,
        trackingCarrier: null,
        trackingNumber: null,
        notes: notes.trim() || null,
      });

      // Save the address back to the profile for next time.
      if (user && saveAddress) {
        const existing = profile?.addresses ?? [];
        const already = existing.some(
          (a) => a.line1 === address.line1 && a.pincode === address.pincode,
        );
        if (!already) {
          updateUserProfile(user.uid, {
            addresses: [address, ...existing].slice(0, 5),
            phone: profile?.phone || address.phone,
          }).catch((err) => console.error("[checkout] could not save address", err));
        }
      }

      clear();
      router.push(`/orders/${order.id}?placed=1`);
    } catch (err) {
      console.error("[checkout] order failed", err);
      toast("We could not place that order. Please try again.", "error");
      setPlacing(false);
    }
  }

  function set<K extends keyof Address>(key: K, value: Address[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  if (!ready) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (lines.length === 0) return null;

  return (
    <div className="container-page py-10 lg:py-14">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> Back to bag
      </Link>

      <h1 className="rule-ornament mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Checkout
      </h1>

      {!user && (
        <p className="mt-4 text-sm text-ink-soft">
          Checking out as a guest.{" "}
          <Link href="/login?next=/checkout" className="font-medium text-saffron-deep underline underline-offset-2">
            Sign in
          </Link>{" "}
          to save your addresses and track orders.
        </p>
      )}

      <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        {/* ---------------- Form ---------------- */}
        <div className="space-y-8">
          {/* Contact */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Contact</h2>
            <p className="mt-1 text-xs text-ink-faint">
              We'll send your order confirmation and delivery updates here.
            </p>
            <div className="mt-5" data-error={Boolean(errors.email)}>
              <Field label="Email address" required error={errors.email}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
            </div>
          </Card>

          {/* Delivery address */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Delivery address</h2>

            {/* Saved addresses */}
            {profile?.addresses && profile.addresses.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.addresses.map((saved, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAddress(saved)}
                    className={cn(
                      "rounded-xl border px-3.5 py-2.5 text-left text-xs transition",
                      address.line1 === saved.line1 && address.pincode === saved.pincode
                        ? "border-saffron bg-saffron-wash"
                        : "border-rule bg-paper hover:border-saffron/50",
                    )}
                  >
                    <span className="block font-medium text-ink">{saved.fullName}</span>
                    <span className="block text-ink-faint">
                      {saved.line1}, {saved.city} {saved.pincode}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div data-error={Boolean(errors.fullName)}>
                <Field label="Full name" required error={errors.fullName}>
                  <Input
                    value={address.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder="Recipient's name"
                    autoComplete="name"
                  />
                </Field>
              </div>
              <div data-error={Boolean(errors.phone)}>
                <Field label="Mobile number" required error={errors.phone}>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={address.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="98765 43210"
                    autoComplete="tel"
                  />
                </Field>
              </div>

              <div className="sm:col-span-2" data-error={Boolean(errors.line1)}>
                <Field label="Address" required error={errors.line1}>
                  <Input
                    value={address.line1}
                    onChange={(e) => set("line1", e.target.value)}
                    placeholder="House / flat number, building, street"
                    autoComplete="address-line1"
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Area, locality (optional)">
                  <Input
                    value={address.line2}
                    onChange={(e) => set("line2", e.target.value)}
                    placeholder="Colony, area, sector"
                    autoComplete="address-line2"
                  />
                </Field>
              </div>

              <div data-error={Boolean(errors.city)}>
                <Field label="City" required error={errors.city}>
                  <Input
                    value={address.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Nagpur"
                    autoComplete="address-level2"
                  />
                </Field>
              </div>

              <Field label="State" required>
                <Select value={address.state} onChange={(e) => set("state", e.target.value)}>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>

              <div data-error={Boolean(errors.pincode)}>
                <Field
                  label="PIN code"
                  required
                  error={errors.pincode}
                  hint={
                    !pincodeServiceable && isValidPincode(address.pincode)
                      ? undefined
                      : undefined
                  }
                >
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={address.pincode}
                    onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
                    placeholder="440001"
                    autoComplete="postal-code"
                  />
                </Field>
                {!pincodeServiceable && (
                  <p className="mt-1.5 text-xs text-maroon">
                    We don't deliver to this PIN code yet — please contact us.
                  </p>
                )}
              </div>

              <Field label="Landmark (optional)">
                <Input
                  value={address.landmark}
                  onChange={(e) => set("landmark", e.target.value)}
                  placeholder="Near the vihara"
                />
              </Field>
            </div>

            {user && (
              <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-[0.8125rem] text-ink-soft">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="size-4 accent-[var(--color-saffron)]"
                />
                Save this address for next time
              </label>
            )}
          </Card>

          {/* Payment */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Payment</h2>

            <div className="mt-5 space-y-3">
              {settings.codEnabled && (
                <button
                  type="button"
                  onClick={() => setPayment("cod")}
                  className={cn(
                    "flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition",
                    payment === "cod"
                      ? "border-saffron bg-saffron-wash"
                      : "border-rule bg-paper hover:border-saffron/50",
                  )}
                >
                  <Banknote className="mt-0.5 size-5 shrink-0 text-saffron" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">Cash on Delivery</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      Pay the courier in cash when your parcel arrives.
                    </span>
                  </span>
                  {payment === "cod" && <Check className="size-4 shrink-0 text-saffron" />}
                </button>
              )}

              {settings.upiEnabled && (
                <button
                  type="button"
                  onClick={() => setPayment("upi")}
                  className={cn(
                    "flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition",
                    payment === "upi"
                      ? "border-saffron bg-saffron-wash"
                      : "border-rule bg-paper hover:border-saffron/50",
                  )}
                >
                  <Smartphone className="mt-0.5 size-5 shrink-0 text-saffron" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">UPI transfer</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      Pay to {settings.upiId}, then enter the reference number below.
                    </span>
                  </span>
                  {payment === "upi" && <Check className="size-4 shrink-0 text-saffron" />}
                </button>
              )}
            </div>

            {payment === "upi" && (
              <div className="mt-4 rounded-xl bg-paper-sunk p-4">
                <p className="text-xs leading-relaxed text-ink-soft">
                  Send <strong className="text-ink">{formatPrice(total)}</strong> to{" "}
                  <strong className="text-ink">{settings.upiId}</strong> from any UPI app, then paste
                  the 12-digit UTR / reference number here. We confirm your order once the payment
                  shows up.
                </p>
                <div className="mt-3">
                  <Field label="UPI reference / UTR (optional now)">
                    <Input
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. 402512345678"
                    />
                  </Field>
                </div>
              </div>
            )}

            <p className="mt-4 flex items-start gap-2 text-xs text-ink-faint">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              Card and net-banking payments will be enabled once the Razorpay account is live. Until
              then, COD and UPI cover every order.
            </p>

            <div className="mt-5">
              <Field label="Order notes (optional)">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery instructions, gift message, or anything we should know."
                  rows={3}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* ---------------- Summary ---------------- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Your order</h2>

            <ul className="mt-5 max-h-64 space-y-3.5 overflow-y-auto pr-1">
              {lines.map((line) => (
                <li key={line.lineId} className="flex gap-3">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-paper-sunk">
                    {line.image && (
                      <Image src={line.image} alt="" fill sizes="48px" className="object-cover" />
                    )}
                    <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-ink text-[0.5625rem] font-bold text-paper">
                      {line.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium leading-snug text-ink">
                      {line.title}
                    </p>
                    {Object.entries(line.selectedOptions).length > 0 && (
                      <p className="mt-0.5 text-[0.6875rem] text-ink-faint">
                        {Object.values(line.selectedOptions).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-ink">
                    {formatPrice(line.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <form onSubmit={applyCoupon} className="mt-5 border-t border-rule pt-5">
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Coupon code"
                  className="h-10 uppercase"
                />
                <Button type="submit" variant="secondary" size="sm" loading={checkingCoupon}>
                  Apply
                </Button>
              </div>
              {couponError && <p className="mt-1.5 text-xs text-maroon">{couponError}</p>}
            </form>

            <dl className="mt-5 space-y-2.5 border-t border-rule pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-medium text-ink">{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Coupon {coupon?.code}</dt>
                  <dd className="font-medium text-leaf">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="flex items-center gap-1.5 text-ink-soft">
                  <Truck className="size-3.5" /> Delivery
                </dt>
                <dd className="font-medium text-ink">
                  {shipping === 0 ? <span className="text-leaf">Free</span> : formatPrice(shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-rule pt-3.5">
                <dt className="font-display text-base font-semibold text-ink">Total</dt>
                <dd className="font-display text-xl font-semibold text-ink">{formatPrice(total)}</dd>
              </div>
            </dl>

            <Button size="lg" full className="mt-6" onClick={placeOrder} loading={placing}>
              {payment === "cod" ? "Place order" : "Place order & pay"}
            </Button>

            <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-ink-faint">
              By placing this order you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-2">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                privacy policy
              </Link>
              .
            </p>
          </Card>

          {!isFirebaseConfigured && (
            <p className="mt-4 rounded-xl border border-maroon/25 bg-maroon/6 px-4 py-3 text-xs text-maroon">
              Firebase is not configured, so orders cannot be saved yet. Add your keys to
              <code className="mx-1">.env.local</code> and restart the dev server.
            </p>
          )}

          <LinkButton href="/shop" variant="ghost" size="sm" full className="mt-3">
            Continue shopping
          </LinkButton>
        </aside>
      </div>
    </div>
  );
}
