"use client";

import { createContext, useContext } from "react";

import type {
  AuditLogRecord,
  CreateSchedulePayload,
  CreateUserPayload,
  ScheduleRecord,
  UpdateSchedulePayload,
  UpdateUserPayload,
  UserRecord,
} from "@/types/app";

// Schedule context groups dashboard data and CRUD actions used across the panel.
export interface ScheduleContextValue {
  users: UserRecord[];
  schedules: ScheduleRecord[];
  auditLogs: AuditLogRecord[];
  refreshDashboard: () => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<void>;
  updateUser: (id: string, payload: UpdateUserPayload) => Promise<void>;
  deactivateUser: (id: string) => Promise<void>;
  createSchedule: (payload: CreateSchedulePayload) => Promise<void>;
  updateSchedule: (id: string, payload: UpdateSchedulePayload) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

export const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function useScheduleContext() {
  const context = useContext(ScheduleContext);

  if (!context) {
    throw new Error("useScheduleContext must be used inside ScheduleContext.");
  }

  return context;
}
