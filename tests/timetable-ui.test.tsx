import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { FilterDialog } from "../src/components/dashboard-dialogs";
import { DayColumn, TodayOverview } from "../src/components/timetable-views";
import type { Lesson } from "../src/lib/types";

const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://untiplan.test/"});
const globals=globalThis as unknown as Record<string,unknown>;
globals.window=dom.window;globals.document=dom.window.document;globals.navigator=dom.window.navigator;globals.HTMLElement=dom.window.HTMLElement;globals.Node=dom.window.Node;globals.KeyboardEvent=dom.window.KeyboardEvent;globals.MouseEvent=dom.window.MouseEvent;globals.getComputedStyle=dom.window.getComputedStyle;globals.IS_REACT_ACT_ENVIRONMENT=true;

async function testing(){const library=await import("@testing-library/react");const user=(await import("@testing-library/user-event")).default.setup();return {...library,user}}

test("options dialog manages focus, toggles offline mode and closes with Escape",async()=>{
  const {render,screen,cleanup,user}=await testing();let offline=false,closed=false;
  render(<FilterDialog courseFilter={{selectedCourseKeys:[],filterEnabled:false}} courseOptions={[]} visibleCourseOptions={[]} courseSearch="" setCourseSearch={()=>{}} saveFilters={()=>{}} offlineEnabled={false} updateOffline={value=>{offline=value}} notificationsEnabled={false} updateNotifications={()=>{}} close={()=>{closed=true}}/>);
  assert.equal(document.activeElement,screen.getByRole("button",{name:"Optionen schließen"}));
  await user.click(screen.getByRole("checkbox",{name:/Stundenpläne speichern/}));
  assert.equal(offline,true);
  await user.keyboard("{Escape}");
  assert.equal(closed,true);cleanup();
});

test("timeline exposes a cancellation and opens its details",async()=>{
  const {render,screen,cleanup,user}=await testing();let selected=0;
  const lesson:Lesson={id:7,date:20260112,startTime:800,endTime:845,code:"cancelled",su:[{id:1,name:"MAT"}]};
  render(<DayColumn label="Montag" date={new Date(2026,0,12)} lessons={[lesson]} holidays={[]} bounds={{start:480,end:600}} now={new Date(2026,0,12,8,15)} onSelect={value=>{selected=value.id}}/>);
  await user.click(screen.getByRole("button",{name:/Mathematik|MAT/}));
  assert.equal(selected,7);assert.match(screen.getByText("Entfällt").textContent||"",/Entfällt/);assert.ok(screen.getByText("Jetzt"));cleanup();
});

test("today overview explains a weekend without lessons",async()=>{
  const {render,screen,cleanup}=await testing();
  render(<TodayOverview lessons={[]} date={new Date(2026,0,11)} holidays={[]} bounds={{start:480,end:600}} now={new Date(2026,0,11,10)} onSelect={()=>{}}/>);
  assert.ok(screen.getByText("Heute ist kein regulärer Unterrichtstag."));cleanup();
});
