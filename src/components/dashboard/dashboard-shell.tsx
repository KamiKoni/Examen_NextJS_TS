"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { DocumentUploadPanel } from "@/components/dashboard/document-upload-panel";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { useAppState } from "@/hooks/use-state";
import {
  ROLE_OPTIONS,
  SCHEDULE_STATUS_OPTIONS,
  type AppRole,
  type ScheduleStatus,
} from "@/lib/constants";
import type { AuditLogRecord, ScheduleRecord, UserRecord } from "@/types/app";

const tabs = ["Overview", "Users", "Schedules", "Documents", "Audit"] as const;
type Tab = (typeof tabs)[number];

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE" as AppRole,
};

const emptyScheduleForm = {
  title: "",
  description: "",
  assignedUserId: "",
  startAt: "",
  endAt: "",
  status: "PLANNED" as ScheduleStatus,
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return new Date(value).toISOString();
}

function formatDateRange(startAt: string, endAt: string) {
  return `${format(new Date(startAt), "dd MMM yyyy, HH:mm")} - ${format(new Date(endAt), "HH:mm")}`;
}

function getScheduleStatusClasses(status: ScheduleStatus) {
  if (status === "APPROVED") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "CANCELLED") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-900";
}

function getAuditActor(log: AuditLogRecord) {
  return log.actor?.name ?? "System";
}

function SectionIntro({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="section-kicker">{kicker}</p>
      <h2 className="section-title">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
        {description}
      </p>
    </div>
  );
}

