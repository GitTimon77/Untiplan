import type { Course, Homework } from "./types";
import { messagePlainText } from "./messages-of-day";

type UnknownRecord = Record<string, unknown>;
type SubjectReference = { id: number; name?: string; longName?: string; longname?: string };

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

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase("de").replace(/\s+/g, " ");
}

function individualNames(value: unknown) {
  const candidates = Array.isArray(value) ? value : [value];
  return candidates.flatMap(candidate => {
    if (typeof candidate === "string") return [messagePlainText(candidate)];
    const source = record(candidate);
    if (!source) return [];
    return [source.longName, source.longname, source.displayName, source.name]
      .filter((name): name is string => typeof name === "string")
      .map(messagePlainText)
      .filter(Boolean);
  });
}

function lessonLabel(lesson: UnknownRecord | undefined, keys: string[]) {
  if (!lesson) return "";
  for (const key of keys) {
    const value = names(lesson[key]);
    if (value) return value;
  }
  return "";
}

function elementIds(value: unknown, original = false) {
  const candidates = Array.isArray(value) ? value : [value];
  return candidates.flatMap(candidate => {
    const source = record(candidate);
    const id = positiveInteger(original ? source?.orgid ?? source?.orgId ?? source?.id ?? candidate : source?.id ?? candidate);
    return id ? [id] : [];
  });
}

function homeworkCourseData(
  source: UnknownRecord,
  lesson: UnknownRecord | undefined,
  homeworkRecords: UnknownRecord[],
  subjectsByName: Map<string, number[]>,
) {
  const subjectIds = new Set([
    ...elementIds(source.subjectId),
    ...elementIds(lesson?.subject),
    ...elementIds(lesson?.subjects),
    ...elementIds(lesson?.su),
  ]);
  const subjectNames = [
    ...individualNames(source.subject),
    ...individualNames(source.lessonName),
    ...individualNames(lesson?.subject),
    ...individualNames(lesson?.subjects),
    ...individualNames(lesson?.su),
    ...individualNames(lesson?.lessonName),
  ];
  for (const name of subjectNames) {
    for (const id of subjectsByName.get(normalizedName(name)) ?? []) subjectIds.add(id);
  }
  const teacherIds = new Set([
    ...elementIds(source.teacherId, true),
    ...elementIds(lesson?.teacher, true),
    ...elementIds(lesson?.teachers, true),
    ...elementIds(lesson?.te, true),
    ...homeworkRecords.flatMap(homeworkRecord => elementIds(homeworkRecord.teacherId, true)),
  ]);
  return {
    teacherIds: [...teacherIds],
    courseKeys: [...subjectIds].flatMap(subjectId => [...teacherIds].map(teacherId => `${subjectId}-${teacherId}`)),
  };
}

function homeworkCandidates(value: unknown) {
  const root = record(value);
  const data = record(root?.data) ?? root;
  return {
    homeworks: Array.isArray(data?.homeworks) ? data.homeworks : [],
    lessons: Array.isArray(data?.lessons) ? data.lessons : [],
    records: Array.isArray(data?.records) ? data.records : [],
    teachers: Array.isArray(data?.teachers) ? data.teachers : [],
  };
}

export function normalizeHomeworks(value: unknown, subjectReferences: SubjectReference[] = []): Homework[] {
  const candidates = homeworkCandidates(value);
  const lessons = new Map<number, UnknownRecord>();
  candidates.lessons.forEach(candidate => {
    const lesson = record(candidate);
    const id = positiveInteger(lesson?.id ?? lesson?.lessonId);
    if (lesson && id) lessons.set(id, lesson);
  });
  const recordsByHomework = new Map<number, UnknownRecord[]>();
  candidates.records.forEach(candidate => {
    const homeworkRecord = record(candidate);
    const homeworkId = positiveInteger(homeworkRecord?.homeworkId);
    if (!homeworkRecord || !homeworkId) return;
    recordsByHomework.set(homeworkId, [...(recordsByHomework.get(homeworkId) ?? []), homeworkRecord]);
  });
  const teachers = new Map<number, string>();
  candidates.teachers.forEach(candidate => {
    const teacher = record(candidate);
    const id = positiveInteger(teacher?.id);
    const name = displayName(teacher);
    if (id && name) teachers.set(id, name);
  });
  const subjectsByName = new Map<string, number[]>();
  for (const subject of subjectReferences) {
    if (!positiveInteger(subject.id)) continue;
    for (const name of [subject.name, subject.longName, subject.longname]) {
      if (!name) continue;
      const key = normalizedName(name);
      subjectsByName.set(key, [...new Set([...(subjectsByName.get(key) ?? []), subject.id])]);
    }
  }

  const normalized = candidates.homeworks.flatMap((candidate, index) => {
    const source = record(candidate);
    if (!source) return [];
    const id = positiveInteger(source.id) ?? index + 1;
    const lessonId = positiveInteger(source.lessonId);
    const lesson = lessonId ? lessons.get(lessonId) : undefined;
    const homeworkRecords = recordsByHomework.get(id) ?? [];
    const assignedDate = untisDate(source.date ?? source.assignedDate);
    const dueDate = untisDate(source.dueDate) || untisDate(source.dueDateStr);
    const text = messagePlainText(source.text ?? source.content ?? source.description);
    if (!text || !dueDate) return [];
    const subject = names(source.subject ?? source.lessonName)
      || lessonLabel(lesson, ["subject", "subjects", "su", "lessonName"])
      || "Ohne Fachangabe";
    const courseData = homeworkCourseData(source, lesson, homeworkRecords, subjectsByName);
    const teacher = names(source.teacher ?? source.teacherName ?? source.teachers)
      || lessonLabel(lesson, ["teacher", "teachers", "te"])
      || courseData.teacherIds.map(teacherId => teachers.get(teacherId)).filter(Boolean).join(", ");
    const attachments = Array.isArray(source.attachments) ? source.attachments : [];
    const attachmentCount = Math.max(attachments.length, positiveInteger(source.attachmentCount) ?? 0);
    return [{
      id,
      ...(lessonId ? { lessonId } : {}),
      ...(courseData.courseKeys.length ? { courseKeys: courseData.courseKeys } : {}),
      ...(courseData.teacherIds.length ? { teacherIds: courseData.teacherIds } : {}),
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

export function applyHomeworkCourseFilter(homeworks: Homework[], courses: Course[], selected: string[], enabled: boolean) {
  if (!enabled || selected.length === 0) return homeworks;
  const allowedKeys = new Set(selected);
  const allowedCourses = courses.filter(course => allowedKeys.has(course.key));
  return homeworks.filter(homework => {
    if (homework.courseKeys?.some(key => allowedKeys.has(key))) return true;
    const subject = normalizedName(homework.subject);
    const teacher = normalizedName(homework.teacher);
    return allowedCourses.some(course => {
      const subjectMatches = [course.subject, ...(course.subjectAliases ?? [])]
        .some(name => normalizedName(name) === subject);
      if (!subjectMatches) return false;
      if (homework.teacherIds?.length) return homework.teacherIds.includes(course.teacherId);
      return !teacher || [course.teacher, ...(course.teacherAliases ?? [])]
        .some(name => normalizedName(name) === teacher);
    });
  });
}
