import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWebUntisServer, parseSchoolSearchResponse } from "../src/lib/schools";

test("normalizes official WebUntis hosts and rejects other targets", () => {
  assert.equal(normalizeWebUntisServer("HTTPS://Example.WEBUNTIS.COM/"), "example.webuntis.com");
  assert.throws(() => normalizeWebUntisServer("example.com"), /gehört nicht zu WebUntis/);
  assert.throws(() => normalizeWebUntisServer("localhost:3000"), /Ungültiger WebUntis-Server/);
});

test("maps, sanitizes and deduplicates school search results", () => {
  const schools = parseSchoolSearchResponse({
    result: {
      schools: [
        { schoolId: 1, displayName: "Demo-Schule", address: "Beispielort", server: "tenant.webuntis.com", loginName: "test-school" },
        { schoolId: 2, displayName: "Duplikat", server: "tenant.webuntis.com", loginName: "test-school" },
        { schoolId: 3, displayName: "Anderer Server", server: "example.com", loginName: "bad" },
      ],
    },
  });

  assert.deepEqual(schools, [{
    id: "1",
    displayName: "Demo-Schule",
    address: "Beispielort",
    server: "tenant.webuntis.com",
    loginName: "test-school",
  }]);
});

test("reports malformed responses from the upstream service", () => {
  assert.throws(() => parseSchoolSearchResponse({ result: {} }), /keine Schulergebnisse/);
  assert.throws(() => parseSchoolSearchResponse({ error: { message: "kaputt" } }), /kaputt/);
});
