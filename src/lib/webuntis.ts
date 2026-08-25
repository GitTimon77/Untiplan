import "server-only";
import type { Holiday, Lesson, TimeGrid, TimetableElement, TimetableElementSelection, TimetableElementType } from "./types";
import { normalizeWebUntisServer } from "./schools";
import { defaultTimetableElement } from "./timetable-elements";
export type LoginInput = { server: string; school: string; username: string; password: string };
type AuthResult = { sessionId: string; personId: number; personType: number; klasseId?: number; displayName?: string };
type RpcResponse<T> = { result?: T; error?: { code: number; message: string; data?: unknown } };
type MasterDataElement = { id: number; name?: string; longName?: string; longname?: string; foreName?: string };
type SchoolYear = { id: number; name: string; startDate: number; endDate: number };
function normalizeServer(server: string) { return `https://${normalizeWebUntisServer(server)}`; }
class WebUntisClient {
  private sessionId?: string; private requestId = 0;
  constructor(private input: LoginInput) {}
  private async rpc<T>(method: string, params: unknown = {}) { const url = new URL("/WebUntis/jsonrpc.do", normalizeServer(this.input.server)); url.searchParams.set("school", this.input.school); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000); try { const response = await fetch(url, { method: "POST", redirect: "manual", signal: controller.signal, cache: "no-store", headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest", ...(this.sessionId ? { cookie: `JSESSIONID=${this.sessionId}` } : {}) }, body: JSON.stringify({ id: String(++this.requestId), method, params, jsonrpc: "2.0" }) }); const setCookie = response.headers.get("set-cookie"); const cookie = setCookie?.match(/(?:^|[,;]\s*)JSESSIONID=([^;,\s]+)/i)?.[1]; if (cookie) this.sessionId = cookie; if (!response.ok) throw new Error(`WebUntis antwortet mit HTTP ${response.status}.`); const body = await response.json() as RpcResponse<T>; if (body.error) throw new Error(body.error.message || "WebUntis-Aufruf fehlgeschlagen."); if (body.result === undefined) throw new Error("WebUntis lieferte keine Daten."); return body.result; } finally { clearTimeout(timeout); } }
  async authenticate(): Promise<AuthResult> { const result = await this.rpc<AuthResult>("authenticate", { user: this.input.username, password: this.input.password, client: process.env.WEBUNTIS_CLIENT || "Untiplan" }); this.sessionId = result.sessionId || this.sessionId; return result; }
  timetable(personId: number, personType: number, startDate: number, endDate: number, onlyBaseTimetable = false) { return this.rpc<Lesson[]>("getTimetable", { options: { element: { id: personId, type: personType }, startDate, endDate, onlyBaseTimetable, showInfo: true, showSubstText: true, showLsText: true, showLsNumber: true, showStudentgroup: true, showBooking: true, teacherFields: ["id","name","longname","externalkey"], roomFields: ["id","name","longname","externalkey"], subjectFields: ["id","name","longname","externalkey"], klasseFields: ["id","name","longname","externalkey"] } }); }
  klassen(schoolyearId?: number) { return this.rpc<MasterDataElement[]>("getKlassen", schoolyearId ? { schoolyearId } : {}); }
  teachers() { return this.rpc<MasterDataElement[]>("getTeachers"); }
  subjects() { return this.rpc<MasterDataElement[]>("getSubjects"); }
  rooms() { return this.rpc<MasterDataElement[]>("getRooms"); }
  students() { return this.rpc<MasterDataElement[]>("getStudents"); }
  timeGrid() { return this.rpc<TimeGrid[]>("getTimegridUnits"); }
  holidays() { return this.rpc<Holiday[]>("getHolidays"); }
  schoolYears() { return this.rpc<SchoolYear[]>("getSchoolyears"); }
  latestImportTime() { return this.rpc<number>("getLatestImportTime"); }
  async logout() { try { await this.rpc("logout"); } catch {} }
}
export async function verifyLogin(input: LoginInput) { const client = new WebUntisClient(input); try { return await client.authenticate(); } finally { await client.logout(); } }
export async function fetchTimetable(input: LoginInput, person: { personId: number; personType: number }, startDate: number, endDate: number) { const client = new WebUntisClient(input); await client.authenticate(); try { const schoolYears=await client.schoolYears().catch(() => []); const schoolYear=schoolYears.find(value=>value.startDate<=endDate&&value.endDate>=startDate); const shouldLoadSchoolData=!schoolYears.length||Boolean(schoolYear); const [lessons,timeGrid,holidays,latestImportTime]=await Promise.all([shouldLoadSchoolData?client.timetable(person.personId,person.personType,startDate,endDate):Promise.resolve([]),shouldLoadSchoolData?client.timeGrid():Promise.resolve([]),shouldLoadSchoolData?client.holidays():Promise.resolve([]),client.latestImportTime()]); const displaySchoolYear=schoolYear||schoolYearForDate(schoolYears,startDate); return {lessons,timeGrid,holidays,...(displaySchoolYear?{schoolYear:displaySchoolYear.name}:{}),latestImportTime}; } finally { await client.logout(); } }

const masterDataRequests: Array<{ type: TimetableElementType; load: (client: WebUntisClient, schoolyearId?: number) => Promise<MasterDataElement[]> }> = [
  { type: 1, load: (client, schoolyearId) => client.klassen(schoolyearId) },
  { type: 2, load: client => client.teachers() },
  { type: 3, load: client => client.subjects() },
  { type: 4, load: client => client.rooms() },
  { type: 5, load: client => client.students() },
];

function schoolYearForDate(schoolYears: SchoolYear[], date: number) {
  const valid = schoolYears.filter(schoolYear => Number.isInteger(schoolYear.id) && schoolYear.startDate > 0 && schoolYear.endDate >= schoolYear.startDate);
  return valid.find(schoolYear => schoolYear.startDate <= date && schoolYear.endDate >= date)
    || valid.filter(schoolYear => schoolYear.startDate > date).sort((a,b) => a.startDate - b.startDate)[0]
    || valid.sort((a,b) => b.endDate - a.endDate)[0];
}

function todayUntisDate() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function timetableElement(type: TimetableElementType, value: MasterDataElement): TimetableElement | null {
  if (!Number.isInteger(value.id) || value.id <= 0) return null;
  const name = value.name?.trim() || value.longName?.trim() || value.longname?.trim() || String(value.id);
  const personName = [value.foreName?.trim(), value.longName?.trim() || value.longname?.trim()].filter(Boolean).join(" ");
  const longname = personName || value.longName?.trim() || value.longname?.trim();
  return { id: value.id, type, name, ...(longname && longname !== name ? { longname } : {}) };
}

export async function fetchTimetableElements(input: LoginInput, person: { personId: number; personType: number; klasseId?: number }, targetDate = todayUntisDate()) {
  const client = new WebUntisClient(input);
  const authenticatedPerson = await client.authenticate();
  try {
    const schoolYears = await client.schoolYears().catch(() => []);
    const schoolYear = schoolYearForDate(schoolYears, targetDate);
    const results = await Promise.allSettled(masterDataRequests.map(request => request.load(client, schoolYear?.id)));
    const elements = results.flatMap((result, index) => result.status === "fulfilled"
      ? result.value.flatMap(value => timetableElement(masterDataRequests[index].type, value) || [])
      : []);
    // Authentication is authoritative here. Stored sessions created by an older
    // app version may not contain the person's current timetable assignment.
    const own = defaultTimetableElement({
      personId: authenticatedPerson.personId ?? person.personId,
      personType: authenticatedPerson.personType ?? person.personType,
      klasseId: authenticatedPerson.klasseId ?? person.klasseId,
    });
    if (own && !elements.some(element => element.id === own.id && element.type === own.type)) elements.unshift({ ...own, name: "Eigener Stundenplan" });
    const unique = [...new Map(elements.map(element => [`${element.type}:${element.id}`, element])).values()]
      .sort((a,b) => a.type - b.type || (a.longname || a.name).localeCompare(b.longname || b.name, "de"));
    const defaultElement: TimetableElementSelection | null = own || (unique[0] ? { id: unique[0].id, type: unique[0].type } : null);
    return { elements: unique, defaultElement };
  } finally {
    await client.logout();
  }
}
