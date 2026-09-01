import test from "node:test";
import assert from "node:assert/strict";
import { changeSignature, newChanges } from "../src/lib/change-notifications";
import type { Lesson } from "../src/lib/types";

const lesson: Lesson = {
  id: 1,
  date: 20260112,
  startTime: 800,
  endTime: 845,
  code: "cancelled",
  su: [{ id: 1, name: "MAT" }],
  ro: [{ id: 2, name: "R1" }],
};

test("timetable signatures detect updates and exclude known changes", () => {
  const knownSignature = JSON.stringify([
    1,
    20260112,
    800,
    845,
    "cancelled",
    null,
    null,
    null,
    null,
    [[2, null]],
  ]);
  const movedLesson = { ...lesson, startTime: 900, endTime: 945 };

  assert.equal(changeSignature(lesson), knownSignature);
  assert.notEqual(changeSignature(movedLesson), knownSignature);
  assert.deepEqual(newChanges([knownSignature], [lesson]), []);
  assert.deepEqual(newChanges([knownSignature], [movedLesson]).map(value => value.id), [1]);
});
