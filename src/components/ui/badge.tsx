import type { PropsWithChildren } from "react";

// Semantic badge component for statuses and compact labels.
type BadgeTone = "neutral" | "success" | "warning" | "danger";

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-800"
        : tone === "danger"
          ? "bg-rose-100 text-rose-800"
          : "bg-[rgba(44,29,20,0.08)] text-[#4b3426]";

  return (
    <span
      className={`inline-flex w-fit items-center justify-center rounded-full px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.16em] ${toneClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
