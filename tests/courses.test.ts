import test from "node:test";
import assert from "node:assert/strict";
import { applyCourseFilter,deriveCourses,lessonCourseKeys } from "../src/lib/courses";
const lessons=[{id:1,date:20260112,startTime:800,endTime:845,su:[{id:10,name:"MAT",longname:"Beispielfach Alpha"}],te:[{id:21,orgid:20,name:"NEU",orgname:"ALT"}],ro:[]},{id:2,date:20260112,startTime:900,endTime:945,su:[{id:11,name:"BET"}],te:[{id:30,name:"TST"}],ro:[]}];
test("uses original teacher id so substitutions keep the course identity",()=>assert.deepEqual(lessonCourseKeys(lessons[0]),["10-20"]));
test("derives unique sorted courses",()=>assert.deepEqual(deriveCourses(lessons).map(c=>c.key),["11-30","10-20"]));
test("filter is opt-in and keeps selected courses",()=>{assert.equal(applyCourseFilter(lessons,["10-20"],false).length,2);assert.deepEqual(applyCourseFilter(lessons,["10-20"],true).map(l=>l.id),[1]);assert.equal(applyCourseFilter(lessons,[],true).length,2)});
