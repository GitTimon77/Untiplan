import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("adds, switches and removes accounts in one browser account group", async () => {
  const dataDirectory = await mkdtemp(path.join(tmpdir(), "untiplan-accounts-"));
  process.env.DATA_DIR = dataDirectory;
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";

  try {
    const { createSession, deleteSessionAndSelectNext, getSession, listAccounts, switchAccount } = await import("../src/lib/store");
    const first = await createSession(
      { server: "school.webuntis.com", school: "school", username: "first", password: "secret-one" },
      { personId: 1, personType: 5, displayName: "Erstes Konto" },
    );
    const second = await createSession(
      { server: "school.webuntis.com", school: "school", username: "second", password: "secret-two" },
      { personId: 2, personType: 5, displayName: "Zweites Konto" },
      first.sessionToken,
      first.accountGroupToken,
    );

    const accounts = await listAccounts(second.sessionToken, second.accountGroupToken);
    assert.equal(accounts?.accounts.length, 2);
    assert.equal(accounts?.accounts.find(account => account.active)?.username, "second");
    const firstFilterStorageId = (await getSession(first.sessionToken))?.filterStorageId;
    const secondFilterStorageId = (await getSession(second.sessionToken))?.filterStorageId;
    assert.ok(firstFilterStorageId);
    assert.ok(secondFilterStorageId);
    assert.notEqual(firstFilterStorageId, secondFilterStorageId);

    const firstAccountId = accounts?.accounts.find(account => account.username === "first")?.id;
    assert.ok(firstAccountId);
    const switched = await switchAccount(second.accountGroupToken, firstAccountId);
    const switchedSession = await getSession(switched?.sessionToken);
    assert.equal(switchedSession?.credentials.username, "first");
    assert.equal(switchedSession?.filterStorageId, firstFilterStorageId);

    const next = await deleteSessionAndSelectNext(switched?.sessionToken, second.accountGroupToken);
    assert.equal((await getSession(next?.sessionToken))?.credentials.username, "second");
    const remaining = await listAccounts(next?.sessionToken, second.accountGroupToken);
    assert.deepEqual(remaining?.accounts.map(account => account.username), ["second"]);
    assert.equal(await deleteSessionAndSelectNext(next?.sessionToken, second.accountGroupToken), null);
  } finally {
    await rm(dataDirectory, { recursive: true, force: true });
  }
});
