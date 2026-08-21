"use client";

import Link from "next/link";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
   Button
   ------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-saffron text-white shadow-page hover:bg-saffron-deep active:bg-saffron-deep disabled:bg-saffron/50",
  secondary:
    "border border-rule-strong bg-paper-raised text-ink hover:border-saffron hover:text-saffron-deep",
  ghost: "text-ink-soft hover:bg-paper-sunk hover:text-ink",
  danger: "bg-maroon text-white hover:bg-maroon/85",
  quiet: "border border-rule bg-transparent text-ink-soft hover:border-rule-strong hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-[0.8125rem]",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-13 gap-2.5 px-7 text-[0.9375rem]",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, full, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-200",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        full && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
}

export function LinkButton({
  className,
  variant = "primary",
  size = "md",
  full,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.97]",
        VARIANTS[variant],
        SIZES[size],
        full && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------
   Form fields
   ------------------------------------------------------------------------- */

const FIELD_BASE =
  "w-full rounded-lg border border-rule-strong bg-paper-raised px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-faint transition-colors duration-200 " +
  "focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/25 " +
  "disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-ink-faint";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 flex items-baseline gap-1 text-[0.8125rem] font-medium text-ink">
          {label}
          {required && <span className="text-maroon">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-maroon">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD_BASE, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(FIELD_BASE, "min-h-24 resize-y", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(FIELD_BASE, "cursor-pointer pr-9", className)} {...props}>
        {children}
      </select>
    );
  },
);

/* -------------------------------------------------------------------------
   Surfaces
   ------------------------------------------------------------------------- */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-rule bg-paper-raised shadow-page", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "saffron",
  className,
}: {
  children: ReactNode;
  tone?: "saffron" | "leaf" | "maroon" | "neutral" | "ochre";
  className?: string;
}) {
  const tones = {
    saffron: "bg-saffron text-white",
    leaf: "bg-leaf text-white",
    maroon: "bg-maroon text-white",
    ochre: "bg-ochre text-white",
    neutral: "bg-paper-deep text-ink-soft",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.09em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="rule-ornament font-display text-3xl leading-tight font-semibold text-ink sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rule-strong bg-paper-raised/60 px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-paper-sunk text-saffron">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-saffron", className)} aria-hidden />;
}

/* -------------------------------------------------------------------------
   Scroll reveal
   ------------------------------------------------------------------------- */

/**
 * Fades + lifts children the first time they scroll into view. Uses a single
 * IntersectionObserver per element and unobserves after firing, so long
 * catalog pages stay cheap.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Anything already on screen at mount is shown straight away, without
    // waiting on the observer. This also covers a reload part-way down a long
    // page, where the cards above the fold would otherwise fade in late.
    const onScreenNow = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };
    if (onScreenNow()) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    /**
     * A hidden document runs no rendering lifecycle, so neither
     * IntersectionObserver nor scroll events fire — content would stay at
     * opacity 0 until the tab was focused, and on a restored session that may
     * be never. There is nothing to animate for a viewer who cannot see the
     * page, so skip the effect and just show it.
     */
    if (document.hidden) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);

    /**
     * Safety net. IntersectionObserver does not deliver callbacks while the
     * document is hidden — a background tab, a restored session, an occluded
     * window — and without this the content would sit at opacity 0 for good,
     * which reads to a visitor as a page that will not scroll. Re-check on
     * scroll and when the tab becomes visible again, and give up on the
     * animation entirely rather than ever hide content.
     */
    const settle = () => {
      if (onScreenNow()) {
        setVisible(true);
        io.disconnect();
      }
    };
    window.addEventListener("scroll", settle, { passive: true });
    document.addEventListener("visibilitychange", settle);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", settle);
      document.removeEventListener("visibilitychange", settle);
    };
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      data-visible={visible}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={cn("reveal", className)}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------
   Modal
   ------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        style={{ animation: "fade 0.2s var(--ease-paper)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full rounded-t-2xl border border-rule bg-paper-raised shadow-lift sm:rounded-2xl",
          widths[size],
        )}
        style={{ animation: "rise 0.3s var(--ease-paper)" }}
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-full p-1.5 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
