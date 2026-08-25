import { changedLessons } from "./timetable-view";
import type { Lesson, TimetableElementSelection } from "./types";

export function notificationPreferenceKey(filterStorageId:string){return `untiplan.change-notifications.v1.${filterStorageId}`}
export function notificationSnapshotKey(filterStorageId:string,week:string,selection:TimetableElementSelection){return `untiplan.change-snapshot.v1.${filterStorageId}.${week}.${selection.type}-${selection.id}`}
export function changeSignature(lesson:Lesson){return JSON.stringify([lesson.id,lesson.date,lesson.startTime,lesson.endTime,lesson.code,lesson.lstype,lesson.activityType,lesson.substText,lesson.te?.map(value=>[value.id,value.orgid]),lesson.ro?.map(value=>[value.id,value.orgid])])}
export function newChanges(previous:string[],lessons:Lesson[]){const known=new Set(previous);return changedLessons(lessons).filter(lesson=>!known.has(changeSignature(lesson)))}
export function changeSnapshot(lessons:Lesson[]){return changedLessons(lessons).map(changeSignature)}
