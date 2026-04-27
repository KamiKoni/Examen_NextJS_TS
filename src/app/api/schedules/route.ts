import { NextRequest } from "next/server";

import { fail, ok, parseBody } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { assertCanManageAssignment, canManageSchedules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createScheduleSchema } from "@/lib/schemas";
import { serializeSchedule } from "@/lib/serializers";
import { requireSession } from "@/lib/session";
import { assertNoScheduleConflict } from "@/lib/schedules";

const scheduleInclude = {
  assignedUser: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const schedules = await prisma.schedule.findMany({
      where: session.role === "EMPLOYEE" ? { assignedUserId: session.id } : undefined,
      include: scheduleInclude,
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
    });

    return ok({ schedules: schedules.map(serializeSchedule) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);

    if (!canManageSchedules(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot create schedules.");
    }

    const payload = await parseBody(request, createScheduleSchema);
    const assignedUser = await prisma.user.findUnique({
      where: { id: payload.assignedUserId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!assignedUser || assignedUser.status !== "ACTIVE") {
      throw new AppError(404, "NOT_FOUND", "Assigned user not found or inactive.");
    }

    assertCanManageAssignment(session.role, assignedUser.role);

    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);

    await assertNoScheduleConflict(prisma, {
      assignedUserId: payload.assignedUserId,
      startAt,
      endAt,
    });

    const schedule = await prisma.schedule.create({
      data: {
        title: payload.title,
        description: payload.description,
        assignedUserId: payload.assignedUserId,
        startAt,
        endAt,
        status: payload.status ?? "PLANNED",
        createdById: session.id,
        updatedById: session.id,
      },
      include: scheduleInclude,
    });

    await createAuditLog(prisma, {
      actorId: session.id,
      action: "SCHEDULE_CREATED",
      entityType: "schedule",
      entityId: schedule.id,
      description: `${session.email} created schedule ${schedule.title}.`,
      metadata: {
        assignedUserId: schedule.assignedUserId,
        startAt: schedule.startAt.toISOString(),
        endAt: schedule.endAt.toISOString(),
      },
    });

    return ok({ schedule: serializeSchedule(schedule) }, 201);
  } catch (error) {
    return fail(error);
  }
}
