import type { TimetableElement, TimetableElementSelection, TimetableElementType } from "./types";

const timetableElementCollator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

export function isTimetableElementType(value: number): value is TimetableElementType {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function defaultTimetableElement(person: { personId: number; personType: number; klasseId?: number }): TimetableElementSelection | null {
  if (person.personId > 0 && isTimetableElementType(person.personType)) return { id: person.personId, type: person.personType };
  if ((person.klasseId || 0) > 0) return { id: person.klasseId as number, type: 1 };
  return null;
}

export function timetableElementLabel(element: TimetableElement) {
  return element.longname && element.longname !== element.name
    ? `${element.name} – ${element.longname}`
    : element.name;
}

export function sortTimetableElements(elements: TimetableElement[]) {
  return [...elements].sort((a, b) => a.type - b.type || timetableElementCollator.compare(timetableElementLabel(a), timetableElementLabel(b)));
}
