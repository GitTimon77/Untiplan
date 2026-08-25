import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type Credentials = { server: string; school: string; username: string; password: string };
type StoredSession = { credentials: string; personId: number; personType: number; displayName?: string; accountIdentity?: string; createdAt: number; expiresAt: number };
type StoredAccountGroup = { accounts: Record<string, string>; createdAt: number; expiresAt: number };
type Store = { sessions: Record<string, StoredSession>; accountGroups: Record<string, StoredAccountGroup> };
export type AccountSummary = { id: string; displayName: string; username: string; school: string; active: boolean };
const directory = process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = path.join(directory, "store.json");
let queue = Promise.resolve();
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error("SESSION_SECRET muss mindestens 32 Zeichen lang sein."); return createHash("sha256").update(value).digest(); }
function encrypt(value: Credentials) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", secret(), iv); const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]); return [iv, cipher.getAuthTag(), data].map(v => v.toString("base64url")).join("."); }
function decrypt(value: string): Credentials { const [iv, tag, data] = value.split(".").map(v => Buffer.from(v, "base64url")); const decipher = createDecipheriv("aes-256-gcm", secret(), iv); decipher.setAuthTag(tag); return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")); }
async function load(): Promise<Store> {
  await mkdir(directory, { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Partial<Store>;
    const sessions = Object.fromEntries(Object.entries(parsed.sessions || {}).map(([id, session]) => [id, {
      credentials: session.credentials,
      personId: session.personId,
      personType: session.personType,
      displayName: session.displayName,
      accountIdentity: session.accountIdentity,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }]));
    const accountGroups = Object.fromEntries(Object.entries(parsed.accountGroups || {}).map(([id, group]) => [id, {
      accounts: { ...group.accounts },
      createdAt: group.createdAt,
      expiresAt: group.expiresAt,
    }]));
    return { sessions, accountGroups };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { sessions: {}, accountGroups: {} };
    throw error;
  }
}
async function save(store: Store) { const temp = `${file}.${process.pid}.tmp`; await writeFile(temp, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 }); await rename(temp, file); }
function key(token: string) { return createHash("sha256").update(token).digest("hex"); }
async function mutate<T>(fn: (store: Store) => Promise<T> | T): Promise<T> { let release!: () => void; const previous = queue; queue = new Promise<void>(resolve => { release = resolve; }); await previous; try { const store = await load(); const result = await fn(store); await save(store); return result; } finally { release(); } }

function accountIdentity(credentials: Credentials) {
  return createHash("sha256").update([
    credentials.server.trim().toLocaleLowerCase("de"),
    credentials.school.trim().toLocaleLowerCase("de"),
    credentials.username.trim(),
  ].join("\n")).digest("hex");
}

function randomToken() { return randomBytes(32).toString("base64url"); }
function randomAccountId() { return randomBytes(16).toString("base64url"); }
function sessionIdentity(session: StoredSession) { return session.accountIdentity || accountIdentity(decrypt(session.credentials)); }

function prune(store: Store) {
  const now = Date.now();
  for (const [id, session] of Object.entries(store.sessions)) {
    if (session.expiresAt <= now) delete store.sessions[id];
  }
  for (const [id, group] of Object.entries(store.accountGroups)) {
    for (const [accountId, sessionId] of Object.entries(group.accounts)) {
      if (!store.sessions[sessionId]) delete group.accounts[accountId];
    }
    const remainingSessions = Object.values(group.accounts).map(sessionId => store.sessions[sessionId]).filter(Boolean);
    if (!remainingSessions.length) delete store.accountGroups[id];
    else group.expiresAt = Math.max(...remainingSessions.map(session => session.expiresAt));
  }
}

function addSessionToGroup(group: StoredAccountGroup, sessionId: string, store: Store) {
  const session = store.sessions[sessionId];
  if (!session || Object.values(group.accounts).includes(sessionId)) return;
  group.accounts[randomAccountId()] = sessionId;
}

function summaries(group: StoredAccountGroup, store: Store, activeSessionId: string): AccountSummary[] {
  return Object.entries(group.accounts).flatMap(([id, sessionId]) => {
    const session = store.sessions[sessionId];
    if (!session) return [];
    const credentials = decrypt(session.credentials);
    return [{
      id,
      displayName: session.displayName || credentials.username,
      username: credentials.username,
      school: credentials.school,
      active: sessionId === activeSessionId,
    }];
  });
}

export async function createSession(
  credentials: Credentials,
  person: { personId: number; personType: number; displayName?: string },
  currentSessionToken?: string,
  accountGroupToken?: string,
) {
  const sessionToken = randomToken();
  let nextAccountGroupToken = accountGroupToken || randomToken();
  await mutate(store => {
    prune(store);
    const now = Date.now();
    const expiresAt = now + Number(process.env.SESSION_TTL_DAYS || 14) * 86400000;
    let groupId = key(nextAccountGroupToken);
    let group = store.accountGroups[groupId];
    if (!group) {
      nextAccountGroupToken = randomToken();
      groupId = key(nextAccountGroupToken);
      group = { accounts: {}, createdAt: now, expiresAt };
      store.accountGroups[groupId] = group;
    }

    if (currentSessionToken) addSessionToGroup(group, key(currentSessionToken), store);

    const identity = accountIdentity(credentials);
    let accountId = Object.entries(group.accounts).find(([, sessionId]) => {
      const session = store.sessions[sessionId];
      return session && sessionIdentity(session) === identity;
    })?.[0];
    if (accountId) delete store.sessions[group.accounts[accountId]];
    else accountId = randomAccountId();

    const sessionId = key(sessionToken);
    store.sessions[sessionId] = {
      credentials: encrypt(credentials),
      personId: person.personId,
      personType: person.personType,
      displayName: person.displayName,
      accountIdentity: identity,
      createdAt: now,
      expiresAt,
    };
    group.accounts[accountId] = sessionId;
    group.expiresAt = Math.max(group.expiresAt, expiresAt);
  });
  return { sessionToken, accountGroupToken: nextAccountGroupToken };
}

export async function getSession(token?: string) { if (!token) return null; const store = await load(); const session = store.sessions[key(token)]; if (!session || session.expiresAt <= Date.now()) return null; return { ...session, credentials: decrypt(session.credentials) }; }

export async function listAccounts(sessionToken?: string, accountGroupToken?: string) {
  if (!sessionToken) return null;
  let nextAccountGroupToken = accountGroupToken || randomToken();
  return mutate(store => {
    prune(store);
    const activeSessionId = key(sessionToken);
    const activeSession = store.sessions[activeSessionId];
    if (!activeSession) return null;

    let groupId = key(nextAccountGroupToken);
    let group = store.accountGroups[groupId];
    if (!group) {
      nextAccountGroupToken = randomToken();
      groupId = key(nextAccountGroupToken);
      group = { accounts: {}, createdAt: Date.now(), expiresAt: activeSession.expiresAt };
      store.accountGroups[groupId] = group;
    }
    addSessionToGroup(group, activeSessionId, store);
    group.expiresAt = Math.max(group.expiresAt, activeSession.expiresAt);
    return {
      accountGroupToken: nextAccountGroupToken,
      accounts: summaries(group, store, activeSessionId),
    };
  });
}

export async function switchAccount(accountGroupToken: string | undefined, accountId: string) {
  if (!accountGroupToken) return null;
  const sessionToken = randomToken();
  return mutate(store => {
    prune(store);
    const group = store.accountGroups[key(accountGroupToken)];
    const previousSessionId = group?.accounts[accountId];
    const session = previousSessionId ? store.sessions[previousSessionId] : undefined;
    if (!group || !previousSessionId || !session) return null;
    const nextSessionId = key(sessionToken);
    store.sessions[nextSessionId] = session;
    delete store.sessions[previousSessionId];
    group.accounts[accountId] = nextSessionId;
    return { sessionToken };
  });
}

export async function deleteSessionAndSelectNext(sessionToken?: string, accountGroupToken?: string) {
  if (!sessionToken) return null;
  const nextSessionToken = randomToken();
  return mutate(store => {
    prune(store);
    const activeSessionId = key(sessionToken);
    delete store.sessions[activeSessionId];
    const groupId = accountGroupToken ? key(accountGroupToken) : undefined;
    const group = groupId ? store.accountGroups[groupId] : undefined;
    if (!group || !groupId) return null;

    for (const [accountId, sessionId] of Object.entries(group.accounts)) {
      if (sessionId === activeSessionId) delete group.accounts[accountId];
    }
    const nextAccount = Object.entries(group.accounts).find(([, sessionId]) => Boolean(store.sessions[sessionId]));
    if (!nextAccount) {
      delete store.accountGroups[groupId];
      return null;
    }

    const [nextAccountId, previousSessionId] = nextAccount;
    const nextSessionId = key(nextSessionToken);
    store.sessions[nextSessionId] = store.sessions[previousSessionId];
    delete store.sessions[previousSessionId];
    group.accounts[nextAccountId] = nextSessionId;
    return { sessionToken: nextSessionToken };
  });
}
