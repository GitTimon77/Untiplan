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

test("new timetable changes exclude known signatures", () => {
  assert.equal(newChanges([changeSignature(lesson)], [lesson]).length, 0);
  assert.equal(newChanges([], [lesson]).length, 1);
});
