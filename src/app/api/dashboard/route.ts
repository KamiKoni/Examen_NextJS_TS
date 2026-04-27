import { NextRequest } from 'next/server';

import { fail, ok } from '@/lib/api';
import { canViewAudit, canViewUserDirectory } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import {
  serializeAuditLog,
  serializeSchedule,
  serializeSessionUser,
  serializeUser,
} from '@/lib/serializers';
import { requireSession } from '@/lib/session';

// Aggregates the dashboard payload so the client can bootstrap from a single request.
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const [users, schedules, auditLogs] = await Promise.all([
      canViewUserDirectory(session.role)
        ? prisma.user.findMany({
            where:
              session.role === 'MANAGER' ? { role: 'EMPLOYEE' } : undefined,
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            take: 50,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          })
        : Promise.resolve([]),
      prisma.schedule.findMany({
        where:
          session.role === 'EMPLOYEE'
            ? { assignedUserId: session.id }
            : undefined,
        include: {
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
        },
        orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
        take: 50,
      }),
      canViewAudit(session.role)
        ? prisma.auditLog.findMany({
            where:
              session.role === 'MANAGER'
                ? {
                    entityType: {
                      in: ['schedule', 'session'],
                    },
                  }
                : undefined,
            include: {
              actor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: session.role === 'MANAGER' ? 25 : 50,
          })
        : Promise.resolve([]),
    ]);

    return ok({
      dashboard: {
        session: serializeSessionUser(session),
        users: users.map(serializeUser),
        schedules: schedules.map(serializeSchedule),
        auditLogs: auditLogs.map(serializeAuditLog),
      },
    });
  } catch (error) {
    return fail(error);
  }
}
