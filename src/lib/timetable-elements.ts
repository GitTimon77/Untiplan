import type { TimetableElementSelection, TimetableElementType } from "./types";

export function isTimetableElementType(value: number): value is TimetableElementType {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function defaultTimetableElement(person: { personId: number; personType: number; klasseId?: number }): TimetableElementSelection | null {
  if (person.personId > 0 && isTimetableElementType(person.personType)) return { id: person.personId, type: person.personType };
  if ((person.klasseId || 0) > 0) return { id: person.klasseId as number, type: 1 };
  return null;
}
