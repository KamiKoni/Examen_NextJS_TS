import type { AppRole } from "@/lib/constants";
import { AppError } from "@/lib/errors";

export function canManageUsers(role: AppRole) {
  return role === "ADMIN";
}

export function canViewUserDirectory(role: AppRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canManageSchedules(role: AppRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canViewAudit(role: AppRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function assertCanViewUser(actorRole: AppRole, actorId: string, targetUserId: string) {
  if (actorRole === "ADMIN" || actorId === targetUserId) {
    return;
  }

  throw new AppError(403, "FORBIDDEN", "You cannot access this user.");
}

export function assertCanManageRole(
  actorRole: AppRole,
  targetRole: AppRole,
  requestedRole?: AppRole,
) {
  if (actorRole === "ADMIN") {
    return;
  }

  throw new AppError(403, "FORBIDDEN", "Insufficient permissions.");
}

export function assertCanManageAssignment(actorRole: AppRole, assignedRole: AppRole) {
  if (actorRole === "ADMIN") {
    return;
  }

  if (actorRole === "MANAGER" && assignedRole === "EMPLOYEE") {
    return;
  }

  throw new AppError(403, "FORBIDDEN", "You cannot manage schedules for this user.");
}
