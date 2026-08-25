import test from "node:test";
import assert from "node:assert/strict";
import { defaultTimetableElement, isTimetableElementType, sortTimetableElements } from "../src/lib/timetable-elements";

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

test("sorts timetable elements alphabetically with natural numbers", () => {
  const sorted = sortTimetableElements([
    { id: 3, type: 1, name: "10F", longname: "Klasse 10F" },
    { id: 2, type: 1, name: "5B", longname: "Klasse 5B" },
    { id: 1, type: 1, name: "5A", longname: "Klasse 5A" },
    { id: 4, type: 2, name: "ZIM", longname: "Anna Zimmer" },
    { id: 5, type: 2, name: "ABR", longname: "Zoe Albrecht" },
  ]);
  assert.deepEqual(sorted.map(element => `${element.type}:${element.name}`), ["1:5A", "1:5B", "1:10F", "2:ABR", "2:ZIM"]);
});
