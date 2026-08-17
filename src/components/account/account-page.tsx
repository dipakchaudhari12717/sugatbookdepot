"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, MapPin, Package, Plus, Shield, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { updateUserProfile } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Address } from "@/lib/types";
import { isValidPhone, isValidPincode } from "@/lib/utils";
import { Button, Card, Field, Input, LinkButton, Modal, Select, Spinner } from "@/components/ui";

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

const EMPTY: Address = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "Maharashtra",
  pincode: "",
  landmark: "",
};

export function AccountPage() {
  const router = useRouter();
  const { user, profile, isAdmin, loading, logout } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Address>(EMPTY);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/account");
  }, [user, loading, router]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.displayName ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  if (loading || !user) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (phone && !isValidPhone(phone)) {
      toast("Enter a valid 10-digit mobile number.", "error");
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile(user.uid, { displayName: name.trim(), phone: phone.trim() });
      toast("Profile updated");
    } catch {
      toast("Could not save your profile right now.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveAddress() {
    if (!user) return;
    if (!draft.fullName.trim() || !draft.line1.trim() || !draft.city.trim()) {
      setAddressError("Name, address and city are required.");
      return;
    }
    if (!isValidPhone(draft.phone)) {
      setAddressError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!isValidPincode(draft.pincode)) {
      setAddressError("Enter a valid 6-digit PIN code.");
      return;
    }

    const list = [...(profile?.addresses ?? [])];
    if (editIndex != null) list[editIndex] = draft;
    else list.unshift(draft);

    try {
      await updateUserProfile(user.uid, { addresses: list.slice(0, 6) });
      toast(editIndex != null ? "Address updated" : "Address saved");
      setModalOpen(false);
      setAddressError(null);
    } catch {
      setAddressError("Could not save that address right now.");
    }
  }

  async function removeAddress(index: number) {
    if (!user) return;
    const list = (profile?.addresses ?? []).filter((_, i) => i !== index);
    try {
      await updateUserProfile(user.uid, { addresses: list });
      toast("Address removed");
    } catch {
      toast("Could not remove that address.", "error");
    }
  }

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="rule-ornament font-display text-3xl font-semibold text-ink sm:text-4xl">
        My account
      </h1>
      <p className="mt-4 text-sm text-ink-soft">{user.email}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_18rem] lg:gap-12">
        <div className="space-y-8">
          {/* Profile */}
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <User className="size-4 text-saffron" /> Profile
            </h2>
            <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </Field>
              <Field label="Mobile number">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" loading={savingProfile}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Addresses */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <MapPin className="size-4 text-saffron" /> Saved addresses
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft({ ...EMPTY, fullName: name, phone });
                  setEditIndex(null);
                  setAddressError(null);
                  setModalOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Add
              </Button>
            </div>

            {!profile?.addresses?.length ? (
              <p className="mt-5 rounded-xl border border-dashed border-rule-strong px-4 py-8 text-center text-sm text-ink-faint">
                No saved addresses yet. Add one to check out faster.
              </p>
            ) : (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {profile.addresses.map((a, i) => (
                  <li key={i} className="rounded-xl border border-rule bg-paper p-4">
                    <p className="text-sm font-medium text-ink">{a.fullName}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                      <br />
                      {a.city}, {a.state} {a.pincode}
                      <br />
                      {a.phone}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => {
                          setDraft(a);
                          setEditIndex(i);
                          setAddressError(null);
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeAddress(i)}>
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Side nav */}
        <aside className="space-y-3">
          <Card className="p-2">
            <Link
              href="/orders"
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
            >
              <Package className="size-4 text-ink-faint" /> My orders
            </Link>
            <Link
              href="/wishlist"
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
            >
              <MapPin className="size-4 text-ink-faint" /> Wishlist
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-saffron-deep transition hover:bg-saffron-wash"
              >
                <Shield className="size-4" /> Admin panel
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
            >
              <LogOut className="size-4 text-ink-faint" /> Sign out
            </button>
          </Card>

          <LinkButton href="/shop" variant="secondary" full size="sm">
            Continue shopping
          </LinkButton>
        </aside>
      </div>

      {/* Address modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex != null ? "Edit address" : "Add address"}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
            />
          </Field>
          <Field label="Mobile number" required>
            <Input
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" required>
              <Input
                value={draft.line1}
                onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
                placeholder="House / flat, building, street"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Area, locality">
              <Input
                value={draft.line2}
                onChange={(e) => setDraft({ ...draft, line2: e.target.value })}
              />
            </Field>
          </div>
          <Field label="City" required>
            <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
          </Field>
          <Field label="State" required>
            <Select value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })}>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="PIN code" required>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={draft.pincode}
              onChange={(e) => setDraft({ ...draft, pincode: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <Field label="Landmark">
            <Input
              value={draft.landmark}
              onChange={(e) => setDraft({ ...draft, landmark: e.target.value })}
            />
          </Field>
        </div>

        {addressError && <p className="mt-4 text-xs text-maroon">{addressError}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveAddress}>Save address</Button>
        </div>
      </Modal>
    </div>
  );
}
