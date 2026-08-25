import test from "node:test";
import assert from "node:assert/strict";
import { fetchTimetable, fetchTimetableElements } from "../src/lib/webuntis";

test("discovers only master-data lists allowed by WebUntis", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "authenticate"
      ? { sessionId: "test-session", personId: -1, personType: 13, klasseId: 0 }
      : request.method === "getKlassen"
        ? [{ id: 1781, name: "8E", longName: "Klasse 8E" }]
        : request.method === "getRooms"
          ? [{ id: 191, name: "A-38", longName: "Biologieraum" }]
          : request.method === "getSubjects"
            ? [{ id: 106, name: "BI", longName: "Biologie" }]
            : request.method === "logout"
              ? true
              : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "no rights" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetableElements(
      { server: "school.webuntis.com", school: "school", username: "admin", password: "secret" },
      { personId: -1, personType: 13, klasseId: 0 },
    );
    assert.deepEqual(response.elements.map(element => `${element.type}:${element.id}`), ["1:1781", "3:106", "4:191"]);
    assert.deepEqual(response.defaultElement, { id: 1781, type: 1 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("keeps the freshly authenticated student's own timetable when student lists are denied", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "authenticate"
      ? { sessionId: "test-session", personId: 99, personType: 5, klasseId: 1781 }
      : request.method === "logout"
        ? true
        : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "no rights" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetableElements(
      { server: "school.webuntis.com", school: "school", username: "student", password: "secret" },
      { personId: -1, personType: 13, klasseId: 0 },
    );
    assert.deepEqual(response.elements, [{ id: 99, type: 5, name: "Eigener Stundenplan" }]);
    assert.deepEqual(response.defaultElement, { id: 99, type: 5 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("restricts a concretely assigned class account to its own timetable", async () => {
  const originalFetch = global.fetch;
  let unrelatedMasterDataRequested = false;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    if (["getTeachers", "getSubjects", "getRooms", "getStudents"].includes(request.method)) unrelatedMasterDataRequested = true;
    const result = request.method === "authenticate"
      ? { sessionId: "test-session", personId: 1664, personType: 1, klasseId: 0 }
      : request.method === "getSchoolyears"
        ? [{ id: 26, name: "2026/2027", startDate: 20260831, endDate: 20270718 }]
        : request.method === "getKlassen"
          ? [{ id: 1850, name: "Q1", longName: "Qualifikationsphase 1" }]
      : request.method === "logout"
        ? true
        : [];
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetableElements(
      { server: "school.webuntis.com", school: "school", username: "Q1", password: "secret" },
      { personId: 1664, personType: 1, klasseId: 0 },
      20260831,
    );
    assert.equal(unrelatedMasterDataRequested, false);
    assert.deepEqual(response.elements, [{ id: 1850, type: 1, name: "Eigener Stundenplan" }]);
    assert.deepEqual(response.defaultElement, { id: 1850, type: 1 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("requests classes from the upcoming schoolyear when the selected week is between schoolyears", async () => {
  const originalFetch = global.fetch;
  let requestedSchoolyearId: number | undefined;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    if (request.method === "getKlassen") requestedSchoolyearId = request.params.schoolyearId;
    const result = request.method === "authenticate"
      ? { sessionId: "test-session", personId: -1, personType: 13, klasseId: 0 }
      : request.method === "getSchoolyears"
        ? [
            { id: 25, name: "2025/2026", startDate: 20250827, endDate: 20260719 },
            { id: 26, name: "2026/2027", startDate: 20260831, endDate: 20270718 },
          ]
        : request.method === "getKlassen"
          ? [{ id: 1781, name: "8E", longName: "Klasse 8E" }]
          : request.method === "logout"
            ? true
            : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "no rights" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetableElements(
      { server: "school.webuntis.com", school: "school", username: "admin", password: "secret" },
      { personId: -1, personType: 13, klasseId: 0 },
      20260824,
    );
    assert.equal(requestedSchoolyearId, 26);
    assert.deepEqual(response.elements, [{ id: 1781, type: 1, name: "8E", longname: "Klasse 8E" }]);
    assert.deepEqual(response.defaultElement, { id: 1781, type: 1 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("returns an empty timetable instead of querying a week outside every schoolyear", async () => {
  const originalFetch = global.fetch;
  let timetableRequested = false;
  let timeGridRequested = false;
  let holidaysRequested = false;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    if (request.method === "getTimetable") timetableRequested = true;
    if (request.method === "getTimegridUnits") timeGridRequested = true;
    if (request.method === "getHolidays") holidaysRequested = true;
    const result = request.method === "authenticate"
      ? { sessionId: "test-session", personId: -1, personType: 13, klasseId: 0 }
      : request.method === "getSchoolyears"
        ? [{ id: 26, name: "2026/2027", startDate: 20260831, endDate: 20270718 }]
        : request.method === "getTimegridUnits" || request.method === "getHolidays"
          ? []
          : request.method === "getLatestImportTime"
            ? 1787921441000
            : request.method === "logout"
              ? true
              : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "unexpected request" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetable(
      { server: "school.webuntis.com", school: "school", username: "admin", password: "secret" },
      { personId: 1781, personType: 1 },
      20260824,
      20260828,
    );
    assert.equal(timetableRequested, false);
    assert.equal(timeGridRequested, false);
    assert.equal(holidaysRequested, false);
    assert.deepEqual(response.lessons, []);
    assert.equal(response.schoolYear, "2026/2027");
  } finally {
    global.fetch = originalFetch;
  }
});

test("keeps timetable lessons when optional timegrid and holiday data are unavailable", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "authenticate"
      ? { sessionId: "test-session", personId: 1850, personType: 1, klasseId: 0 }
      : request.method === "getSchoolyears"
        ? [{ id: 26, name: "2026/2027", startDate: 20260831, endDate: 20270718 }]
        : request.method === "getTimetable"
          ? [{ id: 1, date: 20260831, startTime: 755, endTime: 855 }]
          : request.method === "logout"
            ? true
            : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "optional data unavailable" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetable(
      { server: "school.webuntis.com", school: "school", username: "Q1", password: "secret" },
      { personId: 1850, personType: 1 },
      20260831,
      20260904,
    );
    assert.equal(response.lessons.length, 1);
    assert.deepEqual(response.timeGrid, []);
    assert.deepEqual(response.holidays, []);
    assert.equal(response.schoolYear, "2026/2027");
    assert.equal("latestImportTime" in response, false);
  } finally {
    global.fetch = originalFetch;
  }
});
