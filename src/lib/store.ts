import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type Credentials = { server: string; school: string; username: string; password: string };
type StoredSession = { credentials: string; personId: number; personType: number; displayName?: string; createdAt: number; expiresAt: number };
type Store = { sessions: Record<string, StoredSession> };
const directory = process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = path.join(directory, "store.json");
let queue = Promise.resolve();
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error("SESSION_SECRET muss mindestens 32 Zeichen lang sein."); return createHash("sha256").update(value).digest(); }
function encrypt(value: Credentials) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", secret(), iv); const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]); return [iv, cipher.getAuthTag(), data].map(v => v.toString("base64url")).join("."); }
function decrypt(value: string): Credentials { const [iv, tag, data] = value.split(".").map(v => Buffer.from(v, "base64url")); const decipher = createDecipheriv("aes-256-gcm", secret(), iv); decipher.setAuthTag(tag); return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")); }
async function load(): Promise<Store> { await mkdir(directory, { recursive: true }); try { const parsed = JSON.parse(await readFile(file, "utf8")) as { sessions?: Record<string, StoredSession> }; const sessions = Object.fromEntries(Object.entries(parsed.sessions || {}).map(([id, session]) => [id, { credentials: session.credentials, personId: session.personId, personType: session.personType, displayName: session.displayName, createdAt: session.createdAt, expiresAt: session.expiresAt }])); return { sessions }; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { sessions: {} }; throw error; } }
async function save(store: Store) { const temp = `${file}.${process.pid}.tmp`; await writeFile(temp, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 }); await rename(temp, file); }
function key(token: string) { return createHash("sha256").update(token).digest("hex"); }
async function mutate<T>(fn: (store: Store) => Promise<T> | T): Promise<T> { let release!: () => void; const previous = queue; queue = new Promise<void>(resolve => { release = resolve; }); await previous; try { const store = await load(); const result = await fn(store); await save(store); return result; } finally { release(); } }
export async function createSession(credentials: Credentials, person: { personId: number; personType: number; displayName?: string }) { const token = randomBytes(32).toString("base64url"); const days = Number(process.env.SESSION_TTL_DAYS || 14); await mutate(store => { const now = Date.now(); for (const [id, session] of Object.entries(store.sessions)) if (session.expiresAt <= now) delete store.sessions[id]; store.sessions[key(token)] = { credentials: encrypt(credentials), personId: person.personId, personType: person.personType, displayName: person.displayName, createdAt: now, expiresAt: now + days * 86400000 }; }); return token; }
export async function getSession(token?: string) { if (!token) return null; const store = await load(); const session = store.sessions[key(token)]; if (!session || session.expiresAt <= Date.now()) return null; return { ...session, credentials: decrypt(session.credentials) }; }
export async function deleteSession(token?: string) { if (!token) return; await mutate(store => { delete store.sessions[key(token)]; }); }
