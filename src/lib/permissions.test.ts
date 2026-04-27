import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import {
  assertCanManageAssignment,
  assertCanViewUser,
  getAuditVisibilityFilter,
} from "@/lib/permissions";

describe("getAuditVisibilityFilter", () => {
  it("limits manager audit visibility to schedule and session entries", () => {
    expect(getAuditVisibilityFilter("MANAGER")).toEqual({
      entityType: {
        in: ["schedule", "session"],
      },
    });
  });

  it("returns no extra filter for admins", () => {
    expect(getAuditVisibilityFilter("ADMIN")).toBeUndefined();
  });
});

describe("assertCanViewUser", () => {
  it("allows users to view their own record", () => {
    expect(() => assertCanViewUser("EMPLOYEE", "user-1", "user-1")).not.toThrow();
  });

  it("rejects employees viewing another user", () => {
    expect(() => assertCanViewUser("EMPLOYEE", "user-1", "user-2")).toThrow(AppError);
  });
});

describe("assertCanManageAssignment", () => {
  it("allows managers to assign employee schedules", () => {
    expect(() => assertCanManageAssignment("MANAGER", "EMPLOYEE")).not.toThrow();
  });

  it("rejects managers assigning schedules to admins", () => {
    expect(() => assertCanManageAssignment("MANAGER", "ADMIN")).toThrow(AppError);
  });
});
