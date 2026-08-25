import { deriveCourses } from "./courses";
import type { Lesson, TimetablePayload } from "./types";

// All preview records are deliberately synthetic and have no relation to a real school.
const klasse = [{ id: 101, name: "7A", longname: "Beispielklasse A" }];
const gemeinsamerKurs = [
  ...klasse,
  { id: 102, name: "7B", longname: "Beispielklasse B" },
];

function lesson(id:number,date:number,startTime:number,endTime:number,subjectId:number,subject:string,subjectLongname:string,teacherId:number,teacher:string,teacherLongname:string,roomId:number,room:string,roomLongname:string,sg:string,kl=klasse):Lesson {
  return { id,date,startTime,endTime,kl,te:[{id:teacherId,name:teacher,longname:teacherLongname}],su:[{id:subjectId,name:subject,longname:subjectLongname}],ro:[{id:roomId,name:room,longname:roomLongname}],sg,activityType:"Unterricht" };
}

export const sampleLessons:Lesson[] = [
  lesson(1,20260112,800,845,201,"MAT","Mathematik",301,"ALP","Lehrkraft Alpha",401,"R-101","Beispielraum 101","7A-MAT"),
  lesson(2,20260112,900,945,202,"DEU","Deutsch",302,"BET","Lehrkraft Beta",402,"R-102","Beispielraum 102","7A-DEU"),
  lesson(3,20260113,800,845,203,"ENG","Englisch",303,"GAM","Lehrkraft Gamma",403,"R-103","Beispielraum 103","7A-ENG"),
  lesson(4,20260113,1000,1045,204,"SPO","Sport",304,"DEL","Lehrkraft Delta",404,"HAL-A","Beispielhalle A","7A-SPO"),
  lesson(5,20260114,900,945,205,"NAT","Naturwissenschaften",305,"EPS","Lehrkraft Epsilon",405,"LAB-A","Beispiellabor A","Kurs-NAT",gemeinsamerKurs),
  lesson(6,20260114,1100,1145,206,"GES","Geschichte",301,"ALP","Lehrkraft Alpha",406,"R-104","Beispielraum 104","7A-GES"),
  lesson(7,20260115,800,845,207,"KUN","Kunst",302,"BET","Lehrkraft Beta",407,"KUN-A","Beispielatelier A","7A-KUN"),
  lesson(8,20260115,1000,1045,208,"MUS","Musik",303,"GAM","Lehrkraft Gamma",408,"MUS-A","Beispielraum Musik","7A-MUS"),
  lesson(9,20260116,900,945,209,"POL","Politik",304,"DEL","Lehrkraft Delta",401,"R-101","Beispielraum 101","7A-POL"),
  lesson(10,20260116,1100,1145,210,"KLA","Klassenstunde",305,"EPS","Lehrkraft Epsilon",402,"R-102","Beispielraum 102","7A-KLA"),
];

export const sampleTimetable:TimetablePayload = { lessons:sampleLessons,courses:deriveCourses(sampleLessons),holidays:[],timeGrid:[],schoolYear:"Testschuljahr",range:{startDate:20260112,endDate:20260116} };
