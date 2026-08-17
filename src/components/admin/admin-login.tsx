"use client";

import Link from "next/link";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { isValidEmail } from "@/lib/utils";
import { Button, Card, Field, Input } from "@/components/ui";

/** Sign-in screen shown at /admin when nobody is authenticated. */
export function AdminLogin() {
  const { signIn, resetPassword, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!isValidEmail(email)) return setError("Please enter a valid email address.");
    if (!password) return setError("Please enter your password.");

    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!isValidEmail(email)) {
      setError("Enter your email address first, then tap this again.");
      return;
    }
    try {
      await resetPassword(email);
      setNotice("Password reset link sent. Check your inbox.");
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-sunk px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-saffron text-white">
            <Lock className="size-5" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Admin sign in</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Sugat Book Depot management</p>
        </div>

        <Card className="p-7">
          {!configured && (
            <p className="mb-5 rounded-xl border border-maroon/25 bg-maroon/6 px-4 py-3 text-xs text-maroon">
              Firebase is not configured. Add your keys to <code>.env.local</code> and restart the
              dev server.
            </p>
          )}

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email address" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                autoComplete="email"
                autoFocus
              />
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-11"
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

            {error && (
              <p className="rounded-lg bg-maroon/8 px-3.5 py-2.5 text-xs text-maroon">{error}</p>
            )}
            {notice && (
              <p className="rounded-lg bg-leaf/8 px-3.5 py-2.5 text-xs text-leaf">{notice}</p>
            )}

            <Button type="submit" full size="lg" loading={busy} disabled={!configured}>
              Sign in
            </Button>
          </form>

          <button
            type="button"
            onClick={forgot}
            className="mt-5 block w-full text-center text-xs text-ink-faint transition hover:text-ink"
          >
            Forgot your password?
          </button>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-faint">
          <Link href="/" className="underline underline-offset-2">
            Back to the shop
          </Link>
        </p>
      </div>
    </div>
  );
}
