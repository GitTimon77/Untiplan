import type { Course, Lesson } from "./types";

export function teacherIdentity(teacher?: { id: number; orgid?: number }) {
  return teacher?.orgid ?? teacher?.id ?? 0;
}

export function lessonCourseKeys(lesson: Lesson) {
  const keys: string[] = [];
  for (const subject of lesson.su ?? []) {
    for (const teacher of lesson.te ?? []) {
      keys.push(`${subject.id}-${teacherIdentity(teacher)}`);
    }
  }
  return keys;
}

export function deriveCourses(lessons: Lesson[]): Course[] {
  const map = new Map<string, Course>();
  for (const lesson of lessons) {
    for (const subject of lesson.su ?? []) {
      for (const teacher of lesson.te ?? []) {
        const teacherId = teacherIdentity(teacher);
        const key = `${subject.id}-${teacherId}`;
        const subjectAliases = [...new Set([subject.longname, subject.name].filter((value): value is string => Boolean(value)))];
        const teacherAliases = [...new Set([teacher.orgname, teacher.longname, teacher.name].filter((value): value is string => Boolean(value)))];
        const existing = map.get(key);
        if (existing) {
          existing.subjectAliases = [...new Set([...(existing.subjectAliases ?? []), ...subjectAliases])];
          existing.teacherAliases = [...new Set([...(existing.teacherAliases ?? []), ...teacherAliases])];
        } else {
          map.set(key, {
            key,
            subjectId: subject.id,
            teacherId,
            subject: subject.longname || subject.name,
            teacher: teacher.orgname || teacher.longname || teacher.name,
            subjectAliases,
            teacherAliases,
          });
        }
      }
    }
  }

  return [...map.values()].sort((a, b) => a.subject.localeCompare(b.subject, "de"));
}

export function applyCourseFilter(lessons: Lesson[], selected: string[], enabled: boolean) {
  if (!enabled || selected.length === 0) return lessons;
  const allowed = new Set(selected);
  return lessons.filter(lesson => lessonCourseKeys(lesson).some(key => allowed.has(key)));
}
