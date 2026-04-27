import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { fail, ok, parseBody } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/schemas";
import { serializeUser } from "@/lib/serializers";

// Public signup: allow self-registration for non-admin users.
export async function POST(request: NextRequest) {
  try {
    const payload = await parseBody(request, registerSchema);
    const userCount = await prisma.user.count();

    // First user may still bootstrap as ADMIN; otherwise force EMPLOYEE.
    const nextRole = userCount === 0 ? (payload.role ?? "ADMIN") : "EMPLOYEE";

    const existing = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(409, "EMAIL_TAKEN", "Email is already in use.");
    }

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        passwordHash: await bcrypt.hash(payload.password, 12),
        role: nextRole,
        status: payload.status ?? "ACTIVE",
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
      actorId: null,
      action: "USER_CREATED",
      entityType: "user",
      entityId: user.id,
      description: `self-signup registered ${user.email}.`,
      metadata: { role: user.role, status: user.status },
    });

    return ok({ user: serializeUser(user) }, 201);
  } catch (error) {
    return fail(error);
  }
}
