import test from "node:test";
import assert from "node:assert/strict";
import { defaultTimetableElement, isTimetableElementType } from "../src/lib/timetable-elements";

test("accepts only documented timetable element types", () => {
  assert.equal(isTimetableElementType(1), true);
  assert.equal(isTimetableElementType(5), true);
  assert.equal(isTimetableElementType(13), false);
});

test("uses the assigned timetable person when available", () => {
  assert.deepEqual(defaultTimetableElement({ personId: 42, personType: 2 }), { id: 42, type: 2 });
});

test("falls back to the assigned class and rejects unassigned role users", () => {
  assert.deepEqual(defaultTimetableElement({ personId: -1, personType: 13, klasseId: 1781 }), { id: 1781, type: 1 });
  assert.equal(defaultTimetableElement({ personId: -1, personType: 13, klasseId: 0 }), null);
});
