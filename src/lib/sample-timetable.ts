import { deriveCourses } from "./courses";
import type { Lesson, TimetablePayload } from "./types";

const klasse = [{ id: 1781, name: "8E", longname: "Korb, Werner" }];
const sprachenKlassen = [
  { id: 1775, name: "8C", longname: "Fouquet, Vreden" },
  { id: 1778, name: "8D", longname: "Bläser,Hoeft" },
  ...klasse,
  { id: 1784, name: "8F", longname: "Stenzel, Sommer" },
];

function lesson(id:number,date:number,startTime:number,endTime:number,subjectId:number,subject:string,subjectLongname:string,teacherId:number,teacher:string,teacherLongname:string,roomId:number,room:string,roomLongname:string,sg:string,kl=klasse):Lesson {
  return { id,date,startTime,endTime,kl,te:[{id:teacherId,name:teacher,longname:teacherLongname}],su:[{id:subjectId,name:subject,longname:subjectLongname}],ro:[{id:roomId,name:room,longname:roomLongname}],sg,activityType:"Unterricht" };
}

export const sampleLessons:Lesson[] = [
  lesson(2651013,20260831,755,855,1425,"F7","Französisch ab Klasse 7 (G9)",701,"FRA","FRAUENDORF",211,"A-K03","A-K03","F7_8C8D8E8F_FRA",sprachenKlassen),
  lesson(2653965,20260831,755,855,1435,"L7","Lateinisch ab Klasse 7 (G9)",596,"TOF","TOFFEL",996,"K-16","Musikraum III ehem. K16A und K-16A - TOF","L7_8C8D8E8F_TOF",sprachenKlassen),
  lesson(2505054,20260831,910,1010,201,"D","DEUTSCH",601,"TRA","TRACHTERNACH",646,"B-33","B-33","D_8E_TRA"),
  lesson(2523520,20260831,1020,1120,326,"E5","ENGLISCH",536,"SPA","SPAHL",196,"A-K01","A-K01","E5_8E_SPA"),
  lesson(2485033,20260831,1145,1245,106,"BI","BIOLOGIE",741,"JOH","JOHN",191,"A-38","BIOLOGIERAUM 3 CHEMIESAAL 3","BI_8E_JOH"),
  lesson(2537287,20260831,1255,1355,421,"EK","ERDKUNDE",226,"KAS","Kaspari",666,"B-35","B-35","EK_8E_KAS"),
  lesson(2523523,20260901,910,1010,326,"E5","ENGLISCH",536,"SPA","SPAHL",196,"A-K01","A-K01","E5_8E_SPA"),
  lesson(2485036,20260901,1020,1120,106,"BI","BIOLOGIE",741,"JOH","JOHN",186,"A-37","BIOLOGIERAUM 2","BI_8E_JOH"),
  lesson(2505057,20260901,1145,1245,201,"D","DEUTSCH",601,"TRA","TRACHTERNACH",646,"B-33","B-33","D_8E_TRA"),
  lesson(2628857,20260901,1255,1355,1196,"SP","SPORT",829,"KOB","KORB",1216,"SP3","SPORTHALLE 3.DRITT","SP_8E_KOB"),
  lesson(2616744,20260902,755,855,1141,"REL","RELIGION ÖKOMENISCH",411,"OBO","OBOTH",106,"A-24","Kursraum SEK II","REL_8E_WER"),
  lesson(2651016,20260902,910,1010,1425,"F7","Französisch ab Klasse 7 (G9)",701,"FRA","FRAUENDORF",211,"A-K03","A-K03","F7_8C8D8E8F_FRA",sprachenKlassen),
  lesson(2653968,20260902,910,1010,1435,"L7","Lateinisch ab Klasse 7 (G9)",596,"TOF","TOFFEL",996,"K-16","Musikraum III ehem. K16A und K-16A - TOF","L7_8C8D8E8F_TOF",sprachenKlassen),
  lesson(2551978,20260902,1020,1120,586,"GE","GESCHICHTE",291,"MAN","MANZ",731,"B-F3","B-F3","GE_8E_VRE"),
  lesson(2551981,20260903,755,855,586,"GE","GESCHICHTE",291,"MAN","MANZ",731,"B-F3","B-F3","GE_8E_VRE"),
  lesson(2587699,20260903,910,1010,866,"M","MATHEMATIK",829,"KOB","KORB",771,"B-F7","B-F7","M_8E_KOB"),
  lesson(2587987,20260903,910,1010,866,"M","MATHEMATIK",491,"SAR","SARVER",601,"B-27","B-27","M_8E_SAR"),
  lesson(2651019,20260903,1020,1120,1425,"F7","Französisch ab Klasse 7 (G9)",701,"FRA","FRAUENDORF",211,"A-K03","A-K03","F7_8C8D8E8F_FRA",sprachenKlassen),
  lesson(2653971,20260903,1020,1120,1435,"L7","Lateinisch ab Klasse 7 (G9)",596,"TOF","TOFFEL",996,"K-16","Musikraum III ehem. K16A und K-16A - TOF","L7_8C8D8E8F_TOF",sprachenKlassen),
  lesson(2547736,20260903,1255,1355,536,"FOC","Forschen Schwerpunkt Chemie Klasse 8",636,"WOE","WOELKE",96,"A-23","Bioraum SEK I - EF,5,SEK II, evt. ABW","FOC_8E_WER"),
  lesson(2656332,20260904,755,855,1450,"POL","WIRTSCHAFT/Politik",131,"HAL","HALBEISEN",311,"A-K23","A-K23","WP_8E_HAL"),
  lesson(2628860,20260904,910,1010,1196,"SP","SPORT",829,"KOB","KORB",1216,"SP3","SPORTHALLE 3.DRITT","SP_8E_KOB"),
  lesson(2494828,20260904,1020,1120,176,"CH","CHEMIE",636,"WOE","WOELKE",151,"A-31","CHEMIERAUM 1","CH_8E_WER"),
  lesson(2616747,20260904,1145,1245,1141,"REL","RELIGION ÖKOMENISCH",411,"OBO","OBOTH",611,"B-28","Mathe-Wettbewerbe","REL_8E_WER"),
  lesson(2565930,20260904,1255,1355,771,"KS","Klassenstunde (hierin integriert ist die alte Klassenlehrerstunde)",829,"KOB","KORB",771,"B-F7","B-F7","KS_8E_KOB"),
];

export const sampleTimetable:TimetablePayload = { lessons:sampleLessons,courses:deriveCourses(sampleLessons),holidays:[],timeGrid:[],schoolYear:"2026/2027",range:{startDate:20260831,endDate:20260904} };
