"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BRAND_NAME } from "@/lib/api";

export function AdminLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const next = await login(email.trim(), password);
      if (next.role !== "admin") {
        setError("Admin access only");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-3">
      <aside className="relative hidden overflow-hidden lg:col-span-2 lg:block">
        <img
          src="/hero/1.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-paper" />
        <div className="relative flex h-full min-h-screen flex-col justify-between p-10">
          <Link href="/" className="flex w-fit items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-fire text-sm font-extrabold text-pitch-dark">
              ON
            </span>
            <span className="text-lg font-extrabold tracking-tight">{BRAND_NAME}</span>
          </Link>
          <div className="max-w-lg">
            <p className="text-sm font-medium text-fire">Admin desk</p>
            <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-cream">
              Pay first. Then you see the odds.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Post boards, set results, and unlock VIP. Hidden from the public
              site.
            </p>
          </div>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
        <div className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-fire text-sm font-extrabold text-pitch-dark">
              ON
            </span>
            <span className="text-lg font-extrabold tracking-tight">{BRAND_NAME}</span>
          </Link>
          <Link href="/" className="text-sm text-mute hover:text-ink">
            Home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <p className="text-sm font-medium text-fire">Admin desk</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-mute">
            Desk only. This page is not linked from the public site.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-xs font-medium text-mute">
              Email
              <input
                className="field mt-1.5"
                type="email"
                name="email"
                autoComplete="username"
                required
                placeholder="admin@system.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-mute">
              Password
              <span className="relative mt-1.5 block">
                <input
                  className="field pr-16"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-mute hover:text-ink"
                  onClick={() => setShowPassword((open) => !open)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>
            {error && <p className="text-sm text-lost">{error}</p>}
            <button disabled={busy} className="btn-primary w-full py-3" type="submit">
              {busy ? "Checking…" : "Enter desk"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
