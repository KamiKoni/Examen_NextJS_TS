"use client";

import { createContext, useContext } from "react";

import type { NotificationState, SessionUser } from "@/types/app";

// Auth context exposes session status and authentication actions to client components.
export interface AuthContextValue {
  session: SessionUser | null;
  bootstrapping: boolean;
  busy: boolean;
  notification: NotificationState | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearNotification: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used inside AuthContext.");
  }

  return context;
}
