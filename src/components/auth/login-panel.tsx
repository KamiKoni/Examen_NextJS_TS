"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { useAppState } from "@/hooks/use-state";

export function LoginPanel() {
  const router = useRouter();
  const { session, busy, login } = useAppState();
  const [email, setEmail] = useState("admin@clockhub.local");
  const [password, setPassword] = useState("ChangeMe123!");

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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-10 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-white/40 bg-[radial-gradient(circle_at_top,#f7d9ae,transparent_48%),linear-gradient(160deg,#3d2417,#140d0a_55%,#26140c)] p-8 text-stone-50 shadow-[0_32px_100px_rgba(35,18,7,0.35)] lg:p-12">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">ClockHub</p>
          <h1 className="mt-8 max-w-xl font-serif text-5xl leading-tight lg:text-6xl">
            Operación, turnos y acceso seguro en una sola consola.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-stone-200/80">
            Plataforma full-stack en Next.js, TypeScript y Prisma con JWT, refresh
            tokens, control por roles, auditoría y gestión de horarios con detección
            de conflictos.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              "JWT + cookies HttpOnly",
              "RBAC Admin / Manager / Employee",
              "CRUD con auditoría y validaciones",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_24px_70px_rgba(48,31,19,0.08)] lg:p-10">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-400">
                Sign in
              </p>
              <h2 className="mt-3 font-serif text-4xl text-stone-900">
                Acceso a dashboard
              </h2>
              <p className="mt-3 text-sm text-stone-500">
                Usa las credenciales de seed o reemplázalas por tus usuarios reales.
              </p>
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
                {busy ? "Procesando..." : "Entrar"}
              </button>
            </form>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              <p className="font-semibold text-stone-900">Usuarios demo</p>
              <p className="mt-2">`admin@clockhub.local` / `ChangeMe123!`</p>
              <p>`manager@clockhub.local` / `ChangeMe123!`</p>
              <p>`employee@clockhub.local` / `ChangeMe123!`</p>
            </div>

            <Link className="inline-flex text-sm font-semibold text-stone-500 underline-offset-4 hover:underline" href="https://nextjs.org/docs">
              Documentación de Next.js
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
