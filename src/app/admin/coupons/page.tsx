"use client";

import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase";
import { deleteCoupon, saveCoupon, subscribeCoupons } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Coupon } from "@/lib/types";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Button, Field, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { PageHeader, TableWrap, Td, Th } from "@/components/admin/admin-ui";

interface Draft {
  code: string;
  type: "percent" | "flat";
  value: string;
  minOrder: string;
  maxDiscount: string;
  active: boolean;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  description: string;
}

const EMPTY: Draft = {
  code: "",
  type: "percent",
  value: "10",
  minOrder: "0",
  maxDiscount: "",
  active: true,
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  description: "",
};

const toDateInput = (ms: number | null) =>
  ms ? new Date(ms).toISOString().slice(0, 10) : "";

export default function AdminCouponsPage() {
  const toast = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Coupon | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return subscribeCoupons((next) => {
      setCoupons([...next].sort((a, b) => a.code.localeCompare(b.code)));
      setLoading(false);
    });
  }, []);

  function openNew() {
    setEditing(null);
    setDraft(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    setDraft({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minOrder: String(c.minOrder ?? 0),
      maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : "",
      active: c.active,
      startsAt: toDateInput(c.startsAt),
      expiresAt: toDateInput(c.expiresAt),
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
      description: c.description ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    const code = draft.code.trim().toUpperCase();
    const value = Number(draft.value);

    if (!code) return setError("Enter a coupon code.");
    if (!/^[A-Z0-9-]{3,20}$/.test(code))
      return setError("Codes may use letters, numbers and hyphens only (3–20 characters).");
    if (!value || value <= 0) return setError("Enter a discount value above zero.");
    if (draft.type === "percent" && value > 100)
      return setError("A percentage discount cannot exceed 100.");

    setBusy(true);
    try {
      await saveCoupon(editing?.id ?? null, {
        code,
        type: draft.type,
        value,
        minOrder: Number(draft.minOrder) || 0,
        maxDiscount: draft.maxDiscount.trim() ? Number(draft.maxDiscount) : null,
        active: draft.active,
        startsAt: draft.startsAt ? new Date(draft.startsAt).getTime() : null,
        // Expire at the end of the chosen day, not the start of it.
        expiresAt: draft.expiresAt ? new Date(draft.expiresAt).getTime() + 86_399_000 : null,
        usageLimit: draft.usageLimit.trim() ? Number(draft.usageLimit) : null,
        description: draft.description.trim(),
        ...(editing ? {} : { usedCount: 0 }),
      });
      toast(editing ? "Coupon updated" : "Coupon created");
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError("Could not save. Check that you're signed in as an admin.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteCoupon(confirmDelete.id);
      toast("Coupon deleted");
      setConfirmDelete(null);
    } catch {
      toast("Could not delete that coupon.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Percentage or flat-rupee discount codes, with validity and usage rules."
        action={
          <Button size="sm" onClick={openNew} disabled={!isFirebaseConfigured}>
            <Plus className="size-3.5" /> Add coupon
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-14 text-center">
          <Tag className="mx-auto size-6 text-ink-faint" />
          <p className="mt-3 text-sm text-ink-faint">No coupons yet.</p>
          <Button size="sm" className="mt-5" onClick={openNew} disabled={!isFirebaseConfigured}>
            Create your first coupon
          </Button>
        </div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Conditions</Th>
              <Th>Validity</Th>
              <Th>Used</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const expired = c.expiresAt != null && c.expiresAt < Date.now();
              return (
                <tr key={c.id} className="transition hover:bg-paper-sunk/60">
                  <Td>
                    <span className="rounded-md bg-paper-sunk px-2 py-1 font-mono text-xs font-semibold text-ink">
                      {c.code}
                    </span>
                    {c.description && (
                      <span className="mt-1 block max-w-48 truncate text-[0.6875rem] text-ink-faint">
                        {c.description}
                      </span>
                    )}
                  </Td>
                  <Td className="font-medium text-ink">
                    {c.type === "percent" ? `${c.value}%` : formatPrice(c.value)}
                    {c.maxDiscount != null && (
                      <span className="block text-[0.6875rem] font-normal text-ink-faint">
                        max {formatPrice(c.maxDiscount)}
                      </span>
                    )}
                  </Td>
                  <Td className="text-xs">
                    {c.minOrder > 0 ? `Min ${formatPrice(c.minOrder)}` : "No minimum"}
                  </Td>
                  <Td className="text-xs">
                    {c.startsAt ? formatDate(c.startsAt) : "Now"} →{" "}
                    {c.expiresAt ? formatDate(c.expiresAt) : "No end"}
                  </Td>
                  <Td className="tabular-nums">
                    {c.usedCount ?? 0}
                    {c.usageLimit != null && ` / ${c.usageLimit}`}
                  </Td>
                  <Td>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold",
                        !c.active
                          ? "bg-paper-deep text-ink-soft"
                          : expired
                            ? "bg-maroon/12 text-maroon"
                            : "bg-leaf/12 text-leaf",
                      )}
                    >
                      {!c.active ? "Inactive" : expired ? "Expired" : "Active"}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-saffron-deep"
                        aria-label={`Edit ${c.code}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(c)}
                        className="rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-maroon"
                        aria-label={`Delete ${c.code}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit coupon" : "New coupon"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required hint="Customers type this at checkout">
            <Input
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
              placeholder="FESTIVE10"
              className="font-mono uppercase"
            />
          </Field>
          <Field label="Discount type" required>
            <Select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as "percent" | "flat" })}
            >
              <option value="percent">Percentage off</option>
              <option value="flat">Flat rupees off</option>
            </Select>
          </Field>
          <Field label={draft.type === "percent" ? "Percentage" : "Amount (₹)"} required>
            <Input
              type="number"
              min={1}
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            />
          </Field>
          <Field label="Maximum discount (₹)" hint="Optional cap for percentage codes">
            <Input
              type="number"
              min={0}
              value={draft.maxDiscount}
              onChange={(e) => setDraft({ ...draft, maxDiscount: e.target.value })}
              placeholder="No cap"
            />
          </Field>
          <Field label="Minimum order (₹)">
            <Input
              type="number"
              min={0}
              value={draft.minOrder}
              onChange={(e) => setDraft({ ...draft, minOrder: e.target.value })}
            />
          </Field>
          <Field label="Usage limit" hint="Total redemptions allowed">
            <Input
              type="number"
              min={1}
              value={draft.usageLimit}
              onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })}
              placeholder="Unlimited"
            />
          </Field>
          <Field label="Starts on">
            <Input
              type="date"
              value={draft.startsAt}
              onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
            />
          </Field>
          <Field label="Expires on">
            <Input
              type="date"
              value={draft.expiresAt}
              onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Internal note">
              <Textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Dhamma Chakra Pravartan Din offer"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="size-4 accent-[var(--color-saffron)]"
              />
              Active — customers can use this code now
            </label>
          </div>
        </div>

        {error && <p className="mt-4 text-xs text-maroon">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? "Save changes" : "Create coupon"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this coupon?"
        size="sm"
      >
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">{confirmDelete?.code}</strong> will stop working immediately.
          Orders that already used it are unaffected.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={remove} loading={busy}>
            Delete coupon
          </Button>
        </div>
      </Modal>
    </div>
  );
}
