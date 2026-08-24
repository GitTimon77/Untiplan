import test from "node:test";
import assert from "node:assert/strict";
import { getLessonStatus } from "../src/lib/lesson-status";
test("detects cancellations",()=>assert.equal(getLessonStatus({id:1,date:1,startTime:800,endTime:900,code:"cancelled"}),"cancelled"));
test("detects teacher substitutions",()=>assert.equal(getLessonStatus({id:1,date:1,startTime:800,endTime:900,te:[{id:2,name:"B",orgid:1}]}),"substitution"));
