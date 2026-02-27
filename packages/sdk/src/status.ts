import { WORK_STATUSES, type WorkStatus } from "./constants";

export const WORK_STATUS_TRANSITIONS: Record<WorkStatus, readonly WorkStatus[]> = {
  planned: ["active", "blocked", "canceled"],
  active: ["blocked", "done", "canceled"],
  blocked: ["active", "canceled"],
  done: ["active"],
  canceled: [],
};

export function isWorkStatus(value: string): value is WorkStatus {
  return (WORK_STATUSES as readonly string[]).includes(value);
}

export function canTransitionWorkStatus(fromStatus: WorkStatus, toStatus: WorkStatus): boolean {
  return WORK_STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}
