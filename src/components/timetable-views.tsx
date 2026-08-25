"use client";
import { addDays } from "@/lib/date";
import { getLessonStatus } from "@/lib/lesson-status";
import { namedElementLabel } from "@/lib/timetable-elements";
import { changedLessons, holidaysForDate, lessonChangeSummary, positionLessons, timeToMinutes, type TimelineBounds } from "@/lib/timetable-view";
import type { Lesson, NamedElement, TimetablePayload } from "@/lib/types";

export const weekDays=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag"];
export function formatTime(value:number){return `${String(Math.floor(value/100)).padStart(2,"0")}:${String(value%100).padStart(2,"0")}`}
export function dateNumber(date:Date){return date.getFullYear()*10000+(date.getMonth()+1)*100+date.getDate()}
export function names(values:NamedElement[]=[]){return values.map(namedElementLabel).join(", ")||"–"}

export function TodayOverview({lessons,date,holidays,bounds,now,onSelect}:{lessons:Lesson[];date:Date;holidays:TimetablePayload["holidays"];bounds:TimelineBounds;now:Date;onSelect:(lesson:Lesson)=>void}) {
  const nowMinutes=now.getHours()*60+now.getMinutes();
  const active=lessons.find(lesson=>getLessonStatus(lesson)!=="cancelled"&&timeToMinutes(lesson.startTime)<=nowMinutes&&timeToMinutes(lesson.endTime)>nowMinutes);
  const next=lessons.find(lesson=>getLessonStatus(lesson)!=="cancelled"&&timeToMinutes(lesson.startTime)>nowMinutes);
  const last=[...lessons].filter(lesson=>getLessonStatus(lesson)!=="cancelled").sort((a,b)=>b.endTime-a.endTime)[0];
  const changes=changedLessons(lessons),focus=active||next,weekend=date.getDay()===0||date.getDay()===6;
  return <section className="today-overview" aria-labelledby="today-title"><div className="today-heading"><div><p className="eyebrow">Dein Tag</p><h2 id="today-title">{date.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long"})}</h2></div><span>{date.toLocaleDateString("de-DE",{day:"2-digit"})}</span></div><div className="today-cards"><article><small>{active?"Gerade":"Als Nächstes"}</small><b>{focus?names(focus.su):weekend?"Wochenende":"Kein Unterricht mehr"}</b><span>{focus?`${formatTime(focus.startTime)}–${formatTime(focus.endTime)}`:"Freier Nachmittag"}</span></article><article><small>Unterrichtsende</small><b>{last?`${formatTime(last.endTime)} Uhr`:"–"}</b><span>{lessons.length?`${lessons.length} Termine heute`:"Keine Termine"}</span></article><article className={changes.length?"has-changes":""}><small>Änderungen</small><b>{changes.length}</b><span>{changes.length?"Details im Tagesplan":"Alles nach Plan"}</span></article></div>{weekend?<div className="empty today-empty">Heute ist kein regulärer Unterrichtstag.</div>:<div className="day-view"><DayColumn label="Heute" date={date} lessons={lessons} holidays={holidays} bounds={bounds} now={now} onSelect={onSelect}/></div>}</section>
}

export function ChangesPanel({lessons,onSelect}:{lessons:Lesson[];onSelect:(lesson:Lesson)=>void}) {
  return <section className="changes-panel" aria-labelledby="changes-title"><div className="changes-head"><div><p className="eyebrow">Wichtige Änderungen</p><h2 id="changes-title">{lessons.length} {lessons.length===1?"Änderung":"Änderungen"} in dieser Woche</h2></div><span aria-hidden="true">!</span></div><div className="change-list">{lessons.map(lesson=><button key={`${lesson.id}-${lesson.date}-${lesson.startTime}`} onClick={()=>onSelect(lesson)}><b>{names(lesson.su)}</b><span>{new Date(Math.floor(lesson.date/10000),Math.floor(lesson.date%10000/100)-1,lesson.date%100).toLocaleDateString("de-DE",{weekday:"short"})} · {formatTime(lesson.startTime)}</span><small>{lessonChangeSummary(lesson)}</small></button>)}</div></section>
}

export function DayColumn({label,date,lessons,holidays,bounds,now,onSelect}:{label:string;date:Date;lessons:Lesson[];holidays:TimetablePayload["holidays"];bounds:TimelineBounds;now?:Date;onSelect:(lesson:Lesson)=>void}) {
  const dayHolidays=holidaysForDate(holidays,dateNumber(date)),positioned=positionLessons(lessons),scale=1.15,timelineHeight=Math.max(120,(bounds.end-bounds.start)*scale);
  const currentMinute=now&&dateNumber(now)===dateNumber(date)?now.getHours()*60+now.getMinutes():null;
  const hourMarks:Array<{minute:number;label:string}>=[];
  for(let minute=Math.ceil(bounds.start/60)*60;minute<bounds.end;minute+=60)hourMarks.push({minute,label:`${String(Math.floor(minute/60)).padStart(2,"0")}:00`});
  return <section className="day-column"><header><b>{label}</b><span>{date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</span></header>{dayHolidays.map(holiday=><div className="holiday-banner" key={holiday.id}><b>{holiday.name}</b>{holiday.longName&&holiday.longName!==holiday.name?<span>{holiday.longName}</span>:null}</div>)}<div className="lesson-timeline" style={{height:timelineHeight}}>{hourMarks.map(mark=><div className="hour-line" key={mark.minute} style={{top:(mark.minute-bounds.start)*scale}}><span>{mark.label}</span></div>)}{currentMinute!==null&&currentMinute>=bounds.start&&currentMinute<=bounds.end?<div className="current-time-line" style={{top:(currentMinute-bounds.start)*scale}}><span>Jetzt</span></div>:null}{positioned.map(({lesson,column,columnCount,start,end})=><button key={`${lesson.id}-${lesson.startTime}`} className={`lesson timeline-lesson ${getLessonStatus(lesson)}`} style={{top:(start-bounds.start)*scale,height:Math.max(48,(end-start)*scale),left:`calc(${column/columnCount*100}% + 3px)`,width:`calc(${100/columnCount}% - 6px)`}} onClick={()=>onSelect(lesson)}><span className="time">{formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}</span><strong>{names(lesson.su)}</strong><span>{names(lesson.te)}</span><span className="room">{names(lesson.ro)}</span>{getLessonStatus(lesson)!=="normal"&&<em>{getLessonStatus(lesson)==="cancelled"?"Entfällt":getLessonStatus(lesson)==="substitution"?"Vertretung":"Änderung"}</em>}</button>)}{!lessons.length&&!dayHolidays.length?<div className="timeline-empty empty">Keine Stunden</div>:null}</div></section>
}

export function WeekView({week,lessonsByDay,holidays,bounds,now,onSelect}:{week:Date;lessonsByDay:Lesson[][];holidays:TimetablePayload["holidays"];bounds:TimelineBounds;now?:Date;onSelect:(lesson:Lesson)=>void}) {
  return <div className="week-grid" aria-label="Wochenstundenplan">{weekDays.map((label,index)=><DayColumn key={label} label={label} date={addDays(week,index)} lessons={lessonsByDay[index]} holidays={holidays} bounds={bounds} now={now} onSelect={onSelect}/>)}</div>
}
