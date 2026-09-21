import type { Exam, Lesson } from "./types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  const item = record(value);
  if (!item) return "";
  return [item.displayName, item.name, item.shortName, item.longName, item.longname]
    .find(candidate => typeof candidate === "string" && candidate.trim())?.toString().trim() || "";
}

function texts(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.map(text).filter(Boolean))];
}

function ids(value: unknown): number[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.flatMap(candidate => {
    const id = record(candidate)?.id;
    return typeof id === "number" && Number.isInteger(id) ? [id] : [];
  }))];
}

function dateAndTime(value: unknown): { date: number; time?: number } | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value) && value >= 19000101 && value <= 29991231) return { date:value };
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return {
      date:parsed.getFullYear() * 10000 + (parsed.getMonth() + 1) * 100 + parsed.getDate(),
      time:parsed.getHours() * 100 + parsed.getMinutes(),
    };
  }
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return null;
  return {
    date:Number(`${match[1]}${match[2]}${match[3]}`),
    ...(match[4] ? { time:Number(match[4]) * 100 + Number(match[5]) } : {}),
  };
}

function clock(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2359) return value;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : null;
}

function examRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const root = record(value);
  if (!root) return [];
  const grouped = ["examsDone", "examsUpcoming", "examsFuture"]
    .flatMap(key => examRecords(root[key]));
  if (grouped.length) return grouped;
  for (const key of ["data", "exams", "items", "content", "results"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
    const nested = record(root[key]);
    if (nested) {
      for (const nestedKey of ["exams", "items", "content", "results"]) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
      }
    }
  }
  return [];
}

export function normalizeExams(value: unknown): Exam[] {
  return examRecords(value).flatMap((candidate, index) => {
    const wrapper = record(candidate);
    const item = record(wrapper?.exam) ?? wrapper;
    if (!item || item.deleted === true) return [];
    const start = dateAndTime(item.examStart ?? item.startDateTime ?? item.start ?? item.date);
    const end = dateAndTime(item.examEnd ?? item.endDateTime ?? item.end);
    const date = start?.date ?? dateAndTime(item.examDate)?.date;
    const startTime = start?.time ?? clock(item.startTime);
    const endTime = end?.time ?? clock(item.endTime);
    const subject = text(item.subject ?? item.subjectName ?? (Array.isArray(item.subjects) ? item.subjects[0] : undefined));
    if (!date || startTime == null || endTime == null || endTime <= startTime || !subject) return [];
    const rawId = item.examId ?? item.id;
    const id = typeof rawId === "number" || typeof rawId === "string" ? rawId : `${date}-${startTime}-${subject}-${index}`;
    const classes = item.classes ?? item.klasse ?? item.class;
    const classIds = ids(classes);
    return [{
      id,
      date,
      startTime,
      endTime,
      subject,
      name:text(item.examName ?? item.name) || undefined,
      type:text(item.examType ?? item.type) || undefined,
      text:text(item.examText ?? item.text) || undefined,
      teachers:texts(item.teachers ?? item.teacher ?? item.invigilators),
      rooms:texts(item.rooms ?? item.room),
      classes:texts(classes),
      ...(classIds.length ? { classIds } : {}),
    }];
  });
}

function subjectKey(value: string) {
  return value.normalize("NFKD").toLocaleLowerCase("de").replace(/[^a-z0-9]/g, "");
}

export function examMatchesLesson(exam: Exam, lesson: Lesson) {
  if (exam.date !== lesson.date || exam.startTime >= lesson.endTime || exam.endTime <= lesson.startTime) return false;
  if (exam.classIds?.length && lesson.kl?.length && !lesson.kl.some(item => exam.classIds?.includes(item.id))) return false;
  const examSubject = subjectKey(exam.subject);
  return Boolean(examSubject) && (lesson.su || []).some(subject =>
    [subject.name, subject.longname].filter(Boolean).some(value => subjectKey(value || "") === examSubject),
  );
}

export function attachExamsToLessons(lessons: Lesson[], exams: Exam[]) {
  return lessons.map(lesson => ({ ...lesson, exam:exams.find(exam => examMatchesLesson(exam, lesson)) }));
}
