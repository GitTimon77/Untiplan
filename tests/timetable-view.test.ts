import test from "node:test";
import assert from "node:assert/strict";
import { changedLessons, holidaysForDate, positionLessons, timetableBounds } from "../src/lib/timetable-view";
import type { Lesson } from "../src/lib/types";

const lesson = (id:number,startTime:number,endTime:number,code?:string):Lesson => ({ id,date:20260112,startTime,endTime,code });

test("timeline bounds combine time grid and lesson times", () => {
  assert.deepEqual(timetableBounds([{ day:1,timeUnits:[{ startTime:745,endTime:830 }] }],[lesson(1,900,945)]), { start:450,end:600 });
});

test("overlapping lessons are placed in separate columns", () => {
  const positioned = positionLessons([lesson(1,800,900),lesson(2,830,930),lesson(3,930,1015)]);
  assert.deepEqual(positioned.map(value => [value.lesson.id,value.column,value.columnCount]), [[1,0,2],[2,1,2],[3,0,1]]);
});

test("holidays and changed lessons are selected", () => {
  assert.equal(holidaysForDate([{ id:1,startDate:20260112,endDate:20260116,name:"Ferien" }],20260114).length,1);
  assert.deepEqual(changedLessons([lesson(1,800,845),lesson(2,900,945,"cancelled")]).map(value => value.id),[2]);
});
