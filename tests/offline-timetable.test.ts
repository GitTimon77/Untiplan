import test from "node:test";
import assert from "node:assert/strict";
import { offlineTimetableCacheKey, offlineTimetablePreferenceKey } from "../src/lib/offline-timetable";

test("offline timetable keys are isolated by account, week and timetable", () => {
  assert.equal(offlineTimetablePreferenceKey("account"),"untiplan.offline-enabled.v1.account");
  assert.notEqual(offlineTimetableCacheKey("one","2026-01-12",{type:1,id:10}),offlineTimetableCacheKey("two","2026-01-12",{type:1,id:10}));
  assert.notEqual(offlineTimetableCacheKey("one","2026-01-12",{type:1,id:10}),offlineTimetableCacheKey("one","2026-01-19",{type:1,id:10}));
});
