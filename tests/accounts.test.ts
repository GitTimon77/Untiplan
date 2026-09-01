import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("manages account groups and rejects expired or tampered sessions", async () => {
  const dataDirectory = await mkdtemp(path.join(tmpdir(), "untiplan-accounts-"));
  process.env.DATA_DIR = dataDirectory;
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";

  try {
    const { createSession, deleteSessionAndSelectNext, getSession, listAccounts, switchAccount } = await import("../src/lib/store");
    const first = await createSession(
      { server: "tenant.webuntis.com", school: "test-school", username: "test-one", password: "test-password-one" },
      { personId: 1, personType: 5, displayName: "Konto 1" },
    );
    const second = await createSession(
      { server: "tenant.webuntis.com", school: "test-school", username: "test-two", password: "test-password-two" },
      { personId: 2, personType: 5, displayName: "Konto 2" },
      first.sessionToken,
      first.accountGroupToken,
    );

    const accounts = await listAccounts(second.sessionToken, second.accountGroupToken);
    assert.equal(accounts?.accounts.length, 2);
    assert.equal(accounts?.accounts.find(account => account.active)?.username, "test-two");
    const firstFilterStorageId = (await getSession(first.sessionToken))?.filterStorageId;
    const secondFilterStorageId = (await getSession(second.sessionToken))?.filterStorageId;
    assert.ok(firstFilterStorageId);
    assert.ok(secondFilterStorageId);
    assert.notEqual(firstFilterStorageId, secondFilterStorageId);

    const firstAccountId = accounts?.accounts.find(account => account.username === "test-one")?.id;
    assert.ok(firstAccountId);
    const switched = await switchAccount(second.accountGroupToken, firstAccountId);
    const switchedSession = await getSession(switched?.sessionToken);
    assert.equal(switchedSession?.credentials.username, "test-one");
    assert.equal(switchedSession?.filterStorageId, firstFilterStorageId);

    const next = await deleteSessionAndSelectNext(switched?.sessionToken, second.accountGroupToken);
    assert.equal((await getSession(next?.sessionToken))?.credentials.username, "test-two");
    const remaining = await listAccounts(next?.sessionToken, second.accountGroupToken);
    assert.deepEqual(remaining?.accounts.map(account => account.username), ["test-two"]);
    assert.equal(await deleteSessionAndSelectNext(next?.sessionToken, second.accountGroupToken), null);

    const expired = await createSession(
      { server: "tenant.webuntis.com", school: "test-school", username: "expired", password: "test-password" },
      { personId: 3, personType: 5, displayName: "Abgelaufen" },
    );
    const storeFile = path.join(dataDirectory, "store.json");
    const expiredStore = JSON.parse(await readFile(storeFile, "utf8")) as { sessions: Record<string, { expiresAt: number }> };
    const expiredSession = Object.values(expiredStore.sessions)[0];
    assert.ok(expiredSession);
    expiredSession.expiresAt = Date.now() - 1;
    await writeFile(storeFile, JSON.stringify(expiredStore));
    assert.equal(await getSession(expired.sessionToken), null);

    const tampered = await createSession(
      { server: "tenant.webuntis.com", school: "test-school", username: "tampered", password: "test-password" },
      { personId: 4, personType: 5, displayName: "Manipuliert" },
    );
    const tamperedStore = JSON.parse(await readFile(storeFile, "utf8")) as { sessions: Record<string, { credentials: string }> };
    const tamperedSession = Object.values(tamperedStore.sessions)[0];
    assert.ok(tamperedSession);
    tamperedSession.credentials = `${tamperedSession.credentials[0] === "A" ? "B" : "A"}${tamperedSession.credentials.slice(1)}`;
    await writeFile(storeFile, JSON.stringify(tamperedStore));
    await assert.rejects(getSession(tampered.sessionToken));
  } finally {
    await rm(dataDirectory, { recursive: true, force: true });
  }
});
