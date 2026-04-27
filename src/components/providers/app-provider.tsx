'use client';

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { AuthContext, type AuthContextValue } from '@/context/auth-context';
import {
  ScheduleContext,
  type ScheduleContextValue,
} from '@/context/schedule-context';
import type {
  CreateSchedulePayload,
  CreateUserPayload,
  DashboardSummary,
  NotificationState,
  RegisterPayload,
  SessionUser,
  UpdateSchedulePayload,
  UpdateUserPayload,
  UserRecord,
  ScheduleRecord,
  AuditLogRecord,
} from '@/types/app';

// AppProvider owns client-side session state, dashboard data and mutation helpers.
interface AppContextValue {
  session: SessionUser | null;
  users: UserRecord[];
  schedules: ScheduleRecord[];
  auditLogs: AuditLogRecord[];
  bootstrapping: boolean;
  busy: boolean;
  notification: NotificationState | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<void>;
  updateUser: (id: string, payload: UpdateUserPayload) => Promise<void>;
  deactivateUser: (id: string) => Promise<void>;
  createSchedule: (payload: CreateSchedulePayload) => Promise<void>;
  updateSchedule: (id: string, payload: UpdateSchedulePayload) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  clearNotification: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected request error.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(
    null
  );
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const bootstrapRef = useRef<(() => Promise<void>) | null>(null);

  async function refreshAuth() {
    // Reuse a single in-flight refresh request so parallel 401s do not stampede the backend.
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = (async () => {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        });

        return response.ok;
      })().finally(() => {
        refreshPromiseRef.current = null;
      });
    }

    return refreshPromiseRef.current;
  }

  async function requestData<T>(
    url: string,
    init?: RequestInit,
    retry = true
  ): Promise<T> {
    // All client requests share cookie credentials and the same auto-refresh retry behavior.
    const response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      data?: T;
      error?: { message?: string };
    };

    if (response.status === 401 && retry) {
      const refreshed = await refreshAuth();

      if (refreshed) {
        return requestData<T>(url, init, false);
      }
    }

    if (!response.ok || payload.success === false) {
      throw new Error(payload.error?.message ?? 'Request failed.');
    }

    return payload.data as T;
  }

  async function refreshDashboard() {
    setBusy(true);

    try {
      const data = await requestData<{ dashboard: DashboardSummary }>(
        '/api/dashboard'
      );

      // Transition the large dashboard payload to keep urgent input responsive.
      startTransition(() => {
        setSession(data.dashboard.session);
        setUsers(data.dashboard.users);
        setSchedules(data.dashboard.schedules);
        setAuditLogs(data.dashboard.auditLogs);
      });
    } catch {
      startTransition(() => {
        setSession(null);
        setUsers([]);
        setSchedules([]);
        setAuditLogs([]);
      });
    } finally {
      setBusy(false);
      setBootstrapping(false);
    }
  }

  bootstrapRef.current = refreshDashboard;

  useEffect(() => {
    // Delay bootstrap until after mount so the initial render stays deterministic.
    const timer = window.setTimeout(() => {
      void bootstrapRef.current?.();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function login(email: string, password: string) {
    setBusy(true);

    try {
      await requestData<{ user: SessionUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      await refreshDashboard();
      setNotification({
        tone: 'success',
        message: 'Session started successfully.',
      });
    } catch (error) {
      setNotification({
        tone: 'error',
        message: getErrorMessage(error),
      });
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function signup(payload: RegisterPayload) {
    setBusy(true);

    try {
      await requestData<{ user: SessionUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await login(payload.email, payload.password);
      setNotification({
        tone: 'success',
        message: 'Account created successfully.',
      });
    } catch (error) {
      setNotification({
        tone: 'error',
        message: getErrorMessage(error),
      });
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);

    try {
      await requestData<{ success: boolean }>(
        '/api/auth/logout',
        { method: 'POST' },
        false
      );
    } finally {
      startTransition(() => {
        setSession(null);
        setUsers([]);
        setSchedules([]);
        setAuditLogs([]);
        setNotification({
          tone: 'info',
          message: 'Session closed.',
        });
        setBootstrapping(false);
      });
      setBusy(false);
    }
  }

  async function withMutation(
    task: () => Promise<void>,
    successMessage: string,
    refresh = true
  ) {
    // Shared mutation wrapper keeps busy state, notification handling and optional refresh aligned.
    setBusy(true);

    try {
      await task();
      if (refresh) {
        await refreshDashboard();
      }
      setNotification({ tone: 'success', message: successMessage });
    } catch (error) {
      setNotification({ tone: 'error', message: getErrorMessage(error) });
      throw error;
    } finally {
      setBusy(false);
    }
  }

  const value: AppContextValue = {
    session,
    users,
    schedules,
    auditLogs,
    bootstrapping,
    busy,
    notification,
    login,
    signup,
    logout,
    refreshDashboard,
    createUser: async (payload) =>
      withMutation(async () => {
        await requestData('/api/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }, 'User created.'),
    updateUser: async (id, payload) =>
      withMutation(async () => {
        await requestData(`/api/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }, 'User updated.'),
    deactivateUser: async (id) =>
      withMutation(
        async () => {
          const data = await requestData<{ user: UserRecord }>(
            `/api/users/${id}`,
            {
              method: 'DELETE',
            }
          );

          setUsers((current) =>
            current.map((user) => (user.id === id ? data.user : user))
          );
        },
        'User deactivated.',
        false
      ),
    createSchedule: async (payload) =>
      withMutation(async () => {
        await requestData('/api/schedules', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }, 'Schedule created.'),
    updateSchedule: async (id, payload) =>
      withMutation(async () => {
        await requestData(`/api/schedules/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }, 'Schedule updated.'),
    deleteSchedule: async (id) =>
      withMutation(async () => {
        await requestData(`/api/schedules/${id}`, {
          method: 'DELETE',
        });
      }, 'Schedule deleted.'),
    clearNotification: () => setNotification(null),
  };

  const authValue: AuthContextValue = {
    session,
    bootstrapping,
    busy,
    notification,
    login,
    signup,
    logout,
    clearNotification: value.clearNotification,
  };

  const scheduleValue: ScheduleContextValue = {
    users,
    schedules,
    auditLogs,
    refreshDashboard,
    createUser: value.createUser,
    updateUser: value.updateUser,
    deactivateUser: value.deactivateUser,
    createSchedule: value.createSchedule,
    updateSchedule: value.updateSchedule,
    deleteSchedule: value.deleteSchedule,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <ScheduleContext.Provider value={scheduleValue}>
        <AppContext.Provider value={value}>{children}</AppContext.Provider>
      </ScheduleContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider.');
  }

  return context;
}
