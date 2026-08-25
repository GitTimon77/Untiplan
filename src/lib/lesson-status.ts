import type { Lesson } from "./types";
export type LessonStatus = "cancelled" | "substitution" | "irregular" | "event" | "normal";

export function getLessonStatus(lesson: Lesson): LessonStatus {
  const code = (lesson.code || "").toLowerCase();

  if (code === "cancelled" || code === "cancel" || code === "canceled") {
    return "cancelled";
  }

  if (
    (lesson.te ?? []).some(teacher => teacher.orgid && teacher.orgid !== teacher.id)
    || (lesson.ro ?? []).some(room => room.orgid && room.orgid !== room.id)
    || Boolean(lesson.substText)
  ) {
    return "substitution";
  }

  if ((lesson.activityType || "").toLowerCase().includes("event")) {
    return "event";
  }

  if (code === "irregular" || lesson.lstype === "irregular") {
    return "irregular";
  }

  return "normal";
}
