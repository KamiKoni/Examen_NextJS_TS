import { PrismaClient, Role, ScheduleStatus, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, set } from "date-fns";

// Seed creates the three demo roles and a first approved schedule for local testing.
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@clockhub.local" },
    update: {
      name: "Alicia Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
    create: {
      email: "admin@clockhub.local",
      name: "Alicia Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@clockhub.local" },
    update: {
      name: "Marco Manager",
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
    create: {
      email: "manager@clockhub.local",
      name: "Marco Manager",
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@clockhub.local" },
    update: {
      name: "Elena Employee",
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
    create: {
      email: "employee@clockhub.local",
      name: "Elena Employee",
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });

  const baseDate = addDays(new Date(), 1);
  const shiftStart = set(baseDate, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
  const shiftEnd = set(baseDate, { hours: 17, minutes: 0, seconds: 0, milliseconds: 0 });

  await prisma.schedule.upsert({
    where: { id: "seed-shift-employee" },
    update: {
      title: "Turno de apertura",
      description: "Cobertura de soporte y apertura del día.",
      startAt: shiftStart,
      endAt: shiftEnd,
      status: ScheduleStatus.APPROVED,
      assignedUserId: employee.id,
      createdById: manager.id,
      updatedById: admin.id,
    },
    create: {
      id: "seed-shift-employee",
      title: "Turno de apertura",
      description: "Cobertura de soporte y apertura del día.",
      startAt: shiftStart,
      endAt: shiftEnd,
      status: ScheduleStatus.APPROVED,
      assignedUserId: employee.id,
      createdById: manager.id,
      updatedById: admin.id,
    },
  });

  console.log("Seed complete");
  console.log({
    admin: "admin@clockhub.local / ChangeMe123!",
    manager: "manager@clockhub.local / ChangeMe123!",
    employee: "employee@clockhub.local / ChangeMe123!",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
