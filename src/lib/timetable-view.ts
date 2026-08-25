import { getLessonStatus } from "./lesson-status";
import type { Holiday, Lesson, TimeGrid } from "./types";

export type TimelineBounds = { start: number; end: number };
export type PositionedLesson = { lesson: Lesson; column: number; columnCount: number; start: number; end: number };

export function timeToMinutes(value: number) {
  return Math.floor(value / 100) * 60 + value % 100;
}

export function timetableBounds(timeGrid: TimeGrid[], lessons: Lesson[]): TimelineBounds {
  const gridTimes = timeGrid.flatMap(day => day.timeUnits.flatMap(unit => [unit.startTime, unit.endTime]));
  const lessonTimes = lessons.flatMap(lesson => [lesson.startTime, lesson.endTime]);
  const values = [...gridTimes, ...lessonTimes].filter(value => Number.isInteger(value) && value >= 0);
  if (!values.length) return { start: 8 * 60, end: 15 * 60 };
  const minutes = values.map(timeToMinutes);
  const start = Math.floor(Math.min(...minutes) / 30) * 30;
  const end = Math.ceil(Math.max(...minutes) / 30) * 30;
  return { start, end: Math.max(end, start + 60) };
}

export function positionLessons(lessons: Lesson[]): PositionedLesson[] {
  const sorted = [...lessons].sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime) || timeToMinutes(a.endTime) - timeToMinutes(b.endTime));
  const result: PositionedLesson[] = [];
  let index = 0;
  while (index < sorted.length) {
    const group: Lesson[] = [sorted[index++]];
    let groupEnd = timeToMinutes(group[0].endTime);
    while (index < sorted.length && timeToMinutes(sorted[index].startTime) < groupEnd) {
      group.push(sorted[index]);
      groupEnd = Math.max(groupEnd, timeToMinutes(sorted[index].endTime));
      index += 1;
    }
    const laneEnds: number[] = [];
    const placements = group.map(value => {
      const start = timeToMinutes(value.startTime);
      const end = Math.max(start + 1, timeToMinutes(value.endTime));
      let column = laneEnds.findIndex(laneEnd => laneEnd <= start);
      if (column < 0) column = laneEnds.length;
      laneEnds[column] = end;
      return { lesson:value,column,start,end };
    });
    result.push(...placements.map(value => ({ ...value,columnCount:laneEnds.length })));
  }
  return result;
}

export function holidaysForDate(holidays: Holiday[], date: number) {
  return holidays.filter(holiday => holiday.startDate <= date && holiday.endDate >= date);
}

export function changedLessons(lessons: Lesson[]) {
  return lessons.filter(lesson => getLessonStatus(lesson) !== "normal");
}

export function lessonChangeSummary(lesson: Lesson) {
  const status = getLessonStatus(lesson);
  if (status === "cancelled") return "Unterricht entfällt";
  const changes: string[] = [];
  const teacher = lesson.te?.find(value => value.orgname && value.orgname !== value.name);
  const room = lesson.ro?.find(value => value.orgname && value.orgname !== value.name);
  if (teacher?.orgname) changes.push(`${teacher.orgname} → ${teacher.name}`);
  if (room?.orgname) changes.push(`${room.orgname} → ${room.name}`);
  if (lesson.substText) changes.push(lesson.substText);
  return changes.join(" · ") || (status === "event" ? "Veranstaltung" : "Geänderter Unterricht");
}
