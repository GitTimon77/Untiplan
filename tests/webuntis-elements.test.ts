import test from "node:test";
import assert from "node:assert/strict";
import { fetchTimetableElements } from "../src/lib/webuntis";

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
