import { getLessonStatus } from "./lesson-status";
import { fromUntisDate } from "./date";
import { namedElementLabel } from "./timetable-elements";
import { positionLessons, timeToMinutes, type TimelineBounds } from "./timetable-view";
import type { Lesson } from "./types";

type TimetablePngOptions = {
  dates?: number[];
  bounds?: TimelineBounds;
};

function pad(value:number){return String(value).padStart(2,"0")}
function values(items:Lesson["su"]){return (items||[]).map(namedElementLabel).join(", ")}
function clock(minutes:number){return `${pad(Math.floor(minutes/60))}:00`}
function ellipsis(context:CanvasRenderingContext2D,value:string,maxWidth:number){
  if(context.measureText(value).width<=maxWidth)return value;
  let shortened=value;
  while(shortened.length&&context.measureText(`${shortened}…`).width>maxWidth)shortened=shortened.slice(0,-1);
  return `${shortened}…`;
}

export async function timetablePng(lessons:Lesson[],title:string,options:TimetablePngOptions={}) {
  const dates=options.dates?.length?[...options.dates]:[...new Set(lessons.map(lesson=>lesson.date))].sort();
  const bounds=options.bounds||(()=>{
    const times=lessons.flatMap(lesson=>[timeToMinutes(lesson.startTime),timeToMinutes(lesson.endTime)]);
    return times.length?{start:Math.floor(Math.min(...times)/30)*30,end:Math.ceil(Math.max(...times)/30)*30}:{start:8*60,end:15*60};
  })();
  const width=dates.length>1?1800:1000,padding=52,timeGutter=82,headerHeight=150,footerPadding=42;
  const pixelsPerMinute=1.35,timelineHeight=Math.max(180,(bounds.end-bounds.start)*pixelsPerMinute);
  const height=Math.ceil(headerHeight+timelineHeight+footerPadding);
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d");if(!context)throw new Error("Bildexport wird nicht unterstützt.");

  context.fillStyle="#f5f7fb";context.fillRect(0,0,width,height);
  context.fillStyle="#172033";context.font="700 38px system-ui";context.fillText(ellipsis(context,title,width-padding*2),padding,62);

  const gridLeft=padding+timeGutter,gridRight=width-padding,columnWidth=(gridRight-gridLeft)/Math.max(1,dates.length),gridTop=headerHeight;
  dates.forEach((date,index)=>{
    const x=gridLeft+index*columnWidth;
    context.fillStyle=index%2?"#f8f9fc":"#ffffff";context.fillRect(x,gridTop,columnWidth,timelineHeight);
    context.fillStyle="#68738a";context.font="700 20px system-ui";
    const label=fromUntisDate(date).toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit"});
    context.fillText(ellipsis(context,label,columnWidth-22),x+11,116);
  });

  context.strokeStyle="#dfe4ee";context.lineWidth=2;
  for(let index=0;index<=dates.length;index+=1){const x=gridLeft+index*columnWidth;context.beginPath();context.moveTo(x,gridTop);context.lineTo(x,gridTop+timelineHeight);context.stroke()}
  for(let minute=Math.ceil(bounds.start/60)*60;minute<=bounds.end;minute+=60){
    const y=gridTop+(minute-bounds.start)*pixelsPerMinute;
    context.strokeStyle="#c8cfdb";context.lineWidth=1;context.setLineDash([7,7]);context.beginPath();context.moveTo(gridLeft,y);context.lineTo(gridRight,y);context.stroke();context.setLineDash([]);
    context.fillStyle="#68738a";context.font="600 17px system-ui";context.textAlign="right";context.fillText(clock(minute),gridLeft-13,y+6);
  }
  context.textAlign="left";

  dates.forEach((date,dateIndex)=>{
    const dayLessons=lessons.filter(lesson=>lesson.date===date);
    positionLessons(dayLessons).forEach(({lesson,column,columnCount,start,end})=>{
      const laneWidth=columnWidth/columnCount,x=gridLeft+dateIndex*columnWidth+column*laneWidth+5;
      const y=gridTop+(start-bounds.start)*pixelsPerMinute+3,w=laneWidth-10,h=Math.max(48,(end-start)*pixelsPerMinute-6);
      const status=getLessonStatus(lesson);
      context.fillStyle=status==="cancelled"?"#e5e7eb":status==="substitution"?"#fff7eb":"#ffffff";
      context.strokeStyle=status==="cancelled"?"#8992a4":status==="substitution"?"#e38b29":status==="irregular"?"#9a62d6":status==="event"?"#1c9a76":"#3457d5";
      context.lineWidth=4;context.beginPath();context.roundRect(x,y,w,h,10);context.fill();context.stroke();
      context.save();context.beginPath();context.rect(x+7,y+5,Math.max(0,w-14),Math.max(0,h-10));context.clip();
      context.fillStyle="#68738a";context.font="600 14px system-ui";context.fillText(`${pad(Math.floor(lesson.startTime/100))}:${pad(lesson.startTime%100)}–${pad(Math.floor(lesson.endTime/100))}:${pad(lesson.endTime%100)}`,x+12,y+21);
      context.fillStyle="#172033";context.font="700 18px system-ui";context.fillText(ellipsis(context,values(lesson.su)||"Unterricht",w-24),x+12,y+44);
      if(h>=75){context.fillStyle="#68738a";context.font="500 14px system-ui";context.fillText(ellipsis(context,values(lesson.ro)||"–",w-24),x+12,y+65)}
      context.restore();
    });
  });
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Bild konnte nicht erstellt werden.")),"image/png"));
}

export function downloadBlob(filename:string,blob:Blob){const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;link.hidden=true;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0)}
