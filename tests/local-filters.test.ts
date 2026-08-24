import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCourseFilter, parseCourseFilter, serializeCourseFilter } from "../src/lib/local-filters";

test("local course filters survive serialization", () => {
  const filter = { selectedCourseKeys: ["10-20", "11-21"], filterEnabled: true };
  assert.deepEqual(parseCourseFilter(serializeCourseFilter(filter)), filter);
});

test("invalid local filter data falls back safely", () => {
  assert.deepEqual(parseCourseFilter("not-json"), { selectedCourseKeys: [], filterEnabled: false });
  assert.deepEqual(parseCourseFilter('{"selectedCourseKeys":[],"filterEnabled":"yes"}'), { selectedCourseKeys: [], filterEnabled: false });
});

test("local filter keys are validated and deduplicated", () => {
  assert.deepEqual(normalizeCourseFilter({ selectedCourseKeys: ["10-20", "bad", "10-20"], filterEnabled: true }), {
    selectedCourseKeys: ["10-20"],
    filterEnabled: true,
  });
});
