import test from "node:test";
import assert from "node:assert/strict";
import { applyHomeworkCourseFilter, normalizeHomeworks } from "../src/lib/homeworks";
import { fetchHomeworks, UntisHomeworksForbiddenError } from "../src/lib/webuntis";

const input = { server: "tenant.webuntis.com", school: "Test Schule", username: "user", password: "password" };

test("normalizes WebUntis homework and enriches it with lesson data", () => {
  const result = normalizeHomeworks({ data: {
    homeworks: [{ id: 7, lessonId: 44, date: 20260910, dueDate: 20260914, text: "<b>Seite 12</b>&nbsp;lesen", completed: false, attachments: [{ id: 1 }] }],
    lessons: [{ id: 44, subject: { longName: "Deutsch" }, teachers: [{ displayName: "Frau Beispiel" }] }],
  } });
  assert.deepEqual(result, [{ id: 7, lessonId: 44, assignedDate: 20260910, dueDate: 20260914, text: "Seite 12 lesen", subject: "Deutsch", teacher: "Frau Beispiel", completed: false, attachmentCount: 1 }]);
});

test("sorts open homework before completed homework and rejects incomplete records", () => {
  const result = normalizeHomeworks({ homeworks: [
    { id: 3, date: 20260901, dueDate: 20260920, text: "Erledigt", completed: true },
    { id: 2, date: 20260901, dueDate: 20260914, text: "Offen", subject: "Mathe" },
    { id: 1, date: 20260901, dueDate: 0, text: "Ungültig" },
  ] });
  assert.deepEqual(result.map(homework => homework.id), [2, 3]);
  assert.equal(result[0].subject, "Mathe");
  assert.equal(result[0].teacher, "");
});

test("loads homework through the authenticated WebUntis session and logs out", async () => {
  const originalFetch = global.fetch;
  const calls: string[] = [];
  global.fetch = async (request, init) => {
    const url = String(request);
    if (init?.method === "POST") {
      const method = JSON.parse(String(init.body)).method as string;
      calls.push(method);
      return Response.json({ result: method === "authenticate" ? { sessionId: "session", personId: 1, personType: 5 } : true }, { headers: { "set-cookie": "JSESSIONID=session; Path=/" } });
    }
    calls.push("homeworks");
    assert.match(url, /api\/homeworks\/lessons\?startDate=20260901&endDate=20261001$/);
    const cookie = new Headers(init?.headers).get("cookie") || "";
    assert.match(cookie, /JSESSIONID=session/);
    assert.match(cookie, /schoolname=_VGVzdCBTY2h1bGU%3D/);
    return Response.json({ data: { homeworks: [{ id: 9, date: 20260901, dueDate: 20260912, text: "Test", completed: false }] } });
  };
  try {
    const result = await fetchHomeworks(input, 20260901, 20261001);
    assert.deepEqual(calls, ["authenticate", "homeworks", "logout"]);
    assert.equal(result.homeworks[0].text, "Test");
    assert.deepEqual(result.range, { startDate: 20260901, endDate: 20261001 });
  } finally { global.fetch = originalFetch; }
});

test("turns denied homework access into a clear permission error", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_request, init) => {
    if (init?.method === "POST") {
      const method = JSON.parse(String(init.body)).method as string;
      return Response.json({ result: method === "authenticate" ? { sessionId: "session", personId: 1, personType: 13 } : true }, { headers: { "set-cookie": "JSESSIONID=session; Path=/" } });
    }
    return Response.json({ error: "forbidden" }, { status: 403 });
  };
  try {
    await assert.rejects(fetchHomeworks(input, 20260901, 20261001), error => error instanceof UntisHomeworksForbiddenError);
  } finally { global.fetch = originalFetch; }
});

test("keeps only homework from the selected courses when the course filter is active", () => {
  const homeworks = normalizeHomeworks({ data: {
    homeworks: [
      { id: 1, lessonId: 101, date: 20260910, dueDate: 20260914, text: "Mathematik" },
      { id: 2, lessonId: 102, date: 20260910, dueDate: 20260915, text: "Deutsch" },
    ],
    lessons: [
      { id: 101, subjects: [{ id: 10, longName: "Mathematik" }], teachers: [{ id: 20, name: "MAT" }] },
      { id: 102, subjects: [{ id: 11, longName: "Deutsch" }], teachers: [{ id: 30, orgid: 29, name: "DEU" }] },
    ],
  } });
  assert.deepEqual(homeworks.map(homework => homework.courseKeys), [["10-20"], ["11-29"]]);
  assert.deepEqual(applyHomeworkCourseFilter(homeworks, [], ["11-29"], true).map(homework => homework.id), [2]);
  assert.equal(applyHomeworkCourseFilter(homeworks, [], ["11-29"], false).length, 2);
});
