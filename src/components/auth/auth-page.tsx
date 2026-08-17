"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Eye, EyeOff, Package, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { cn, isValidEmail } from "@/lib/utils";
import { Button, Card, Field, Input } from "@/components/ui";

type Mode = "signin" | "signup" | "reset";

export function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const { user, loading, configured, signIn, signUp, resetPassword } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [user, loading, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode !== "reset" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast("Welcome back");
        router.replace(next);
      } else if (mode === "signup") {
        await signUp(name, email, password);
        toast("Account created — welcome to Sugat Book Depot");
        router.replace(next);
      } else {
        await resetPassword(email);
        toast("Password reset link sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const copy = {
    signin: { title: "Welcome back", cta: "Sign in" },
    signup: { title: "Create your account", cta: "Create account" },
    reset: { title: "Reset your password", cta: "Send reset link" },
  }[mode];

  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Pitch */}
        <div className="hidden lg:block">
          <p className="eyebrow">Sugat Book Depot</p>
          <h1 className="rule-ornament mt-4 font-display text-4xl leading-tight font-semibold text-ink">
            Your shelf,
            <br />
            saved for later.
          </h1>
          <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink-soft">
            An account keeps your bag, wishlist and delivery addresses in one place — and lets you
            follow every order from placed to delivered.
          </p>
          <ul className="mt-9 space-y-5">
            {[
              [Package, "Track every order", "Live status from placed to delivered."],
              [BookOpen, "Save your wishlist", "Keep titles for the next visit."],
              [Truck, "Faster checkout", "Saved addresses, one tap."],
            ].map(([Icon, title, sub]) => {
              const I = Icon as typeof Package;
              return (
                <li key={title as string} className="flex items-start gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-saffron-wash text-saffron-deep">
                    <I className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{title as string}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{sub as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Form */}
        <Card className="p-7 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">{copy.title}</h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            {mode === "signin" && "Sign in to continue."}
            {mode === "signup" && "It takes less than a minute."}
            {mode === "reset" && "We'll email you a link to set a new password."}
          </p>

          {!configured && (
            <p className="mt-5 rounded-xl border border-maroon/25 bg-maroon/6 px-4 py-3 text-xs text-maroon">
              Firebase is not configured. Add your keys to <code>.env.local</code> and restart the
              dev server to enable accounts.
            </p>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Your name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </Field>
            )}

            <Field label="Email address" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>

            {mode !== "reset" && (
              <Field label="Password" required>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint transition hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
            )}

            {error && (
              <p className="rounded-lg bg-maroon/8 px-3.5 py-2.5 text-xs text-maroon">{error}</p>
            )}

            <Button type="submit" full size="lg" loading={busy} disabled={!configured}>
              {copy.cta}
            </Button>
          </form>

          <div className="mt-6 space-y-2.5 text-center text-xs">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-ink-faint transition hover:text-ink"
                >
                  Forgot your password?
                </button>
                <p className="text-ink-soft">
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-medium text-saffron-deep underline underline-offset-2"
                  >
                    Create an account
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p className="text-ink-soft">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-medium text-saffron-deep underline underline-offset-2"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "reset" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-ink-faint transition hover:text-ink"
              >
                Back to sign in
              </button>
            )}
          </div>

          <p className={cn("mt-6 border-t border-rule pt-5 text-center text-xs text-ink-faint")}>
            You can also{" "}
            <Link href="/checkout" className="underline underline-offset-2">
              check out as a guest
            </Link>
            .
          </p>
        </Card>
      </div>
    </div>
  );
}
