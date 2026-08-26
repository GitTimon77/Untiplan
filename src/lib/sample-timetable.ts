import { deriveCourses } from "./courses";
import type { Lesson, TimetablePayload } from "./types";

// All preview records are deliberately synthetic and have no relation to a real school.
const klasse = [{ id: 101, name: "11A", longname: "Klasse 11A" }];
const gemeinsamerKurs = [
  ...klasse,
  { id: 102, name: "11B", longname: "Klasse 11B" },
];

function lesson(id:number,date:number,startTime:number,endTime:number,subjectId:number,subject:string,subjectLongname:string,teacherId:number,teacher:string,teacherLongname:string,roomId:number,room:string,roomLongname:string,sg:string,kl=klasse):Lesson {
  return { id,date,startTime,endTime,kl,te:[{id:teacherId,name:teacher,longname:teacherLongname}],su:[{id:subjectId,name:subject,longname:subjectLongname}],ro:[{id:roomId,name:room,longname:roomLongname}],sg,activityType:"Unterricht" };
}

export const sampleLessons:Lesson[] = [
  lesson(1,20260112,800,845,201,"MAT","Mathematik",301,"LEH1","Lehrkraft 1",401,"R-101","Raum 101","11A-MAT"),
  { ...lesson(2,20260112,900,945,202,"DEU","Deutsch",302,"LEH2","Lehrkraft 2",402,"R-102","Raum 102","11A-DEU"), code:"cancelled", substText:"Unterricht entfällt" },
  lesson(3,20260113,800,845,203,"ENG","Englisch",303,"LEH3","Lehrkraft 3",403,"R-103","Raum 103","11A-ENG"),
  { ...lesson(4,20260113,1000,1045,204,"SPO","Sport",304,"LEH4","Lehrkraft 4",404,"HAL-A","Sporthalle A","11A-SPO"), ro:[{id:409,name:"HAL-B",longname:"Sporthalle B",orgid:404,orgname:"Sporthalle A"}], substText:"Hallenwechsel" },
  lesson(5,20260114,900,945,205,"NAT","Naturwissenschaften",305,"LEH5","Lehrkraft 5",405,"LAB-A","Labor A","Kurs-NAT",gemeinsamerKurs),
  lesson(6,20260114,1100,1145,206,"GES","Geschichte",301,"LEH1","Lehrkraft 1",406,"R-104","Raum 104","11A-GES"),
  lesson(7,20260115,800,845,207,"KUN","Kunst",302,"LEH2","Lehrkraft 2",407,"KUN-A","Kunstatelier A","11A-KUN"),
  { ...lesson(8,20260115,1000,1045,208,"MUS","Musik",303,"LEH3","Lehrkraft 3",408,"MUS-A","Musikraum A","11A-MUS"), activityType:"Event" },
  lesson(9,20260116,900,945,209,"POL","Politik",304,"LEH4","Lehrkraft 4",401,"R-101","Raum 101","11A-POL"),
  lesson(10,20260116,1100,1145,210,"KLA","Klassenstunde",305,"LEH5","Lehrkraft 5",402,"R-102","Raum 102","11A-KLA"),
];

export const sampleTimetable:TimetablePayload = { lessons:sampleLessons,courses:deriveCourses(sampleLessons),holidays:[{id:1,startDate:20260116,endDate:20260116,name:"Projekttag",longName:"Schulweiter Projekttag"}],timeGrid:[1,2,3,4,5].map(day=>({day,timeUnits:[{startTime:800,endTime:845},{startTime:900,endTime:945},{startTime:1000,endTime:1045},{startTime:1100,endTime:1145}]})),schoolYear:"Demo-Schuljahr",range:{startDate:20260112,endDate:20260116} };
