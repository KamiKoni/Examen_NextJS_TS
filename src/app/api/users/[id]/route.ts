import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { fail, ok, parseBody } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { assertCanManageRole, assertCanViewUser, canManageUsers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/schemas";
import { serializeUser } from "@/lib/serializers";
import { requireSession } from "@/lib/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Item route for reading, updating and deactivating a single user record.
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { id } = await context.params;

    assertCanViewUser(session.role, session.id, id);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, "NOT_FOUND", "User not found.");
    }

    return ok({ user: serializeUser(user) });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateUser(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return updateUser(request, context);
}

async function updateUser(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { id } = await context.params;
    const payload = await parseBody(request, updateUserSchema);

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!target) {
      throw new AppError(404, "NOT_FOUND", "User not found.");
    }

    // Users may edit their own profile data, but role and status changes require an admin.
    const managingAnotherUser = session.id !== id;

    if (managingAnotherUser) {
      if (!canManageUsers(session.role)) {
        throw new AppError(403, "FORBIDDEN", "You cannot modify this user.");
      }

      assertCanManageRole(session.role, target.role, payload.role);
    } else {
      if (payload.role || payload.status) {
        throw new AppError(403, "FORBIDDEN", "You cannot change your own role or status.");
      }
    }

    if (payload.email && payload.email.toLowerCase() !== target.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: payload.email.toLowerCase() },
        select: { id: true },
      });

      if (emailInUse) {
        throw new AppError(409, "EMAIL_TAKEN", "Email is already in use.");
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: payload.name,
        email: payload.email?.toLowerCase(),
        role: payload.role,
        status: payload.status,
        passwordHash: payload.password ? await bcrypt.hash(payload.password, 12) : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog(prisma, {
      actorId: session.id,
      action: "USER_UPDATED",
      entityType: "user",
      entityId: updated.id,
      description: `${session.email} updated ${updated.email}.`,
      metadata: payload,
    });

    return ok({ user: serializeUser(updated) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { id } = await context.params;
    const url = new URL(request.url);
    const hard = url.searchParams.get('hard') === 'true';

    if (!canManageUsers(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot deactivate users.");
    }

    if (session.id === id) {
      throw new AppError(400, "INVALID_OPERATION", "You cannot deactivate your own account.");
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!target) {
      throw new AppError(404, "NOT_FOUND", "User not found.");
    }

    assertCanManageRole(session.role, target.role);

    if (hard) {
      if (session.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN', 'Only admins can permanently delete users.');
      }

      const deleted = await prisma.user.delete({ where: { id } });

      await createAuditLog(prisma, {
        actorId: session.id,
        action: "USER_HARD_DELETED",
        entityType: "user",
        entityId: deleted.id,
        description: `${session.email} permanently deleted ${deleted.email}.`,
        metadata: null,
      });

      return ok({ user: serializeUser(deleted) });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog(prisma, {
      actorId: session.id,
      action: "USER_DELETED",
      entityType: "user",
      entityId: updated.id,
      description: `${session.email} deactivated ${updated.email}.`,
      metadata: { status: updated.status },
    });

    return ok({ user: serializeUser(updated) });
  } catch (error) {
    return fail(error);
  }
}
