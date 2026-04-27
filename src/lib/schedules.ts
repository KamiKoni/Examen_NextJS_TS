import type { Prisma, PrismaClient } from "@prisma/client";

import { AppError } from "@/lib/errors";

// Schedule rules are shared between create, update and document import flows.
export function assertValidScheduleWindow(startAt: Date, endAt: Date) {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new AppError(400, "INVALID_SCHEDULE", "Schedule dates are invalid.");
  }

  if (startAt >= endAt) {
    throw new AppError(400, "INVALID_SCHEDULE", "The start date must be earlier than the end date.");
  }
}

export async function assertNoScheduleConflict(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    assignedUserId: string;
    startAt: Date;
    endAt: Date;
    ignoreScheduleId?: string;
  },
) {
  // Overlap exists when another active schedule starts before the new end and ends after the new start.
  assertValidScheduleWindow(params.startAt, params.endAt);

  const conflict = await db.schedule.findFirst({
    where: {
      assignedUserId: params.assignedUserId,
      id: params.ignoreScheduleId ? { not: params.ignoreScheduleId } : undefined,
      status: { not: "CANCELLED" },
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
    },
  });

  if (conflict) {
    throw new AppError(409, "SCHEDULE_CONFLICT", "This schedule overlaps an existing shift.", conflict);
  }
}
