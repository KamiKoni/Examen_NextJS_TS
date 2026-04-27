"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { useAppState } from "@/hooks/use-state";

export function SignupPanel() {
  const router = useRouter();
  const { session, busy, signup } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    try {
      await signup({ name, email, password });
      router.replace("/dashboard");
    } catch {
      // Shared feedback is handled in context state.
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-8 lg:px-10 lg:py-12">
      <div className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/30 bg-[linear-gradient(155deg,#10231b_0%,#173127_40%,#24473b_100%)] p-8 text-stone-50 shadow-[0_32px_100px_rgba(16,35,27,0.28)] lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.22),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(45,212,191,0.14),transparent_18%)]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-200/85">
                  ClockHub
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  Secure onboarding
                </p>
              </div>
              <div className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
                Create Access
              </div>
            </div>

            <h1 className="mt-10 max-w-2xl font-serif text-5xl leading-tight lg:text-6xl">
              Create your access and enter with your own account.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-200/85">
              Register a new account to start working with secure sessions,
              traceability, and permissions that are ready to scale.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                "Registration validated with shared server rules",
                "Automatic sign-in after account creation",
                "Sessions backed by secure cookies",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/8 p-4 text-sm leading-6 text-stone-100/90 backdrop-blur-sm"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-[1.6rem] border border-white/10 bg-black/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-100/80">
                Flow
              </p>
              <p className="mt-3 font-serif text-3xl text-white">Registration and immediate access</p>
              <p className="mt-3 text-sm leading-6 text-stone-200/80">
                The first account can bootstrap the application and later
                accounts remain governed by backend permissions.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-200/80 bg-white/95 p-7 shadow-[0_24px_70px_rgba(48,31,19,0.08)] backdrop-blur lg:p-10">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-400">
                  Sign up
                </p>
                <h2 className="mt-3 font-serif text-4xl text-stone-900">
                  Create account
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-stone-500">
                  Complete your details to register an account and enter the
                  dashboard with an active session.
                </p>
              </div>
              <div className="hidden rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800 sm:block">
                Ready
              </div>
            </div>

            <FeedbackBanner />

            {localError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {localError}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Name</span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  type="text"
                  placeholder="Argenis Flores"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Email</span>
                <input
                  className="field"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="name@clockhub.local"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Password</span>
                <input
                  className="field"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Minimum 8 characters"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Confirm password</span>
                <input
                  className="field"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  placeholder="Repeat your password"
                />
              </label>

              <button className="primary-button w-full" disabled={busy} type="submit">
                {busy ? "Processing..." : "Create account and enter"}
              </button>
            </form>

            <p className="text-sm leading-6 text-stone-500">
              Already have an account?{" "}
              <Link
                className="font-semibold text-stone-700 underline-offset-4 hover:text-stone-900 hover:underline"
                href="/auth/login"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
