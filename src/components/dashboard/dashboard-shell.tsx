"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { useAppState } from "@/hooks/use-state";
import {
  ROLES,
  SCHEDULE_STATUSES,
  USER_STATUSES,
  type AppRole,
  type ScheduleStatus,
  type UserStatus,
} from "@/lib/constants";

const tabs = ["Resumen", "Usuarios", "Horarios", "Auditoría"] as const;
type Tab = (typeof tabs)[number];

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
    createSchedule,
    updateSchedule,
    deleteSchedule,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<Tab>("Resumen");
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as AppRole,
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as AppRole,
    status: "ACTIVE" as UserStatus,
  });
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    description: "",
    assignedUserId: "",
    startAt: "",
    endAt: "",
    status: "PLANNED" as ScheduleStatus,
  });
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  useEffect(() => {
    if (!bootstrapping && !session) {
      router.replace("/auth/login");
    }
  }, [bootstrapping, router, session]);

  if (bootstrapping || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="panel max-w-lg text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-400">ClockHub</p>
          <h1 className="mt-4 font-serif text-4xl text-stone-900">Cargando sesión</h1>
          <p className="mt-4 text-stone-500">
            Validando cookies seguras y preparando el dashboard.
          </p>
        </div>
      </main>
    );
  }

  const canManageUsers = session.role === "ADMIN";
  const canManageSchedules = session.role === "ADMIN" || session.role === "MANAGER";
  const canViewAudit = canManageSchedules;
  const availableTabs = tabs.filter((tab) => {
    if (tab === "Usuarios") return canManageUsers;
    if (tab === "Auditoría") return canViewAudit;
    return true;
  });

  const upcomingSchedules = schedules.slice(0, 5);
  const activeUsersCount = users.filter((user) => user.status === "ACTIVE").length;
  const approvedSchedules = schedules.filter((schedule) => schedule.status === "APPROVED").length;

  function beginEditUser(userId: string) {
    const selected = users.find((user) => user.id === userId);

    if (!selected) {
      return;
    }

    setEditingUserId(userId);
    setUserDraft({
      name: selected.name,
      email: selected.email,
      password: "",
      role: selected.role,
      status: selected.status,
    });
  }

  function beginEditSchedule(scheduleId: string) {
    const selected = schedules.find((schedule) => schedule.id === scheduleId);

    if (!selected) {
      return;
    }

    setEditingScheduleId(scheduleId);
    setScheduleForm({
      title: selected.title,
      description: selected.description ?? "",
      assignedUserId: selected.assignedUserId,
      startAt: toDateTimeLocal(selected.startAt),
      endAt: toDateTimeLocal(selected.endAt),
      status: selected.status,
    });
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createUser(userForm);
    setUserForm({ name: "", email: "", password: "", role: "EMPLOYEE" });
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUserId) {
      return;
    }

    await updateUser(editingUserId, {
      name: userDraft.name,
      email: userDraft.email,
      password: userDraft.password || undefined,
      role: userDraft.role,
      status: userDraft.status,
    });
    setEditingUserId(null);
  }

  async function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createSchedule({
      ...scheduleForm,
      startAt: fromDateTimeLocal(scheduleForm.startAt),
      endAt: fromDateTimeLocal(scheduleForm.endAt),
    });
    setScheduleForm({
      title: "",
      description: "",
      assignedUserId: users.find((user) => user.role === "EMPLOYEE" && user.status === "ACTIVE")?.id ?? "",
      startAt: "",
      endAt: "",
      status: "PLANNED",
    });
  }

  async function handleUpdateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingScheduleId) {
      return;
    }

    await updateSchedule(editingScheduleId, {
      ...scheduleForm,
      startAt: fromDateTimeLocal(scheduleForm.startAt),
      endAt: fromDateTimeLocal(scheduleForm.endAt),
    });
    setEditingScheduleId(null);
  }

  async function handleLogout() {
    await logout();
    router.replace("/auth/login");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/40 bg-[radial-gradient(circle_at_top,#f5d7aa,transparent_42%),linear-gradient(160deg,#f8f2eb,#f1e8db_48%,#e7dbc8)] p-5 shadow-[0_24px_90px_rgba(54,33,17,0.08)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-stone-500">
              Dashboard operacional
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-tight text-stone-950">
              Controla usuarios, turnos y trazabilidad sin salir del panel.
            </h1>
            <p className="mt-4 text-base text-stone-600 lg:text-lg">
              Sesión activa como <span className="font-semibold">{session.name}</span> con rol{" "}
              <span className="font-semibold">{session.role}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="secondary-button" disabled={busy} onClick={() => void handleLogout()} type="button">
              Cerrar sesión
            </button>
            <Link className="primary-button" href="/auth/login">
              Cambiar cuenta
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="metric-card">
            <span className="metric-label">Usuarios activos</span>
            <strong className="metric-value">{users.length > 0 ? activeUsersCount : session.active ? 1 : 0}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Turnos aprobados</span>
            <strong className="metric-value">{approvedSchedules}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Próximo bloque</span>
            <strong className="metric-value text-2xl">
              {upcomingSchedules[0] ? format(new Date(upcomingSchedules[0].startAt), "dd MMM") : "Sin turnos"}
            </strong>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <FeedbackBanner />
      </div>

      <nav className="mt-6 flex flex-wrap gap-3">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? "bg-stone-950 text-white"
                : "bg-white text-stone-600 shadow-[0_10px_30px_rgba(45,28,14,0.08)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Resumen" && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker">Actividad inmediata</p>
                <h2 className="section-title">Próximos horarios</h2>
              </div>
              <span className="pill">{schedules.length} registros</span>
            </div>

            <div className="mt-5 space-y-3">
              {upcomingSchedules.length === 0 ? (
                <p className="text-sm text-stone-500">Todavía no hay turnos cargados.</p>
              ) : (
                upcomingSchedules.map((schedule) => (
                  <article key={schedule.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-stone-900">{schedule.title}</h3>
                        <p className="text-sm text-stone-500">
                          {schedule.assignedUser.name} · {formatDateRange(schedule.startAt, schedule.endAt)}
                        </p>
                      </div>
                      <span className="pill">{schedule.status}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <p className="section-kicker">Accesos y gobierno</p>
            <h2 className="section-title">Reglas activas</h2>
            <div className="mt-5 grid gap-3">
              {[
                "Access token corto y refresh token rotado por cookies HttpOnly.",
                "Managers gestionan empleados; admins gestionan toda la organización.",
                "Los solapamientos de horario se bloquean antes de persistir.",
                "Cada alta, baja o modificación crítica deja rastro en auditoría.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-stone-200 p-4 text-sm text-stone-600">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "Usuarios" && canManageUsers && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="panel space-y-4" onSubmit={handleCreateUser}>
            <div>
              <p className="section-kicker">Nuevo usuario</p>
              <h2 className="section-title">Alta controlada</h2>
            </div>

            <input
              className="field"
              placeholder="Nombre completo"
              value={userForm.name}
              onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="field"
              placeholder="correo@empresa.com"
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
            />
            <input
              className="field"
              placeholder="Contraseña temporal"
              type="password"
              value={userForm.password}
              onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
            />
            <select
              className="field"
              value={userForm.role}
              onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as AppRole }))}
            >
              {ROLES.filter((role) => session.role === "ADMIN" || role === "EMPLOYEE").map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button className="primary-button w-full" disabled={busy} type="submit">
              Crear usuario
            </button>
          </form>

          <div className="panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker">Directorio</p>
                <h2 className="section-title">Usuarios registrados</h2>
              </div>
              <span className="pill">{users.length}</span>
            </div>

            <div className="mt-5 grid gap-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => beginEditUser(user.id)}
                  className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
                    editingUserId === user.id
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-200 bg-stone-50 hover:border-stone-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className={`text-sm ${editingUserId === user.id ? "text-white/70" : "text-stone-500"}`}>
                        {user.email}
                      </p>
                    </div>
                    <span className="pill">{user.role}</span>
                  </div>
                </button>
              ))}
            </div>

            {editingUserId && (
              <form className="mt-6 grid gap-3 rounded-3xl border border-stone-200 p-4" onSubmit={handleUpdateUser}>
                <h3 className="font-semibold text-stone-900">Editar usuario</h3>
                <input
                  className="field"
                  value={userDraft.name}
                  onChange={(event) => setUserDraft((current) => ({ ...current, name: event.target.value }))}
                />
                <input
                  className="field"
                  type="email"
                  value={userDraft.email}
                  onChange={(event) => setUserDraft((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  className="field"
                  type="password"
                  placeholder="Nueva contraseña opcional"
                  value={userDraft.password}
                  onChange={(event) => setUserDraft((current) => ({ ...current, password: event.target.value }))}
                />
                <select
                  className="field"
                  value={userDraft.role}
                  onChange={(event) => setUserDraft((current) => ({ ...current, role: event.target.value as AppRole }))}
                >
                  {ROLES.filter((role) => session.role === "ADMIN" || role === "EMPLOYEE").map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <select
                  className="field"
                  value={userDraft.status}
                  onChange={(event) => setUserDraft((current) => ({ ...current, status: event.target.value as UserStatus }))}
                >
                  {USER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-3">
                  <button className="primary-button" disabled={busy} type="submit">
                    Guardar cambios
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setEditingUserId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    type="button"
                    onClick={() => void deactivateUser(editingUserId)}
                  >
                    Desactivar
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      {activeTab === "Horarios" && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {canManageSchedules && (
            <form
              className="panel space-y-4"
              onSubmit={editingScheduleId ? handleUpdateSchedule : handleCreateSchedule}
            >
              <div>
                <p className="section-kicker">{editingScheduleId ? "Editar turno" : "Nuevo turno"}</p>
                <h2 className="section-title">
                  {editingScheduleId ? "Ajuste de horario" : "Asignación de horario"}
                </h2>
              </div>

              <input
                className="field"
                placeholder="Nombre del turno"
                value={scheduleForm.title}
                onChange={(event) => setScheduleForm((current) => ({ ...current, title: event.target.value }))}
              />
              <textarea
                className="field min-h-28 resize-y"
                placeholder="Detalle operativo"
                value={scheduleForm.description}
                onChange={(event) => setScheduleForm((current) => ({ ...current, description: event.target.value }))}
              />
              <select
                className="field"
                value={scheduleForm.assignedUserId}
                onChange={(event) =>
                  setScheduleForm((current) => ({ ...current, assignedUserId: event.target.value }))
                }
              >
                <option value="">Selecciona un usuario</option>
                {users
                  .filter((user) => user.status === "ACTIVE" && (session.role === "ADMIN" || user.role === "EMPLOYEE"))
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.role}
                    </option>
                  ))}
              </select>
              <input
                className="field"
                type="datetime-local"
                value={scheduleForm.startAt}
                onChange={(event) => setScheduleForm((current) => ({ ...current, startAt: event.target.value }))}
              />
              <input
                className="field"
                type="datetime-local"
                value={scheduleForm.endAt}
                onChange={(event) => setScheduleForm((current) => ({ ...current, endAt: event.target.value }))}
              />
              <select
                className="field"
                value={scheduleForm.status}
                onChange={(event) =>
                  setScheduleForm((current) => ({ ...current, status: event.target.value as ScheduleStatus }))
                }
              >
                {SCHEDULE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-3">
                <button className="primary-button" disabled={busy} type="submit">
                  {editingScheduleId ? "Guardar turno" : "Crear turno"}
                </button>
                {editingScheduleId && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setEditingScheduleId(null);
                      setScheduleForm({
                        title: "",
                        description: "",
                        assignedUserId: "",
                        startAt: "",
                        endAt: "",
                        status: "PLANNED",
                      });
                    }}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker">Vista operativa</p>
                <h2 className="section-title">Horarios</h2>
              </div>
              <span className="pill">{schedules.length}</span>
            </div>

            <div className="mt-5 grid gap-4">
              {schedules.length === 0 ? (
                <p className="text-sm text-stone-500">No hay turnos para mostrar.</p>
              ) : (
                schedules.map((schedule) => (
                  <article key={schedule.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-stone-900">{schedule.title}</h3>
                          <span className="pill">{schedule.status}</span>
                        </div>
                        <p className="text-sm text-stone-600">
                          {schedule.assignedUser.name} · {formatDateRange(schedule.startAt, schedule.endAt)}
                        </p>
                        {schedule.description && (
                          <p className="text-sm text-stone-500">{schedule.description}</p>
                        )}
                      </div>

                      {canManageSchedules && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => beginEditSchedule(schedule.id)}
                          >
                            Editar
                          </button>
                          <button
                            className="secondary-button"
                            disabled={busy}
                            type="button"
                            onClick={() => void deleteSchedule(schedule.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "Auditoría" && canViewAudit && (
        <section className="mt-6 panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-kicker">Trazabilidad</p>
              <h2 className="section-title">Registro de auditoría</h2>
            </div>
            <span className="pill">{auditLogs.length}</span>
          </div>

          <div className="mt-5 space-y-3">
            {auditLogs.map((log) => (
              <article key={log.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-stone-900">{log.action}</p>
                    <p className="text-sm text-stone-600">{log.description}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-400">
                      {log.entityType} · {log.entityId}
                    </p>
                  </div>
                  <div className="text-sm text-stone-500">
                    <p>{log.actor?.name ?? "Sistema"}</p>
                    <p>{format(new Date(log.createdAt), "dd MMM yyyy, HH:mm")}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
