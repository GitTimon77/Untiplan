import test from "node:test";
import assert from "node:assert/strict";
import { messagePlainText, normalizeMessagesOfDay } from "../src/lib/messages-of-day";
import { fetchMessagesOfDay } from "../src/lib/webuntis";

test("normalizes message markup as safe readable plain text", () => {
  assert.equal(
    messagePlainText('<p>Hallo&nbsp;<strong>Klasse</strong></p><script>alert("x")</script><div>Zweite Zeile &amp; mehr</div>'),
    "Hallo Klasse\nZweite Zeile & mehr",
  );
  assert.deepEqual(normalizeMessagesOfDay({
    data: {
      messagesOfDay: [
        { id: 7, subject: "<b>Wichtig</b>", text: "Zeile 1<br>Zeile 2", isExpanded: true, attachments: [{ id: 1 }] },
        { id: 8, subject: "", text: "Mitteilung ohne Betreff", attachments: [] },
        { id: 9, subject: "", text: "", attachments: [] },
      ],
    },
  }), [
    { id: 7, subject: "Wichtig", text: "Zeile 1\nZeile 2", isExpanded: true, attachmentCount: 1 },
    { id: 8, subject: "Mitteilung", text: "Mitteilung ohne Betreff", isExpanded: false, attachmentCount: 0 },
  ]);
});

test("loads messages with the authenticated WebUntis session and always logs out", async () => {
  const originalFetch = global.fetch;
  const calls: string[] = [];
  global.fetch = async (input, init) => {
    if (init?.method === "GET") {
      calls.push("news");
      assert.match(String(input), /newsWidgetData\?date=20260901$/);
      assert.equal(new Headers(init.headers).get("cookie"), "JSESSIONID=test-session");
      return Response.json({ data: { messagesOfDay: [{ id: 11, subject: "Test", text: "Text", isExpanded: false, attachments: [] }] } });
    }
    const request = JSON.parse(String(init?.body));
    calls.push(request.method);
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: request.method === "authenticate"
        ? { sessionId: "test-session", personId: 1, personType: 5 }
        : true,
    }), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=test-session; Path=/WebUntis" } });
  };

  try {
    const result = await fetchMessagesOfDay(
      { server: "tenant.webuntis.com", school: "test school", username: "user", password: "password" },
      20260901,
    );
    assert.deepEqual(calls, ["authenticate", "news", "logout"]);
    assert.deepEqual(result.messages, [{ id: 11, subject: "Test", text: "Text", isExpanded: false, attachmentCount: 0 }]);
    assert.equal(result.sourceUrl, "https://tenant.webuntis.com/WebUntis/?school=test%20school#/basic/main");
  } finally {
    global.fetch = originalFetch;
  }
});

test("logs out when the optional news endpoint fails", async () => {
  const originalFetch = global.fetch;
  const calls: string[] = [];
  global.fetch = async (_input, init) => {
    if (init?.method === "GET") { calls.push("news"); return new Response("", { status: 503 }); }
    const request = JSON.parse(String(init?.body));
    calls.push(request.method);
    return Response.json({ result: request.method === "authenticate" ? { sessionId: "test-session", personId: 1, personType: 5 } : true });
  };
  try {
    await assert.rejects(
      fetchMessagesOfDay({ server: "tenant.webuntis.com", school: "school", username: "user", password: "password" }, 20260901),
      /HTTP 503/,
    );
    assert.deepEqual(calls, ["authenticate", "news", "logout"]);
  } finally {
    global.fetch = originalFetch;
  }
});
