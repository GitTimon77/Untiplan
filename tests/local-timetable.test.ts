import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTimetableSelection, parseTimetableSelection, serializeTimetableSelection, timetableSelectionStorageKey } from "../src/lib/local-timetable";

test("timetable selection storage is separated by account", () => {
  assert.equal(timetableSelectionStorageKey("account-one"), "untiplan.timetable-selection.v1.account-one");
  assert.notEqual(timetableSelectionStorageKey("account-one"), timetableSelectionStorageKey("account-two"));
});

test("local timetable selections survive serialization", () => {
  assert.deepEqual(parseTimetableSelection(serializeTimetableSelection({ id: 101, type: 1 })), { id: 101, type: 1 });
});

test("invalid local timetable selections are rejected", () => {
  assert.equal(parseTimetableSelection("not-json"), null);
  assert.equal(normalizeTimetableSelection({ id: -1, type: 1 }), null);
  assert.equal(normalizeTimetableSelection({ id: 101, type: 13 }), null);
});
