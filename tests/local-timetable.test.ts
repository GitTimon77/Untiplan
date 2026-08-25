import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTimetableSelection, normalizeTimetableViewMode, parseTimetableSelection, parseTimetableViewMode, serializeTimetableSelection, serializeTimetableViewMode, timetableSelectionStorageKey, timetableViewModeStorageKey } from "../src/lib/local-timetable";

test("timetable selection storage is separated by account", () => {
  assert.equal(timetableSelectionStorageKey("account-one"), "untiplan.timetable-selection.v1.account-one");
  assert.notEqual(timetableSelectionStorageKey("account-one"), timetableSelectionStorageKey("account-two"));
});

test("timetable view mode storage is separated by account", () => {
  assert.equal(timetableViewModeStorageKey("account-one"), "untiplan.timetable-view-mode.v1.account-one");
  assert.notEqual(timetableViewModeStorageKey("account-one"), timetableViewModeStorageKey("account-two"));
});

test("local timetable selections survive serialization", () => {
  assert.deepEqual(parseTimetableSelection(serializeTimetableSelection({ id: 101, type: 1 })), { id: 101, type: 1 });
});

test("local timetable view mode survives serialization", () => {
  assert.equal(parseTimetableViewMode(serializeTimetableViewMode("week")), "week");
  assert.equal(parseTimetableViewMode(serializeTimetableViewMode("day")), "day");
});

test("invalid local timetable selections are rejected", () => {
  assert.equal(parseTimetableSelection("not-json"), null);
  assert.equal(normalizeTimetableSelection({ id: -1, type: 1 }), null);
  assert.equal(normalizeTimetableSelection({ id: 101, type: 13 }), null);
});

test("invalid local timetable view modes fallback to week", () => {
  assert.equal(parseTimetableViewMode("not-json"), "week");
  assert.equal(normalizeTimetableViewMode("month"), "week");
  assert.equal(normalizeTimetableViewMode("day"), "day");
});
