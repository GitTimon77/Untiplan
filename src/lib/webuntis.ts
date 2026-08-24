import "server-only";
import type { Holiday, Lesson, TimeGrid } from "./types";
export type LoginInput = { server: string; school: string; username: string; password: string };
type AuthResult = { sessionId: string; personId: number; personType: number; klasseId?: number; displayName?: string };
type RpcResponse<T> = { result?: T; error?: { code: number; message: string; data?: unknown } };
function normalizeServer(server: string) { const raw = server.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, ""); if (!/^[a-z0-9.-]+(?::\d+)?$/i.test(raw) || raw.includes("..")) throw new Error("Ungültiger WebUntis-Server."); return `https://${raw}`; }
class WebUntisClient {
  private sessionId?: string; private requestId = 0;
  constructor(private input: LoginInput) {}
  private async rpc<T>(method: string, params: unknown = {}) { const url = new URL("/WebUntis/jsonrpc.do", normalizeServer(this.input.server)); url.searchParams.set("school", this.input.school); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000); try { const response = await fetch(url, { method: "POST", redirect: "manual", signal: controller.signal, cache: "no-store", headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest", ...(this.sessionId ? { cookie: `JSESSIONID=${this.sessionId}` } : {}) }, body: JSON.stringify({ id: String(++this.requestId), method, params, jsonrpc: "2.0" }) }); const setCookie = response.headers.get("set-cookie"); const cookie = setCookie?.match(/(?:^|[,;]\s*)JSESSIONID=([^;,\s]+)/i)?.[1]; if (cookie) this.sessionId = cookie; if (!response.ok) throw new Error(`WebUntis antwortet mit HTTP ${response.status}.`); const body = await response.json() as RpcResponse<T>; if (body.error) throw new Error(body.error.message || "WebUntis-Aufruf fehlgeschlagen."); if (body.result === undefined) throw new Error("WebUntis lieferte keine Daten."); return body.result; } finally { clearTimeout(timeout); } }
  async authenticate(): Promise<AuthResult> { const result = await this.rpc<AuthResult>("authenticate", { user: this.input.username, password: this.input.password, client: process.env.WEBUNTIS_CLIENT || "BetterWebUntisWeb" }); this.sessionId = result.sessionId || this.sessionId; return result; }
  timetable(personId: number, personType: number, startDate: number, endDate: number, onlyBaseTimetable = false) { return this.rpc<Lesson[]>("getTimetable", { options: { element: { id: personId, type: personType }, startDate, endDate, onlyBaseTimetable, showInfo: true, showSubstText: true, showLsText: true, showLsNumber: true, showStudentgroup: true, showBooking: true, teacherFields: ["id","name","longname","externalkey"], roomFields: ["id","name","longname","externalkey"], subjectFields: ["id","name","longname","externalkey"], klasseFields: ["id","name","longname","externalkey"] } }); }
  timeGrid() { return this.rpc<TimeGrid[]>("getTimegridUnits"); }
  holidays() { return this.rpc<Holiday[]>("getHolidays"); }
  schoolYear() { return this.rpc<{ name: string }>("getCurrentSchoolyear"); }
  latestImportTime() { return this.rpc<number>("getLatestImportTime"); }
  async logout() { try { await this.rpc("logout"); } catch {} }
}
export async function verifyLogin(input: LoginInput) { const client = new WebUntisClient(input); try { return await client.authenticate(); } finally { await client.logout(); } }
export async function fetchTimetable(input: LoginInput, person: { personId: number; personType: number }, startDate: number, endDate: number) { const client = new WebUntisClient(input); await client.authenticate(); try { const [lessons, timeGrid, holidays, schoolYear, latestImportTime] = await Promise.all([client.timetable(person.personId, person.personType, startDate, endDate), client.timeGrid(), client.holidays(), client.schoolYear(), client.latestImportTime()]); return { lessons, timeGrid, holidays, schoolYear: schoolYear.name, latestImportTime }; } finally { await client.logout(); } }
