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

export function namedElementLabel(element: Pick<TimetableElement, "name" | "longname">) {
  const shortName = element.name.trim();
  const fullName = element.longname?.trim();
  return fullName && fullName.localeCompare(shortName, "de", { sensitivity: "base" }) !== 0
    ? `${fullName} (${shortName})`
    : fullName || shortName;
}

export function timetableElementLabel(element: TimetableElement) {
  return namedElementLabel(element);
}

export function sortTimetableElements(elements: TimetableElement[]) {
  return [...elements].sort((a, b) => {
    if (a.type !== b.type) return a.type - b.type;
    const aLabel = a.type === 1 ? a.name : timetableElementLabel(a);
    const bLabel = b.type === 1 ? b.name : timetableElementLabel(b);
    return timetableElementCollator.compare(aLabel, bLabel);
  });
}
