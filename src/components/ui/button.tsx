"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

// Small button wrapper that maps project-level variants to shared utility classes.
type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "primary-button"
      : variant === "secondary"
        ? "secondary-button"
        : "rounded-full px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100";

  return (
    <button
      {...props}
      className={`${variantClass} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
