import type { Homework } from "./types";
import { messagePlainText } from "./messages-of-day";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function positiveInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function untisDate(value: unknown) {
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.replaceAll("-", "")
    : value;
  const number = positiveInteger(normalized);
  if (!number) return 0;
  const year = Math.floor(number / 10000);
  const month = Math.floor((number % 10000) / 100);
  const day = number % 100;
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? number : 0;
}

function displayName(value: unknown): string {
  if (typeof value === "string") return messagePlainText(value);
  const source = record(value);
  if (!source) return "";
  return messagePlainText(source.longName ?? source.longname ?? source.displayName ?? source.name);
}

function names(value: unknown) {
  if (Array.isArray(value)) return value.map(displayName).filter(Boolean).join(", ");
  return displayName(value);
}

function lessonLabel(lesson: UnknownRecord | undefined, keys: string[]) {
  if (!lesson) return "";
  for (const key of keys) {
    const value = names(lesson[key]);
    if (value) return value;
  }
  return "";
}

function homeworkCandidates(value: unknown) {
  const root = record(value);
  const data = record(root?.data) ?? root;
  return {
    homeworks: Array.isArray(data?.homeworks) ? data.homeworks : [],
    lessons: Array.isArray(data?.lessons) ? data.lessons : [],
  };
}

export function normalizeHomeworks(value: unknown): Homework[] {
  const candidates = homeworkCandidates(value);
  const lessons = new Map<number, UnknownRecord>();
  candidates.lessons.forEach(candidate => {
    const lesson = record(candidate);
    const id = positiveInteger(lesson?.id ?? lesson?.lessonId);
    if (lesson && id) lessons.set(id, lesson);
  });

  const normalized = candidates.homeworks.flatMap((candidate, index) => {
    const source = record(candidate);
    if (!source) return [];
    const id = positiveInteger(source.id) ?? index + 1;
    const lessonId = positiveInteger(source.lessonId);
    const lesson = lessonId ? lessons.get(lessonId) : undefined;
    const assignedDate = untisDate(source.date ?? source.assignedDate);
    const dueDate = untisDate(source.dueDate) || untisDate(source.dueDateStr);
    const text = messagePlainText(source.text ?? source.content ?? source.description);
    if (!text || !dueDate) return [];
    const subject = names(source.subject ?? source.lessonName)
      || lessonLabel(lesson, ["subject", "subjects", "su", "lessonName"])
      || "Ohne Fachangabe";
    const teacher = names(source.teacher ?? source.teacherName ?? source.teachers)
      || lessonLabel(lesson, ["teacher", "teachers", "te"]);
    const attachments = Array.isArray(source.attachments) ? source.attachments : [];
    const attachmentCount = Math.max(attachments.length, positiveInteger(source.attachmentCount) ?? 0);
    return [{
      id,
      ...(lessonId ? { lessonId } : {}),
      assignedDate: assignedDate || dueDate,
      dueDate,
      text,
      subject,
      teacher,
      completed: source.completed === true,
      attachmentCount,
    }];
  });

  return [...new Map(normalized.map(homework => [homework.id, homework])).values()]
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.dueDate - b.dueDate || a.id - b.id);
}
