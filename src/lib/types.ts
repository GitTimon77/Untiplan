export type NamedElement = { id: number; name: string; longname?: string; orgid?: number; orgname?: string };
export type Lesson = { id: number; date: number; startTime: number; endTime: number; lstype?: string; code?: string; info?: string; substText?: string; lstext?: string; lsnumber?: number; statflags?: string; activityType?: string; sg?: string; bkRemark?: string; bkText?: string; kl?: NamedElement[]; te?: NamedElement[]; su?: NamedElement[]; ro?: NamedElement[] };
export type Course = { key: string; subjectId: number; teacherId: number; subject: string; teacher: string };
export type Holiday = { id: number; startDate: number; endDate: number; name: string; longName?: string };
export type TimeGrid = { day: number; timeUnits: Array<{ startTime: number; endTime: number }> };
export type TimetablePayload = { lessons: Lesson[]; courses: Course[]; selectedCourseKeys: string[]; filterEnabled: boolean; holidays: Holiday[]; timeGrid: TimeGrid[]; schoolYear?: string; latestImportTime?: number; range: { startDate: number; endDate: number } };
