import test from "node:test";
import assert from "node:assert/strict";
import { fetchTimetable, fetchTimetableElements } from "../src/lib/webuntis";

test("discovers only master-data lists allowed by WebUntis", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "authenticate"
      ? { sessionId: "unit-test-session", personId: -1, personType: 13, klasseId: 0 }
      : request.method === "getKlassen"
        ? [{ id: 101, name: "7A", longName: "Beispielklasse A" }]
        : request.method === "getRooms"
          ? [{ id: 201, name: "R-101", longName: "Beispielraum 101" }]
          : request.method === "getSubjects"
            ? [{ id: 301, name: "NAT", longName: "Beispielfach Naturwissenschaften" }]
            : request.method === "logout"
              ? true
              : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "no rights" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=unit-test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetableElements(
      { server: "tenant.webuntis.com", school: "test-school", username: "role-user", password: "test-password" },
      { personId: -1, personType: 13, klasseId: 0 },
    );
    assert.deepEqual(response.elements.map(element => `${element.type}:${element.id}`), ["1:101", "3:301", "4:201"]);
    assert.deepEqual(response.defaultElement, { id: 101, type: 1 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("keeps the freshly authenticated student's own timetable when student lists are denied", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "authenticate"
      ? { sessionId: "unit-test-session", personId: 501, personType: 5, klasseId: 101 }
      : request.method === "logout"
        ? true
        : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "no rights" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=unit-test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetableElements(
      { server: "tenant.webuntis.com", school: "test-school", username: "test-learner", password: "test-password" },
      { personId: -1, personType: 13, klasseId: 0 },
    );
    assert.deepEqual(response.elements, [{ id: 501, type: 5, name: "Eigener Stundenplan" }]);
    assert.deepEqual(response.defaultElement, { id: 501, type: 5 });
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
      ? { sessionId: "unit-test-session", personId: 601, personType: 1, klasseId: 0 }
      : request.method === "getSchoolyears"
        ? [{ id: 22, name: "Testjahr B", startDate: 20260901, endDate: 20270831 }]
        : request.method === "getKlassen"
          ? [{ id: 602, name: "LEVEL-A", longName: "Beispielstufe A" }]
      : request.method === "logout"
        ? true
        : [];
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=unit-test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetableElements(
      { server: "tenant.webuntis.com", school: "test-school", username: "LEVEL-A", password: "test-password" },
      { personId: 601, personType: 1, klasseId: 0 },
      20260901,
    );
    assert.equal(unrelatedMasterDataRequested, false);
    assert.deepEqual(response.elements, [{ id: 602, type: 1, name: "Eigener Stundenplan" }]);
    assert.deepEqual(response.defaultElement, { id: 602, type: 1 });
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
      ? { sessionId: "unit-test-session", personId: -1, personType: 13, klasseId: 0 }
      : request.method === "getSchoolyears"
        ? [
            { id: 21, name: "Testjahr A", startDate: 20250901, endDate: 20260731 },
            { id: 22, name: "Testjahr B", startDate: 20260901, endDate: 20270831 },
          ]
        : request.method === "getKlassen"
          ? [{ id: 101, name: "7A", longName: "Beispielklasse A" }]
          : request.method === "logout"
            ? true
            : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "no rights" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=unit-test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetableElements(
      { server: "tenant.webuntis.com", school: "test-school", username: "role-user", password: "test-password" },
      { personId: -1, personType: 13, klasseId: 0 },
      20260815,
    );
    assert.equal(requestedSchoolyearId, 22);
    assert.deepEqual(response.elements, [{ id: 101, type: 1, name: "7A", longname: "Beispielklasse A" }]);
    assert.deepEqual(response.defaultElement, { id: 101, type: 1 });
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
      ? { sessionId: "unit-test-session", personId: -1, personType: 13, klasseId: 0 }
      : request.method === "getSchoolyears"
        ? [{ id: 22, name: "Testjahr B", startDate: 20260901, endDate: 20270831 }]
        : request.method === "getTimegridUnits" || request.method === "getHolidays"
          ? []
          : request.method === "getLatestImportTime"
            ? 1700000000000
            : request.method === "logout"
              ? true
              : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "unexpected request" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=unit-test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetable(
      { server: "tenant.webuntis.com", school: "test-school", username: "role-user", password: "test-password" },
      { personId: 101, personType: 1 },
      20260815,
      20260819,
    );
    assert.equal(timetableRequested, false);
    assert.equal(timeGridRequested, false);
    assert.equal(holidaysRequested, false);
    assert.deepEqual(response.lessons, []);
    assert.equal(response.schoolYear, "Testjahr B");
  } finally {
    global.fetch = originalFetch;
  }
});

test("keeps timetable lessons when optional timegrid and holiday data are unavailable", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "authenticate"
      ? { sessionId: "unit-test-session", personId: 602, personType: 1, klasseId: 0 }
      : request.method === "getSchoolyears"
        ? [{ id: 22, name: "Testjahr B", startDate: 20260901, endDate: 20270831 }]
        : request.method === "getTimetable"
          ? [{ id: 1, date: 20260901, startTime: 800, endTime: 845 }]
          : request.method === "logout"
            ? true
            : undefined;
    const body = result === undefined
      ? { jsonrpc: "2.0", id: request.id, error: { code: -8509, message: "optional data unavailable" } }
      : { jsonrpc: "2.0", id: request.id, result };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "set-cookie": "JSESSIONID=unit-test-session; Path=/WebUntis" } });
  };

  try {
    const response = await fetchTimetable(
      { server: "tenant.webuntis.com", school: "test-school", username: "LEVEL-A", password: "test-password" },
      { personId: 602, personType: 1 },
      20260901,
      20260905,
    );
    assert.equal(response.lessons.length, 1);
    assert.deepEqual(response.timeGrid, []);
    assert.deepEqual(response.holidays, []);
    assert.equal(response.schoolYear, "Testjahr B");
    assert.equal("latestImportTime" in response, false);
  } finally {
    global.fetch = originalFetch;
  }
});
