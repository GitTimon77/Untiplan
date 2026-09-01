import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUntisMessageDetail, normalizeUntisMessages } from "../src/lib/untis-messages";
import { fetchUntisMessageDetail, fetchUntisMessages, UntisMessagesForbiddenError } from "../src/lib/webuntis";

const input = { server: "tenant.webuntis.com", school: "school", username: "user", password: "password" };

test("normalizes the modern WebUntis inbox separately from messages of the day", () => {
  assert.deepEqual(normalizeUntisMessages({ incomingMessages: [{ id: 42, subject: "<b>Schulinfo</b>", contentPreview: "Hallo&nbsp;zusammen", sender: { displayName: "Sekretariat" }, sentDateTime: "2026-09-01T08:30:00", hasAttachments: true, isMessageRead: false }], readConfirmationMessages: [] }), [{ id: 42, subject: "Schulinfo", contentPreview: "Hallo zusammen", senderName: "Sekretariat", sentDateTime: "2026-09-01T08:30:00", isRead: false, hasAttachments: true }]);
});

test("normalizes a message detail as safe plain text", () => {
  const fallback = normalizeUntisMessages({ incomingMessages: [{ id: 42, subject: "Info", sender: { displayName: "MOR" }, isMessageRead: true }] })[0];
  assert.deepEqual(normalizeUntisMessageDetail({ id: 42, subject: "Info", content: "<p>Erste Zeile</p><script>bad()</script><p>Zweite Zeile</p>", sender: { displayName: "MOR" }, sentDateTime: "2026-09-01T08:30:00", attachments: [{ id: "one" }], storageAttachments: [{ id: "two" }] }, fallback), { ...fallback, contentPreview: "Erste Zeile\nZweite Zeile", sentDateTime: "2026-09-01T08:30:00", hasAttachments: true, content: "Erste Zeile\nZweite Zeile", attachmentCount: 2 });
});

test("loads the inbox with a REST token and always logs out", async () => {
  const originalFetch = global.fetch;
  const calls: string[] = [];
  global.fetch = async (request, init) => {
    const url = String(request);
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      calls.push(body.method);
      if (body.method === "authenticate") return Response.json({ result: { sessionId: "session", personId: 1, personType: 5 } }, { headers: { "set-cookie": "JSESSIONID=session; Path=/" } });
      return Response.json({ result: true });
    }
    if (url.endsWith("/api/token/new")) { calls.push("token"); return new Response("header.payload.signature"); }
    assert.match(url, /api\/rest\/view\/v1\/messages\?pageSize=100&start=0$/);
    calls.push("inbox");
    assert.match(String(new Headers(init?.headers).get("authorization")), /^Bearer header\.payload\.signature$/);
    return Response.json({ incomingMessages: [{ id: 7, subject: "Test", contentPreview: "Text", sender: { displayName: "Admin" }, sentDateTime: "2026-09-01T09:00:00", isMessageRead: false, hasAttachments: false }] });
  };
  try {
    const result = await fetchUntisMessages(input);
    assert.deepEqual(calls, ["authenticate", "token", "inbox", "logout"]);
    assert.equal(result.messages[0].subject, "Test");
    assert.match(result.sourceUrl, /#\/basic\/messages$/);
  } finally { global.fetch = originalFetch; }
});

test("loads a full message without changing its read state", async () => {
  const originalFetch = global.fetch;
  const calls: string[] = [];
  global.fetch = async (request, init) => {
    const url = String(request);
    if (init?.method === "POST") {
      const method = JSON.parse(String(init.body)).method;
      calls.push(method);
      if (method === "authenticate") return Response.json({ result: { sessionId: "session", personId: 1, personType: 5 } }, { headers: { "set-cookie": "JSESSIONID=session; Path=/" } });
      return Response.json({ result: true });
    }
    if (url.endsWith("/api/token/new")) { calls.push("token"); return new Response("header.payload.signature"); }
    assert.match(url, /api\/rest\/view\/v1\/messages\/7$/);
    calls.push("detail");
    return Response.json({ id: 7, subject: "Test", content: "Volltext", sender: { displayName: "Admin" }, sentDateTime: "2026-09-01T09:00:00", attachments: [] });
  };
  try {
    const result = await fetchUntisMessageDetail(input, 7);
    assert.deepEqual(calls, ["authenticate", "token", "detail", "logout"]);
    assert.equal(result.message.content, "Volltext");
    assert.equal(result.message.isRead, false);
  } finally { global.fetch = originalFetch; }
});

test("turns a forbidden inbox into a clear account permission error", async () => {
  const originalFetch = global.fetch;
  const calls: string[] = [];
  global.fetch = async (request, init) => {
    const url = String(request);
    if (init?.method === "POST") {
      const method = JSON.parse(String(init.body)).method;
      calls.push(method);
      if (method === "authenticate") return Response.json({ result: { sessionId: "session", personId: 1, personType: 13 } }, { headers: { "set-cookie": "JSESSIONID=session; Path=/" } });
      return Response.json({ result: true });
    }
    if (url.endsWith("/api/token/new")) { calls.push("token"); return new Response("header.payload.signature"); }
    calls.push("inbox");
    return Response.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  };
  try {
    await assert.rejects(
      fetchUntisMessages(input),
      error => error instanceof UntisMessagesForbiddenError && error.message === "Mitteilungen sind für dieses Konto nicht freigegeben.",
    );
    assert.deepEqual(calls, ["authenticate", "token", "inbox", "logout"]);
  } finally { global.fetch = originalFetch; }
});
