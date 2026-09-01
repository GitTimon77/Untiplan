import test from "node:test";
import assert from "node:assert/strict";
import { getLessonStatus } from "../src/lib/lesson-status";
import type { Lesson } from "../src/lib/types";

const base: Lesson = { id: 1, date: 1, startTime: 800, endTime: 900 };

test("classifies lesson status variants and applies their precedence", () => {
  assert.equal(getLessonStatus(base), "normal");
  assert.equal(getLessonStatus({ ...base, code: "canceled" }), "cancelled");
  assert.equal(getLessonStatus({ ...base, te: [{ id: 2, name: "B", orgid: 1 }] }), "substitution");
  assert.equal(getLessonStatus({ ...base, ro: [{ id: 3, name: "R2", orgid: 2 }] }), "substitution");
  assert.equal(getLessonStatus({ ...base, substText: "Raumänderung" }), "substitution");
  assert.equal(getLessonStatus({ ...base, activityType: "School Event" }), "event");
  assert.equal(getLessonStatus({ ...base, code: "irregular" }), "irregular");
  assert.equal(getLessonStatus({ ...base, lstype: "irregular" }), "irregular");
  assert.equal(getLessonStatus({ ...base, code: "cancelled", substText: "Vertretung" }), "cancelled");
});
