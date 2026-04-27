import { useAppContext } from "@/components/providers/app-provider";
import { useAuthContext } from "@/context/auth-context";
import { useScheduleContext } from "@/context/schedule-context";

// Convenience hooks keep imports small in feature components.
export function useAppState() {
  return useAppContext();
}

export function useAuthState() {
  return useAuthContext();
}

export function useScheduleState() {
  return useScheduleContext();
}
