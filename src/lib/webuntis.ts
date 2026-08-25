import "server-only";
import type { Holiday, Lesson, TimeGrid, TimetableElement, TimetableElementSelection, TimetableElementType } from "./types";
import { normalizeWebUntisServer } from "./schools";
import { defaultTimetableElement } from "./timetable-elements";
export type LoginInput = { server: string; school: string; username: string; password: string };
type AuthResult = { sessionId: string; personId: number; personType: number; klasseId?: number; displayName?: string };
type RpcResponse<T> = { result?: T; error?: { code: number; message: string; data?: unknown } };
type MasterDataElement = { id: number; name?: string; longName?: string; longname?: string; foreName?: string };
function normalizeServer(server: string) { return `https://${normalizeWebUntisServer(server)}`; }
class WebUntisClient {
  private sessionId?: string; private requestId = 0;
  constructor(private input: LoginInput) {}
  private async rpc<T>(method: string, params: unknown = {}) { const url = new URL("/WebUntis/jsonrpc.do", normalizeServer(this.input.server)); url.searchParams.set("school", this.input.school); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000); try { const response = await fetch(url, { method: "POST", redirect: "manual", signal: controller.signal, cache: "no-store", headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest", ...(this.sessionId ? { cookie: `JSESSIONID=${this.sessionId}` } : {}) }, body: JSON.stringify({ id: String(++this.requestId), method, params, jsonrpc: "2.0" }) }); const setCookie = response.headers.get("set-cookie"); const cookie = setCookie?.match(/(?:^|[,;]\s*)JSESSIONID=([^;,\s]+)/i)?.[1]; if (cookie) this.sessionId = cookie; if (!response.ok) throw new Error(`WebUntis antwortet mit HTTP ${response.status}.`); const body = await response.json() as RpcResponse<T>; if (body.error) throw new Error(body.error.message || "WebUntis-Aufruf fehlgeschlagen."); if (body.result === undefined) throw new Error("WebUntis lieferte keine Daten."); return body.result; } finally { clearTimeout(timeout); } }
  async authenticate(): Promise<AuthResult> { const result = await this.rpc<AuthResult>("authenticate", { user: this.input.username, password: this.input.password, client: process.env.WEBUNTIS_CLIENT || "Untiplan" }); this.sessionId = result.sessionId || this.sessionId; return result; }
  timetable(personId: number, personType: number, startDate: number, endDate: number, onlyBaseTimetable = false) { return this.rpc<Lesson[]>("getTimetable", { options: { element: { id: personId, type: personType }, startDate, endDate, onlyBaseTimetable, showInfo: true, showSubstText: true, showLsText: true, showLsNumber: true, showStudentgroup: true, showBooking: true, teacherFields: ["id","name","longname","externalkey"], roomFields: ["id","name","longname","externalkey"], subjectFields: ["id","name","longname","externalkey"], klasseFields: ["id","name","longname","externalkey"] } }); }
  klassen() { return this.rpc<MasterDataElement[]>("getKlassen"); }
  teachers() { return this.rpc<MasterDataElement[]>("getTeachers"); }
  subjects() { return this.rpc<MasterDataElement[]>("getSubjects"); }
  rooms() { return this.rpc<MasterDataElement[]>("getRooms"); }
  students() { return this.rpc<MasterDataElement[]>("getStudents"); }
  timeGrid() { return this.rpc<TimeGrid[]>("getTimegridUnits"); }
  holidays() { return this.rpc<Holiday[]>("getHolidays"); }
  schoolYear() { return this.rpc<{ name: string }>("getCurrentSchoolyear"); }
  latestImportTime() { return this.rpc<number>("getLatestImportTime"); }
  async logout() { try { await this.rpc("logout"); } catch {} }
}
export async function verifyLogin(input: LoginInput) { const client = new WebUntisClient(input); try { return await client.authenticate(); } finally { await client.logout(); } }
export async function fetchTimetable(input: LoginInput, person: { personId: number; personType: number }, startDate: number, endDate: number) { const client = new WebUntisClient(input); await client.authenticate(); try { const [lessons, timeGrid, holidays, schoolYear, latestImportTime] = await Promise.all([client.timetable(person.personId, person.personType, startDate, endDate), client.timeGrid(), client.holidays(), client.schoolYear(), client.latestImportTime()]); return { lessons, timeGrid, holidays, schoolYear: schoolYear.name, latestImportTime }; } finally { await client.logout(); } }

const masterDataRequests: Array<{ type: TimetableElementType; load: (client: WebUntisClient) => Promise<MasterDataElement[]> }> = [
  { type: 1, load: client => client.klassen() },
  { type: 2, load: client => client.teachers() },
  { type: 3, load: client => client.subjects() },
  { type: 4, load: client => client.rooms() },
  { type: 5, load: client => client.students() },
];

function timetableElement(type: TimetableElementType, value: MasterDataElement): TimetableElement | null {
  if (!Number.isInteger(value.id) || value.id <= 0) return null;
  const name = value.name?.trim() || value.longName?.trim() || value.longname?.trim() || String(value.id);
  const personName = [value.foreName?.trim(), value.longName?.trim() || value.longname?.trim()].filter(Boolean).join(" ");
  const longname = personName || value.longName?.trim() || value.longname?.trim();
  return { id: value.id, type, name, ...(longname && longname !== name ? { longname } : {}) };
}

export async function fetchTimetableElements(input: LoginInput, person: { personId: number; personType: number; klasseId?: number }) {
  const client = new WebUntisClient(input);
  const authenticatedPerson = await client.authenticate();
  try {
    const results = await Promise.allSettled(masterDataRequests.map(request => request.load(client)));
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
