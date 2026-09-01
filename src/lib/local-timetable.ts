import type { TimetableElementSelection, TimetableElementType } from "./types";

export type TimetableViewMode = "today" | "week" | "day" | "messages";

export function timetableSelectionStorageKey(filterStorageId: string) {
  return `untiplan.timetable-selection.v1.${filterStorageId}`;
}

export function timetableViewModeStorageKey(filterStorageId: string) {
  return `untiplan.timetable-view-mode.v1.${filterStorageId}`;
}

export function normalizeTimetableSelection(value: unknown): TimetableElementSelection | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TimetableElementSelection>;
  if (!Number.isInteger(candidate.id) || (candidate.id || 0) <= 0) return null;
  if (!Number.isInteger(candidate.type) || (candidate.type || 0) < 1 || (candidate.type || 0) > 5) return null;
  return { id: candidate.id as number, type: candidate.type as TimetableElementType };
}

export function parseTimetableSelection(value: string | null) {
  if (!value) return null;
  try {
    return normalizeTimetableSelection(JSON.parse(value));
  } catch {
    return null;
  }
}

export function serializeTimetableSelection(value: TimetableElementSelection) {
  return JSON.stringify(normalizeTimetableSelection(value));
}

export function normalizeTimetableViewMode(value: unknown): TimetableViewMode {
  return value === "today" || value === "day" || value === "week" || value === "messages" ? value : "week";
}

export function parseTimetableViewMode(value: string | null): TimetableViewMode {
  if (!value) return "week";
  try {
    return normalizeTimetableViewMode(JSON.parse(value));
  } catch {
    return "week";
  }
}

export function serializeTimetableViewMode(value: TimetableViewMode) {
  return JSON.stringify(normalizeTimetableViewMode(value));
}