function ScheduleCard({
  schedule,
  showAssignee,
  canManage,
  busy,
  onEdit,
  onDelete,
}: {
  schedule: ScheduleRecord;
  showAssignee: boolean;
  canManage: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[rgba(74,48,26,0.12)] bg-white/80 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-stone-900">
              {schedule.title}
            </p>
            <span
              className={`pill ${getScheduleStatusClasses(schedule.status)}`}
            >
              {
                SCHEDULE_STATUS_OPTIONS.find(
                  (item) => item.value === schedule.status,
                )?.label
              }
            </span>
          </div>
          {showAssignee ? (
            <p className="text-sm text-stone-600">
              Assigned to {schedule.assignedUser.name}
            </p>
          ) : null}
          <p className="text-sm text-stone-500">
            {formatDateRange(schedule.startAt, schedule.endAt)}
          </p>
          {schedule.description ? (
            <p className="text-sm leading-6 text-stone-600">
              {schedule.description}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="secondary-button"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-full border border-rose-200 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-rose-700 transition hover:bg-rose-50 disabled:opacity-55"
            >
              Cancel Shift
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardShell() {
  const router = useRouter();
  const {
    session,
    users,
    schedules,
    auditLogs,
    bootstrapping,
    busy,
    logout,
    createUser,
    updateUser,
    deactivateUser,
    hardDeleteUser,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    hardDeleteSchedule,
    refreshDashboard,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null,
  );

  const canManageUsers = session?.role === "ADMIN";
  const canManageSchedules =
    session?.role === "ADMIN" || session?.role === "MANAGER";
  const canViewAudit = canManageSchedules;
  const showAssigneeName = canManageSchedules;

  const availableTabs = useMemo(
    () =>
      tabs.filter((tab) => {
        if (tab === "Users") return canManageUsers;
        if (tab === "Documents") return canManageSchedules;
        if (tab === "Audit") return canViewAudit;
        return true;
      }),
    [canManageSchedules, canManageUsers, canViewAudit],
  );

  const upcomingSchedules = useMemo(() => schedules.slice(0, 5), [schedules]);
  const activeUsersCount = useMemo(
    () => users.filter((user) => user.status === "ACTIVE").length,
    [users],
  );
  const approvedSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.status === "APPROVED").length,
    [schedules],
  );
  const pendingSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.status === "PLANNED").length,
    [schedules],
  );

  useEffect(() => {
    if (!bootstrapping && !session) {
      router.replace("/auth/login");
    }
  }, [bootstrapping, router, session]);

  if (bootstrapping || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="panel max-w-lg text-center">
          <p className="section-kicker">ClockHub</p>
          <h1 className="section-title">Loading session</h1>
          <p className="mt-4 text-stone-500">
            Validating secure cookies and preparing your workspace.
          </p>
        </div>
      </main>
    );
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      // Use a full-page redirect to avoid client routing timing issues
      // that can leave the dashboard stuck showing the loading state.
      window.location.href = "/auth/login";
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (editingUserId) {
        await updateUser(editingUserId, {
          name: userForm.name,
          email: userForm.email,
          password: userForm.password || undefined,
          role: userForm.role,
        });
      } else {
        await createUser(userForm);
      }

      setEditingUserId(null);
      setUserForm(emptyUserForm);
    } catch {
      // Shared feedback handles request failures.
    }
  }

  function startUserEdit(user: UserRecord) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
  }

  function cancelUserEdit() {
    setEditingUserId(null);
    setUserForm(emptyUserForm);
  }

  async function handleUserDeactivate(userId: string) {
    if (!confirm("Are you sure you want to deactivate this user?")) return;

    try {
      // Ask whether to permanently delete or just deactivate.
      const hard = confirm(
        "Permanently delete this user from the system? OK = permanently delete, Cancel = just deactivate.",
      );

      if (hard) {
        await hardDeleteUser(userId);
      } else {
        await deactivateUser(userId);
      }
    } catch {
      // Shared feedback handles request failures.
    }
  }

  function beginEditSchedule(schedule: ScheduleRecord) {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      title: schedule.title,
      description: schedule.description ?? "",
      assignedUserId: schedule.assignedUserId,
      startAt: toDateTimeLocal(schedule.startAt),
      endAt: toDateTimeLocal(schedule.endAt),
      status: schedule.status,
    });
  }

  function cancelScheduleEdit() {
    setEditingScheduleId(null);
    setScheduleForm(emptyScheduleForm);
  }

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload = {
        title: scheduleForm.title,
        description: scheduleForm.description,
        assignedUserId: scheduleForm.assignedUserId,
        startAt: fromDateTimeLocal(scheduleForm.startAt),
        endAt: fromDateTimeLocal(scheduleForm.endAt),
        status: scheduleForm.status,
      };

      if (editingScheduleId) {
        await updateSchedule(editingScheduleId, payload);
      } else {
        await createSchedule(payload);
      }

      setEditingScheduleId(null);
      setScheduleForm(emptyScheduleForm);
    } catch {
      // Shared feedback handles request failures.
    }
  }

  async function handleScheduleDelete(scheduleId: string) {
    if (!confirm("Are you sure you want to cancel this schedule?")) return;

    try {
      const hard = confirm(
        "Permanently delete this schedule? OK = permanently delete, Cancel = just cancel.",
      );

      if (hard) {
        await hardDeleteSchedule(scheduleId);
      } else {
        await deleteSchedule(scheduleId);
      }
    } catch {
      // Shared feedback handles request failures.
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10 lg:py-12">
      <div className="mb-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/30 bg-[linear-gradient(155deg,#1f120d_0%,#2a1710_42%,#4c2c1e_100%)] p-8 text-stone-50 shadow-[0_32px_100px_rgba(35,18,7,0.32)] lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.24),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.14),transparent_18%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">
                  ClockHub
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  Operations dashboard
                </p>
              </div>
              <div className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
                {session.role}
              </div>
            </div>

            <h1 className="mt-10 max-w-2xl font-serif text-5xl leading-tight">
              One workspace for schedules, activity, and operational visibility.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-200/85">
              Track your day, keep user access in order, and manage documents
              from a single secure interface.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">
                  Session
                </p>
                <p className="mt-3 text-base font-semibold text-white">
                  {session.name}
                </p>
                <p className="mt-1 text-sm text-stone-200/80">
                  {session.email}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">
                  Schedules
                </p>
                <p className="mt-3 text-3xl font-serif text-white">
                  {schedules.length}
                </p>
                <p className="mt-1 text-sm text-stone-200/80">
                  visible in your workspace
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">
                  Access
                </p>
                <p className="mt-3 text-3xl font-serif text-white">
                  {canManageSchedules ? "Team" : "Personal"}
                </p>
                <p className="mt-1 text-sm text-stone-200/80">
                  {canManageSchedules
                    ? "manage team operations"
                    : "see only your assigned shifts"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Workspace</p>
              <h2 className="section-title">Welcome back</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
                Navigate between your overview, schedules, documents, and audit
                tools.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="secondary-button"
            >
              {busy ? "Signing out..." : "Sign out"}
            </button>
          </div>

          <FeedbackBanner />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="metric-card">
              <span className="metric-label">Approved</span>
              <span className="metric-value">{approvedSchedules}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Planned</span>
              <span className="metric-value">{pendingSchedules}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Visible Users</span>
              <span className="metric-value">
                {canManageUsers ? activeUsersCount : 1}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Audit Entries</span>
              <span className="metric-value">
                {canViewAudit ? auditLogs.length : 0}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="panel h-fit">
          <p className="section-kicker">Sections</p>
          <nav className="mt-6 flex flex-col gap-2">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-[1rem] px-4 py-3 text-left text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-[rgba(44,29,20,0.10)] text-stone-900"
                    : "text-stone-600 hover:bg-[rgba(44,29,20,0.06)] hover:text-stone-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-6">
          {activeTab === "Overview" ? (
            <>
              <SectionIntro
                kicker="Overview"
                title="Today at a glance"
                description={
                  canManageSchedules
                    ? "Track schedule volume, team readiness, and the next shifts coming up."
                    : "Review your assigned shifts and keep your day in view."
                }
              />

              <div className="panel">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="section-kicker">Next up</p>
                    <h3 className="mt-2 font-serif text-2xl text-stone-900">
                      Upcoming schedules
                    </h3>
                  </div>
                  <span className="pill">{upcomingSchedules.length} items</span>
                </div>

                <div className="mt-6 space-y-3">
                  {upcomingSchedules.length > 0 ? (
                    upcomingSchedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        showAssignee={showAssigneeName}
                        canManage={false}
                        busy={busy}
                        onEdit={() => undefined}
                        onDelete={() => undefined}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-stone-500">
                      No schedules available yet.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "Users" && canManageUsers ? (
            <>
              <SectionIntro
                kicker="Users"
                title="Manage access"
                description="Create new accounts, adjust roles, and keep user access current."
              />

              <div className="panel">
                <h3 className="font-serif text-2xl text-stone-900">
                  {editingUserId ? "Edit user" : "Create user"}
                </h3>
                <form onSubmit={handleUserSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-stone-700">
                        Name
                      </span>
                      <input
                        className="field"
                        value={userForm.name}
                        onChange={(event) =>
                          setUserForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-stone-700">
                        Email
                      </span>
                      <input
                        className="field"
                        type="email"
                        value={userForm.email}
                        onChange={(event) =>
                          setUserForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-stone-700">
                        Password
                      </span>
                      <input
                        className="field"
                        type="password"
                        value={userForm.password}
                        onChange={(event) =>
                          setUserForm((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        required={!editingUserId}
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-stone-700">
                        Role
                      </span>
                      <select
                        className="field"
                        value={userForm.role}
                        onChange={(event) =>
                          setUserForm((current) => ({
                            ...current,
                            role: event.target.value as AppRole,
                          }))
                        }
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={cancelUserEdit}
                      className="secondary-button"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="primary-button"
                    >
                      {editingUserId ? "Update user" : "Create user"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="panel">
                <h3 className="font-serif text-2xl text-stone-900">
                  Registered users
                </h3>
                <div className="mt-6 space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-[1.4rem] border border-[rgba(74,48,26,0.12)] bg-white/80 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-base font-semibold text-stone-900">
                            {user.name}
                          </p>
                          <p className="mt-1 text-sm text-stone-600">
                            {user.email}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="pill">
                              {
                                ROLE_OPTIONS.find(
                                  (role) => role.value === user.role,
                                )?.label
                              }
                            </span>
                            <span
                              className={`pill ${
                                user.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {user.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startUserEdit(user)}
                            disabled={busy}
                            className="secondary-button"
                          >
                            Edit
                          </button>
                          {user.id !== session.id ? (
                            <button
                              type="button"
                              onClick={() => handleUserDeactivate(user.id)}
                              disabled={busy}
                              className="rounded-full border border-rose-200 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-rose-700 transition hover:bg-rose-50 disabled:opacity-55"
                            >
                              Deactivate
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "Schedules" ? (
            <>
              <SectionIntro
                kicker="Schedules"
                title={
                  canManageSchedules ? "Plan work shifts" : "Your schedule"
                }
                description={
                  canManageSchedules
                    ? "Create, edit, and review schedules for the people you manage."
                    : "This area shows only the shifts assigned to your account."
                }
              />

              {canManageSchedules ? (
                <div className="panel">
                  <h3 className="font-serif text-2xl text-stone-900">
                    {editingScheduleId ? "Edit schedule" : "Create schedule"}
                  </h3>
                  <form
                    onSubmit={handleScheduleSubmit}
                    className="mt-6 space-y-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block space-y-2 md:col-span-2">
                        <span className="text-sm font-medium text-stone-700">
                          Title
                        </span>
                        <input
                          className="field"
                          value={scheduleForm.title}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          required
                        />
                      </label>

                      <label className="block space-y-2 md:col-span-2">
                        <span className="text-sm font-medium text-stone-700">
                          Description
                        </span>
                        <textarea
                          className="field min-h-[120px]"
                          value={scheduleForm.description}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-stone-700">
                          Assigned user
                        </span>
                        <select
                          className="field"
                          value={scheduleForm.assignedUserId}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              assignedUserId: event.target.value,
                            }))
                          }
                          required
                        >
                          <option value="">Select a user</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-stone-700">
                          Status
                        </span>
                        <select
                          className="field"
                          value={scheduleForm.status}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              status: event.target.value as ScheduleStatus,
                            }))
                          }
                        >
                          {SCHEDULE_STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-stone-700">
                          Start date and time
                        </span>
                        <input
                          className="field"
                          type="datetime-local"
                          value={scheduleForm.startAt}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              startAt: event.target.value,
                            }))
                          }
                          required
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-stone-700">
                          End date and time
                        </span>
                        <input
                          className="field"
                          type="datetime-local"
                          value={scheduleForm.endAt}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              endAt: event.target.value,
                            }))
                          }
                          required
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={cancelScheduleEdit}
                        className="secondary-button"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="primary-button"
                      >
                        {editingScheduleId
                          ? "Update schedule"
                          : "Create schedule"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              <div className="panel">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="section-kicker">Schedule list</p>
                    <h3 className="mt-2 font-serif text-2xl text-stone-900">
                      {canManageSchedules
                        ? "Managed shifts"
                        : "Assigned shifts"}
                    </h3>
                  </div>
                  <span className="pill">{schedules.length} total</span>
                </div>

                <div className="mt-6 space-y-3">
                  {schedules.length > 0 ? (
                    schedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        showAssignee={showAssigneeName}
                        canManage={canManageSchedules}
                        busy={busy}
                        onEdit={() => beginEditSchedule(schedule)}
                        onDelete={() => handleScheduleDelete(schedule.id)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-stone-500">
                      {canManageSchedules
                        ? "No schedules have been created yet."
                        : "You do not have any schedules assigned yet."}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "Documents" && canManageSchedules ? (
            <>
              <SectionIntro
                kicker="Documents"
                title="Upload and analyze files"
                description="Import schedule data from supported files and review the processing result."
              />
              <DocumentUploadPanel
                onUpload={refreshDashboard}
                disabled={busy}
              />
            </>
          ) : null}

          {activeTab === "Audit" && canViewAudit ? (
            <>
              <SectionIntro
                kicker="Audit"
                title="Recent activity"
                description="Review authentication events and operational changes across the system."
              />
              <div className="panel">
                <div className="space-y-3">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[1.4rem] border border-[rgba(74,48,26,0.12)] bg-white/80 p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(44,29,20,0.10)] text-sm font-semibold text-stone-700">
                            {getAuditActor(log).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-900">
                              {log.description}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-stone-500">
                      No audit activity available yet.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
