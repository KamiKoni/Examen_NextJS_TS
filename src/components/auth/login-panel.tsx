"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { useAppState } from "@/hooks/use-state";

// Public login screen that combines product framing with seeded local credentials.
export function LoginPanel() {
  const router = useRouter();
  const { session, busy, login } = useAppState();
  const [email, setEmail] = useState("admin@clockhub.local");
  const [password, setPassword] = useState("ChangeMe123!");

  // If the session is already active, keep the login route out of the way.
  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch {
      // Feedback is handled in context state.
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-8 lg:px-10 lg:py-12">
      <div className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left column: product framing and quick access signals. */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/30 bg-[linear-gradient(155deg,#1f120d_0%,#2a1710_42%,#4c2c1e_100%)] p-8 text-stone-50 shadow-[0_32px_100px_rgba(35,18,7,0.32)] lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.28),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.18),transparent_18%)]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">
                  ClockHub
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  Workforce operations console
                </p>
              </div>
              <div className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
                Secure Access
              </div>
            </div>

            <h1 className="mt-10 max-w-2xl font-serif text-5xl leading-tight lg:text-6xl">
              Daily operations, schedules, and audit trails in one secure place.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-200/85">
              Manage users, schedules, and documents from one workspace with
              role-based permissions, traceability, and secure sessions.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                "Sessions backed by HttpOnly cookies",
                "Role-aware access for admin, manager, and employee",
                "Audit visibility and validation around every change",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/8 p-4 text-sm leading-6 text-stone-100/90 backdrop-blur-sm"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.6rem] border border-white/10 bg-black/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-100/80">
                  Status
                </p>
                <p className="mt-3 font-serif text-3xl text-white">Central oversight</p>
                <p className="mt-3 text-sm leading-6 text-stone-200/80">
                  Operations, credentials, and daily oversight in one focused entry point.
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-100/80">
                  Quick signal
                </p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-serif text-4xl text-white">3</p>
                    <p className="mt-2 text-sm text-stone-200/80">demo accounts ready</p>
                  </div>
                  <div className="h-16 w-24 rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.05))]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right column: authentication form and seeded credentials for local testing. */}
        <section className="rounded-[2rem] border border-stone-200/80 bg-white/95 p-7 shadow-[0_24px_70px_rgba(48,31,19,0.08)] backdrop-blur lg:p-10">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-400">
                  Sign in
                </p>
                <h2 className="mt-3 font-serif text-4xl text-stone-900">
                  Dashboard access
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-stone-500">
                  Sign in with an existing account to enter the operations dashboard.
                </p>
              </div>
              <div className="hidden rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800 sm:block">
                Live
              </div>
            </div>

            <FeedbackBanner />

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Email</span>
                <input
                  className="field"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="admin@clockhub.local"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Password</span>
                <input
                  className="field"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="••••••••"
                />
              </label>

              <button className="primary-button w-full" disabled={busy} type="submit">
                {busy ? "Processing..." : "Enter workspace"}
              </button>
            </form>

            <p className="text-sm leading-6 text-stone-500">
              Need a new account?{" "}
              <Link
                className="font-semibold text-stone-700 underline-offset-4 hover:text-stone-900 hover:underline"
                href="/auth/signup"
              >
                Create account
              </Link>
            </p>

            <div className="rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-stone-900">Demo credentials</p>
                <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Seed</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-stone-600">
                {[
                  "admin@clockhub.local / ChangeMe123!",
                  "manager@clockhub.local / ChangeMe123!",
                  "employee@clockhub.local / ChangeMe123!",
                ].map((credential) => (
                  <div
                    key={credential}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-3 font-medium text-stone-700"
                  >
                    {credential}
                  </div>
                ))}
              </div>
            </div>

            <Link
              className="inline-flex text-sm font-semibold text-stone-500 underline-offset-4 hover:text-stone-700 hover:underline"
              href="https://nextjs.org/docs"
            >
              Next.js documentation
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
