import { z } from "zod";

import { ROLES, SCHEDULE_STATUSES, USER_STATUSES } from "@/lib/constants";

// Zod schemas define the request contracts enforced by API routes.
const roleSchema = z.enum(ROLES);
const userStatusSchema = z.enum(USER_STATUSES);
const statusSchema = z.enum(SCHEDULE_STATUSES);

const optionalTrimmedString = z
  .string()
  .trim()
  .max(300)
  .transform((value) => value || undefined)
  .optional();

const dateTimeString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid datetime value.",
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: roleSchema,
  status: userStatusSchema.optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.string().trim().email().optional(),
    password: z.string().min(8).max(128).optional(),
    role: roleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const registerSchema = createUserSchema.extend({
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
});

export const createScheduleSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: optionalTrimmedString,
  assignedUserId: z.string().trim().min(1),
  startAt: dateTimeString,
  endAt: dateTimeString,
  status: statusSchema.optional(),
});

export const updateScheduleSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: optionalTrimmedString,
    assignedUserId: z.string().trim().min(1).optional(),
    startAt: dateTimeString.optional(),
    endAt: dateTimeString.optional(),
    status: statusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");
