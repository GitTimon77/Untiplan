import test from "node:test";
import assert from "node:assert/strict";
import { attachExamsToLessons, examMatchesLesson, normalizeExams } from "../src/lib/exams";
import type { Lesson } from "../src/lib/types";

test("normalizes the WebUntis exam list", () => {
  const exams = normalizeExams({ data:[{
    examId:42,
    examStart:"2026-09-25T09:10:00",
    examEnd:"2026-09-25T12:45:00",
    examName:"Leistungskursklausur",
    examText:"Hilfsmittel beachten",
    examType:{ displayName:"Klausur" },
    subject:{ displayName:"M L2" },
    classes:[{ id:1850,displayName:"Q1" }],
    teachers:[{ displayName:"WEI" }],
    rooms:[{ displayName:"B-28" }],
  }] });
  assert.deepEqual(exams, [{
    id:42,date:20260925,startTime:910,endTime:1245,subject:"M L2",name:"Leistungskursklausur",type:"Klausur",text:"Hilfsmittel beachten",teachers:["WEI"],rooms:["B-28"],classes:["Q1"],classIds:[1850],
  }]);
});

test("combines the grouped WebUntis exam response", () => {
  const exam = {
    examId:9,
    examStart:"2026-09-25T09:10:00",
    examEnd:"2026-09-25T12:45:00",
    subject:{ displayName:"M L2" },
  };
  assert.deepEqual(normalizeExams({ examsDone:[], examsUpcoming:[], examsFuture:[{ exam, grade:null }] }).map(item => item.id),[9]);
});

test("attaches an exam only to overlapping lessons of the same subject", () => {
  const lessons:Lesson[] = [
    { id:1,date:20260925,startTime:910,endTime:1010,su:[{ id:11,name:"M  L2" }] },
    { id:2,date:20260925,startTime:910,endTime:1010,su:[{ id:12,name:"D L2" }] },
    { id:3,date:20260924,startTime:910,endTime:1010,su:[{ id:11,name:"M L2" }] },
  ];
  const exam = normalizeExams([{ examId:7,examStart:"2026-09-25T09:10:00",examEnd:"2026-09-25T12:45:00",subject:{ displayName:"M L2" } }])[0];
  assert.equal(examMatchesLesson(exam,lessons[0]),true);
  assert.deepEqual(attachExamsToLessons(lessons,[exam]).map(lesson=>lesson.exam?.id),[7,undefined,undefined]);
});

test("does not attach an exam from another class", () => {
  const lesson:Lesson = { id:1,date:20260925,startTime:910,endTime:1010,kl:[{ id:1850,name:"Q1" }],su:[{ id:11,name:"M L2" }] };
  const exam = normalizeExams([{ examId:7,examStart:"2026-09-25T09:10:00",examEnd:"2026-09-25T12:45:00",subject:{ displayName:"M L2" },classes:[{ id:1849,displayName:"EF" }] }])[0];
  assert.equal(examMatchesLesson(exam,lesson),false);
});

test("ignores deleted and incomplete exam records", () => {
  assert.deepEqual(normalizeExams([
    { examId:1,deleted:true,examStart:"2026-09-25T09:10:00",examEnd:"2026-09-25T12:45:00",subject:{ displayName:"M L2" } },
    { examId:2,examStart:"2026-09-25T09:10:00",examEnd:"2026-09-25T12:45:00" },
  ]),[]);
});
