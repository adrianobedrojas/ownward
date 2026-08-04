import "server-only";

export const SUPPORT_SUBJECT_MAX = 300;
export const SUPPORT_MESSAGE_MAX = 5000;

export const SUPPORT_CATEGORY_VALUES = [
  "billing",
  "technical",
  "feature",
  "account",
  "security",
  "sales",
  "compliance",
  "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORY_VALUES)[number];

export const SUPPORT_STATUS_VALUES = [
  "open",
  "in_progress",
  "waiting_on_user",
  "waiting_on_internal",
  "resolved",
  "closed",
  "archived",
] as const;

export type SupportStatus = (typeof SUPPORT_STATUS_VALUES)[number];

export const SUPPORT_PRIORITY_VALUES = ["low", "normal", "high", "urgent"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITY_VALUES)[number];

const STATUS_TRANSITIONS: Record<SupportStatus, SupportStatus[]> = {
  open: ["in_progress", "waiting_on_user", "waiting_on_internal", "resolved", "closed", "archived"],
  in_progress: ["waiting_on_user", "waiting_on_internal", "resolved", "closed", "archived"],
  waiting_on_user: ["in_progress", "resolved", "closed", "archived"],
  waiting_on_internal: ["in_progress", "resolved", "closed", "archived"],
  resolved: ["in_progress", "closed", "archived"],
  closed: ["in_progress", "archived"],
  archived: ["closed"],
};

export function isSupportCategory(value: string): value is SupportCategory {
  return SUPPORT_CATEGORY_VALUES.includes(value as SupportCategory);
}

export function isSupportStatus(value: string): value is SupportStatus {
  return SUPPORT_STATUS_VALUES.includes(value as SupportStatus);
}

export function isSupportPriority(value: string): value is SupportPriority {
  return SUPPORT_PRIORITY_VALUES.includes(value as SupportPriority);
}

export function canTransitionSupportStatus(fromStatus: SupportStatus, toStatus: SupportStatus): boolean {
  if (fromStatus === toStatus) return true;
  return STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}
