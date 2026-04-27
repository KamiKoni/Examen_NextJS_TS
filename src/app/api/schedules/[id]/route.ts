import { NextRequest } from "next/server";

import { fail, ok, parseBody } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import {
  assertCanManageAssignment,
  canManageSchedules,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateScheduleSchema } from "@/lib/schemas";
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Item route for reading, editing and cancelling a single schedule.
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { id } = await context.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: scheduleInclude,
    });

    if (!schedule) {
      throw new AppError(404, "NOT_FOUND", "Schedule not found.");
    }

    if (session.role === "EMPLOYEE" && schedule.assignedUserId !== session.id) {
      throw new AppError(403, "FORBIDDEN", "You cannot access this schedule.");
    }

    return ok({ schedule: serializeSchedule(schedule) });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateSchedule(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return updateSchedule(request, context);
}

async function updateSchedule(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { id } = await context.params;

    if (!canManageSchedules(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot edit schedules.");
    }

    const payload = await parseBody(request, updateScheduleSchema);
    const current = await prisma.schedule.findUnique({
      where: { id },
      include: {
        assignedUser: {
          select: {
            id: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!current) {
      throw new AppError(404, "NOT_FOUND", "Schedule not found.");
    }

    const assignedUserId = payload.assignedUserId ?? current.assignedUserId;
    const assignedUser =
      assignedUserId === current.assignedUserId
        ? current.assignedUser
        : await prisma.user.findUnique({
            where: { id: assignedUserId },
            select: {
              id: true,
              role: true,
              status: true,
            },
          });

    if (!assignedUser || assignedUser.status !== "ACTIVE") {
      throw new AppError(
        404,
        "NOT_FOUND",
        "Assigned user not found or inactive.",
      );
    }

    assertCanManageAssignment(session.role, assignedUser.role);

    const startAt = payload.startAt
      ? new Date(payload.startAt)
      : current.startAt;
    const endAt = payload.endAt ? new Date(payload.endAt) : current.endAt;

    await assertNoScheduleConflict(prisma, {
      assignedUserId,
      startAt,
      endAt,
      ignoreScheduleId: current.id,
    });

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description,
        assignedUserId,
        startAt,
        endAt,
        status: payload.status,
        updatedById: session.id,
      },
      include: scheduleInclude,
    });

    await createAuditLog(prisma, {
      actorId: session.id,
      action: "SCHEDULE_UPDATED",
      entityType: "schedule",
      entityId: updated.id,
      description: `${session.email} updated schedule ${updated.title}.`,
      metadata: payload,
    });

    return ok({ schedule: serializeSchedule(updated) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { id } = await context.params;

    const url = new URL(request.url);
    const hard = url.searchParams.get("hard") === "true";

    if (!canManageSchedules(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot delete schedules.");
    }

    const current = await prisma.schedule.findUnique({
      where: { id },
      include: {
        assignedUser: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!current) {
      throw new AppError(404, "NOT_FOUND", "Schedule not found.");
    }

    assertCanManageAssignment(session.role, current.assignedUser.role);

    if (hard) {
      if (session.role !== "ADMIN") {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Only admins can permanently delete schedules.",
        );
      }

      const deleted = await prisma.schedule.delete({ where: { id } });

      await createAuditLog(prisma, {
        actorId: session.id,
        action: "SCHEDULE_DELETED",
        entityType: "schedule",
        entityId: deleted.id,
        description: `${session.email} permanently deleted schedule ${deleted.title}.`,
        metadata: { hard: true },
      });

      return ok({ schedule: serializeSchedule(deleted) });
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        status: "CANCELLED",
        updatedById: session.id,
      },
      include: scheduleInclude,
    });

    await createAuditLog(prisma, {
      actorId: session.id,
      action: "SCHEDULE_DELETED",
      entityType: "schedule",
      entityId: current.id,
      description: `${session.email} cancelled schedule ${current.title}.`,
      metadata: { status: updated.status },
    });

    return ok({ schedule: serializeSchedule(updated) });
  } catch (error) {
    return fail(error);
  }
}
