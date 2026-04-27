"use client";

import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";

interface ModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  busy?: boolean;
}

export function Modal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onClose,
  children,
  busy = false,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div
        aria-modal="true"
        role="dialog"
        className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_30px_90px_rgba(0,0,0,0.2)]"
      >
        <h3 className="font-serif text-3xl text-stone-900">{title}</h3>
        {description ? <p className="mt-3 text-sm text-stone-600">{description}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            {cancelLabel}
          </Button>
          {onConfirm ? (
            <Button disabled={busy} onClick={onConfirm} type="button">
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
