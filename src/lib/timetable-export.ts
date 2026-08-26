import { getLessonStatus } from "./lesson-status";
import { fromUntisDate } from "./date";
import { namedElementLabel } from "./timetable-elements";
import type { Lesson } from "./types";

function pad(value:number){return String(value).padStart(2,"0")}
function values(items:Lesson["su"]){return (items||[]).map(namedElementLabel).join(", ")}

export async function timetablePng(lessons:Lesson[],title:string) {
  const width=1400,height=900,padding=55;
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d");if(!context)throw new Error("Bildexport wird nicht unterstützt.");
  context.fillStyle="#f5f7fb";context.fillRect(0,0,width,height);context.fillStyle="#172033";context.font="700 38px system-ui";context.fillText(title,padding,70);
  const dates=[...new Set(lessons.map(lesson=>lesson.date))].sort();const columnWidth=(width-padding*2)/Math.max(1,dates.length);
  dates.forEach((date,index)=>{const x=padding+index*columnWidth;context.fillStyle="#68738a";context.font="700 20px system-ui";context.fillText(fromUntisDate(date).toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit"}),x,120);lessons.filter(lesson=>lesson.date===date).sort((a,b)=>a.startTime-b.startTime).forEach((lesson,lessonIndex)=>{const y=145+lessonIndex*105;context.fillStyle=getLessonStatus(lesson)==="cancelled"?"#e5e7eb":"#ffffff";context.strokeStyle=getLessonStatus(lesson)==="substitution"?"#e38b29":"#3457d5";context.lineWidth=5;context.beginPath();context.roundRect(x,y,columnWidth-14,88,12);context.fill();context.stroke();context.fillStyle="#68738a";context.font="500 15px system-ui";context.fillText(`${pad(Math.floor(lesson.startTime/100))}:${pad(lesson.startTime%100)}–${pad(Math.floor(lesson.endTime/100))}:${pad(lesson.endTime%100)}`,x+14,y+25);context.fillStyle="#172033";context.font="700 19px system-ui";context.fillText((values(lesson.su)||"Unterricht").slice(0,25),x+14,y+53);context.fillStyle="#68738a";context.font="500 15px system-ui";context.fillText((values(lesson.ro)||"–").slice(0,28),x+14,y+75)})});
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Bild konnte nicht erstellt werden.")),"image/png"));
}

export function downloadBlob(filename:string,blob:Blob){const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url)}
