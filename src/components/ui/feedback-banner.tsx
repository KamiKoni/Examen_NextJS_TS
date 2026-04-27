"use client";

import { useAppState } from "@/hooks/use-state";

// Global feedback surface for success, error and informational notifications.
export function FeedbackBanner() {
  const { notification, clearNotification } = useAppState();

  if (!notification) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
        notification.tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : notification.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p>{notification.message}</p>
        <button
          type="button"
          onClick={clearNotification}
          className="cursor-pointer rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
