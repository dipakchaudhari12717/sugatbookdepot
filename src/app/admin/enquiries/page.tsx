"use client";

import { Check, Mail, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase";
import { markEnquiryHandled, subscribeEnquiries } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import { cn, formatDateTime } from "@/lib/utils";
import { Button, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/admin/admin-ui";

interface Row {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  kind?: string;
  handled?: boolean;
  createdAt?: number;
}

const KIND_LABEL: Record<string, string> = {
  contact: "Contact form",
  bulk: "Bulk order",
  newsletter: "Newsletter",
};

export default function AdminEnquiriesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "all">("open");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return subscribeEnquiries((next) => {
      setRows(next as Row[]);
      setLoading(false);
    });
  }, []);

  const visible = rows.filter((r) => (filter === "open" ? !r.handled : true));

  async function toggle(row: Row) {
    try {
      await markEnquiryHandled(row.id, !row.handled);
    } catch {
      toast("Could not update that enquiry.", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description="Messages from the contact form, bulk-order requests and newsletter signups."
        action={
          <div className="flex gap-2">
            {(["open", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
                  filter === f
                    ? "border-saffron bg-saffron text-white"
                    : "border-rule bg-paper-raised text-ink-soft hover:border-saffron/50",
                )}
              >
                {f === "open" ? "Open" : "All"}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-14 text-center">
          <MessageCircle className="mx-auto size-6 text-ink-faint" />
          <p className="mt-3 text-sm text-ink-faint">
            {filter === "open" ? "Nothing waiting on you." : "No enquiries yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => (
            <li
              key={row.id}
              className={cn(
                "rounded-2xl border bg-paper-raised p-5 shadow-page transition",
                row.handled ? "border-rule opacity-70" : "border-saffron/25",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-paper-sunk px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-soft">
                      {KIND_LABEL[row.kind ?? ""] ?? row.kind}
                    </span>
                    {row.subject && (
                      <span className="font-display text-base font-semibold text-ink">
                        {row.subject}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    {row.name && <span className="font-medium text-ink">{row.name}</span>}
                    {row.name && (row.email || row.phone) && " · "}
                    {row.email && (
                      <a href={`mailto:${row.email}`} className="hover:text-saffron-deep">
                        {row.email}
                      </a>
                    )}
                    {row.phone && ` · ${row.phone}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {row.createdAt && (
                    <span className="text-[0.6875rem] text-ink-faint">
                      {formatDateTime(row.createdAt)}
                    </span>
                  )}
                  <Button variant={row.handled ? "quiet" : "secondary"} size="sm" onClick={() => toggle(row)}>
                    <Check className="size-3.5" />
                    {row.handled ? "Reopen" : "Mark handled"}
                  </Button>
                </div>
              </div>

              {row.message && (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-paper-sunk px-4 py-3 text-sm leading-relaxed text-ink-soft">
                  {row.message}
                </p>
              )}

              {row.email && (
                <a
                  href={`mailto:${row.email}?subject=${encodeURIComponent(
                    `Re: ${row.subject || "Your enquiry"} — Sugat Book Depot`,
                  )}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-saffron-deep hover:underline"
                >
                  <Mail className="size-3.5" /> Reply by email
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
