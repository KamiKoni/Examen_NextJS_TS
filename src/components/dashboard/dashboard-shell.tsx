'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { useAppState } from '@/hooks/use-state';
import {
  ROLES,
  SCHEDULE_STATUSES,
  USER_STATUSES,
  ROLE_OPTIONS,
  SCHEDULE_STATUS_OPTIONS,
  type AppRole,
  type ScheduleStatus,
  type UserStatus,
} from '@/lib/constants';
import type { UserRecord } from '@/types/app';
import { DocumentUploadPanel } from '@/components/dashboard/document-upload-panel';

// Main authenticated workspace for summaries, users, schedules, documents and audit views.
const tabs = [
  'Resumen',
  'Usuarios',
  'Horarios',
  'Documentos',
  'Auditoría',
] as const;
type Tab = (typeof tabs)[number];

// Helpers adapt persisted ISO timestamps to the browser-friendly datetime-local input format.
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
  return `${format(new Date(startAt), 'dd MMM yyyy, HH:mm')} - ${format(new Date(endAt), 'HH:mm')}`;
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
    refreshDashboard,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<Tab>('Resumen');

  // Local form state keeps edits isolated until the user submits a mutation.
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE' as AppRole,
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE' as AppRole,
    status: 'ACTIVE' as UserStatus,
  });

  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    assignedUserId: '',
    startAt: '',
    endAt: '',
    status: 'PLANNED' as ScheduleStatus,
  });
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null
  );

  const canManageUsers = session?.role === 'ADMIN';
  const canManageSchedules =
    session?.role === 'ADMIN' || session?.role === 'MANAGER';
  const canViewAudit = canManageSchedules;

  // Tabs are filtered client-side to match the same role expectations enforced by the API.
  const availableTabs = useMemo(
    () =>
      tabs.filter((tab) => {
        if (tab === 'Usuarios') return canManageUsers;
        if (tab === 'Auditoría') return canViewAudit;
        if (tab === 'Documentos') return canManageSchedules;
        return true;
      }),
    [canManageUsers, canManageSchedules, canViewAudit]
  );

  const upcomingSchedules = useMemo(() => schedules.slice(0, 5), [schedules]);
  const activeUsersCount = useMemo(
    () => users.filter((u) => u.status === 'ACTIVE').length,
    [users]
  );
  const approvedSchedules = useMemo(
    () => schedules.filter((s) => s.status === 'APPROVED').length,
    [schedules]
  );

  // If the provider loses the session after bootstrap, return the user to login immediately.
  useEffect(() => {
    if (!bootstrapping && !session) {
      router.replace('/auth/login');
    }
  }, [bootstrapping, router, session]);

  if (bootstrapping || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="panel max-w-lg text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-400">
            ClockHub
          </p>
          <h1 className="mt-4 font-serif text-4xl text-stone-900">
            Cargando sesión
          </h1>
          <p className="mt-4 text-stone-500">
            Validando cookies seguras y preparando el dashboard.
          </p>
        </div>
      </main>
    );
  }

  // Action handlers delegate mutations to AppProvider and keep local form state in sync.
  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/auth/login');
    }
  }

  function beginEditUser(userId: string) {
    const selected = users.find((u) => u.id === userId);
    if (!selected) return;
    setEditingUserId(userId);
    setUserDraft({
      name: selected.name,
      email: selected.email,
      password: '',
      role: selected.role,
      status: selected.status,
    });
  }

  function beginEditSchedule(scheduleId: string) {
    const selected = schedules.find((s) => s.id === scheduleId);
    if (!selected) return;
    setEditingScheduleId(scheduleId);
    setScheduleForm({
      title: selected.title,
      description: selected.description ?? '',
      assignedUserId: selected.assignedUserId,
      startAt: toDateTimeLocal(selected.startAt),
      endAt: toDateTimeLocal(selected.endAt),
      status: selected.status,
    });
  }

  // User handlers
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
        setEditingUserId(null);
      } else {
        await createUser({
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
        });
      }

      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
      });
    } catch (error) {
      // Error is handled by the context
    }
  }

  function startUserEdit(user: UserRecord) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
  }

  function cancelUserEdit() {
    setEditingUserId(null);
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
    });
  }

  async function handleUserDeactivate(userId: string) {
    if (confirm('¿Estás seguro de que quieres desactivar este usuario?')) {
      try {
        await deactivateUser(userId);
      } catch (error) {
        // Error is handled by the context
      }
    }
  }

  // Schedule handlers
  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (editingScheduleId) {
        await updateSchedule(editingScheduleId, {
          title: scheduleForm.title,
          description: scheduleForm.description,
          assignedUserId: scheduleForm.assignedUserId,
          startAt: fromDateTimeLocal(scheduleForm.startAt),
          endAt: fromDateTimeLocal(scheduleForm.endAt),
          status: scheduleForm.status,
        });
        setEditingScheduleId(null);
      } else {
        await createSchedule({
          title: scheduleForm.title,
          description: scheduleForm.description,
          assignedUserId: scheduleForm.assignedUserId,
          startAt: fromDateTimeLocal(scheduleForm.startAt),
          endAt: fromDateTimeLocal(scheduleForm.endAt),
          status: scheduleForm.status,
        });
      }

      setScheduleForm({
        title: '',
        description: '',
        assignedUserId: '',
        startAt: '',
        endAt: '',
        status: 'PLANNED',
      });
    } catch (error) {
      // Error is handled by the context
    }
  }

  function cancelScheduleEdit() {
    setEditingScheduleId(null);
    setScheduleForm({
      title: '',
      description: '',
      assignedUserId: '',
      startAt: '',
      endAt: '',
      status: 'PLANNED',
    });
  }

  async function handleScheduleDelete(scheduleId: string) {
    if (confirm('¿Estás seguro de que quieres cancelar este horario?')) {
      try {
        await deleteSchedule(scheduleId);
      } catch (error) {
        // Error is handled by the context
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">ClockHub Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {session.name}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {session.role}
              </span>
              <button
                onClick={handleLogout}
                disabled={busy}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {busy ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm border-r border-gray-200">
          <div className="p-4">
            <nav className="space-y-1">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === tab
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeTab === 'Resumen' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Manage schedules, users, and documents
                </p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">U</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Active Users
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {activeUsersCount}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">S</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Approved Schedules
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {approvedSchedules}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">P</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Pending Schedules
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {schedules.length - approvedSchedules}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Schedules */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Upcoming Schedules
                  </h3>
                  <div className="mt-5">
                    <div className="space-y-3">
                      {upcomingSchedules.map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{schedule.title}</p>
                            <p className="text-sm text-gray-500">{schedule.assignedUser.name}</p>
                            <p className="text-xs text-gray-400">
                              {formatDateRange(schedule.startAt, schedule.endAt)}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            schedule.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : schedule.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {schedule.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Usuarios' && canManageUsers && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Create and manage user accounts
                </p>
              </div>

              {/* Create/Edit User Form */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingUserId ? 'Edit User' : 'Create New User'}
                  </h3>
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          id="user-name"
                          type="text"
                          value={userForm.name}
                          onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="user-email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          id="user-email"
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="user-password" className="block text-sm font-medium text-gray-700">
                          Password
                        </label>
                        <input
                          id="user-password"
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required={!editingUserId}
                        />
                      </div>
                      <div>
                        <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          id="user-role"
                          value={userForm.role}
                          onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as AppRole }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={cancelUserEdit}
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {editingUserId ? 'Update' : 'Create'} User
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Users List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Registered Users
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {ROLE_OPTIONS.find((r) => r.value === user.role)?.label}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startUserEdit(user)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={busy}
                          >
                            Edit
                          </button>
                          {user.id !== session?.id && (
                            <button
                              onClick={() => handleUserDeactivate(user.id)}
                              className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              disabled={busy}
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Horarios' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Create and manage work schedules
                </p>
              </div>

              {/* Create/Edit Schedule Form */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingScheduleId ? 'Edit Schedule' : 'Create New Schedule'}
                  </h3>
                  <form onSubmit={handleScheduleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="schedule-title" className="block text-sm font-medium text-gray-700">
                          Title
                        </label>
                        <input
                          id="schedule-title"
                          type="text"
                          value={scheduleForm.title}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="schedule-description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="schedule-description"
                          value={scheduleForm.description}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="schedule-user" className="block text-sm font-medium text-gray-700">
                          Assigned User
                        </label>
                        <select
                          id="schedule-user"
                          value={scheduleForm.assignedUserId}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, assignedUserId: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        >
                          <option value="">Select a user</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="schedule-status" className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          id="schedule-status"
                          value={scheduleForm.status}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, status: e.target.value as ScheduleStatus }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {SCHEDULE_STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="schedule-start" className="block text-sm font-medium text-gray-700">
                          Start Date & Time
                        </label>
                        <input
                          id="schedule-start"
                          type="datetime-local"
                          value={scheduleForm.startAt}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, startAt: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="schedule-end" className="block text-sm font-medium text-gray-700">
                          End Date & Time
                        </label>
                        <input
                          id="schedule-end"
                          type="datetime-local"
                          value={scheduleForm.endAt}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, endAt: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={cancelScheduleEdit}
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {editingScheduleId ? 'Update' : 'Create'} Schedule
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Schedules List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Scheduled Shifts
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {schedules.map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{schedule.title}</p>
                          <p className="text-sm text-gray-500">{schedule.assignedUser.name}</p>
                          <p className="text-xs text-gray-400">
                            {formatDateRange(schedule.startAt, schedule.endAt)}
                          </p>
                          {schedule.description && (
                            <p className="text-xs text-gray-500 mt-1">{schedule.description}</p>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                            schedule.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : schedule.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {schedule.status}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => beginEditSchedule(schedule.id)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={busy}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleScheduleDelete(schedule.id)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Documentos' && canManageSchedules && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Upload and analyze documents
                </p>
              </div>

              <DocumentUploadPanel onUpload={refreshDashboard} disabled={busy} />
            </div>
          )}

          {activeTab === 'Auditoría' && canViewAudit && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
                <p className="mt-1 text-sm text-gray-600">
                  View system activity and changes
                </p>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {log.actor?.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{log.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
