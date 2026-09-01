import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { FilterDialog, LessonDialog } from "../src/components/dashboard-dialogs";
import { DayColumn, TodayOverview } from "../src/components/timetable-views";
import type { Lesson } from "../src/lib/types";
import { Dashboard } from "../src/components/dashboard";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { offlineTimetableCacheKey, offlineTimetablePreferenceKey } from "../src/lib/offline-timetable";
import { timetableViewModeStorageKey } from "../src/lib/local-timetable";
import { MessagesInbox } from "../src/components/messages-inbox";

const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://untiplan.test/"});
const globals=globalThis as unknown as Record<string,unknown>;
globals.window=dom.window;globals.document=dom.window.document;globals.self=dom.window;
Object.defineProperty(globals,"navigator",{
  configurable:true,
  value:dom.window.navigator,
  writable:true,
});
globals.HTMLElement=dom.window.HTMLElement;globals.Node=dom.window.Node;globals.KeyboardEvent=dom.window.KeyboardEvent;globals.MouseEvent=dom.window.MouseEvent;globals.getComputedStyle=dom.window.getComputedStyle;globals.IS_REACT_ACT_ENVIRONMENT=true;

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

test("today overview renders and expands messages of the day",async()=>{
  const {render,screen,cleanup,user}=await testing();
  render(<TodayOverview lessons={[]} date={new Date(2026,8,1)} holidays={[]} bounds={{start:480,end:600}} now={new Date(2026,8,1,10)} onSelect={()=>{}} messages={[{id:1,subject:"Schulfest",text:"Beginn um 16 Uhr",isExpanded:false,attachmentCount:1}]} messagesSourceUrl="https://tenant.webuntis.com/WebUntis/"/>);
  assert.ok(screen.getByRole("heading",{name:"Nachrichten zum Tag"}));
  const details=screen.getByText("Schulfest").closest("details");
  assert.equal(details?.open,false);
  await user.click(screen.getByText("Schulfest"));
  assert.equal(details?.open,true);
  assert.ok(screen.getByText("Beginn um 16 Uhr"));
  assert.equal(screen.getByRole("link",{name:"In WebUntis öffnen"}).getAttribute("href"),"https://tenant.webuntis.com/WebUntis/");
  cleanup();
});

test("today messages remain available when the timetable is unavailable",async()=>{
  const {render,screen,cleanup}=await testing();
  render(<TodayOverview lessons={[]} date={new Date(2026,8,1)} holidays={[]} bounds={{start:480,end:600}} now={new Date(2026,8,1,10)} onSelect={()=>{}} messages={[{id:1,subject:"Vertretungsinfo",text:"Bitte beachten",isExpanded:false,attachmentCount:0}]} timetableMessage="Der Stundenplan ist derzeit nicht verfügbar."/>);
  assert.ok(screen.getByRole("heading",{name:"Nachrichten zum Tag"}));
  assert.ok(screen.getByText("Vertretungsinfo"));
  assert.ok(screen.getByRole("alert",{name:""}));
  assert.ok(screen.getByText("Der Stundenplan ist derzeit nicht verfügbar."));
  cleanup();
});

test("the WebUntis inbox is searchable and expands independently from daily news",async()=>{
  const {render,screen,cleanup,user}=await testing();
  render(<MessagesInbox messages={[{id:7,subject:"Schulmusical-Termine",contentPreview:"Ankündigung für nächste Woche",senderName:"Admin_2",sentDateTime:"2026-09-01T09:00:00",isRead:false,hasAttachments:false},{id:8,subject:"Gottesdienst",contentPreview:"Erinnerung",senderName:"MOR",sentDateTime:"2026-08-30T10:00:00",isRead:true,hasAttachments:false}]} busy={false} error="" sourceUrl="" retry={()=>{}}/>);
  assert.ok(screen.getByRole("heading",{name:"Mitteilungen"}));
  assert.equal(screen.queryByRole("heading",{name:"Nachrichten zum Tag"}),null);
  assert.ok(screen.getByLabelText("Ungelesen"));
  await user.type(screen.getByRole("searchbox",{name:"Mitteilungen durchsuchen"}),"Admin");
  assert.ok(screen.getByText("Schulmusical-Termine"));
  assert.equal(screen.queryByText("Gottesdienst"),null);
  await user.click(screen.getByText("Schulmusical-Termine"));
  assert.equal(screen.getAllByText("Ankündigung für nächste Woche").length,2);
  cleanup();
});

test("lesson details keep a long subject name in a single heading",async()=>{
  const {render,screen,cleanup}=await testing();
  const lesson:Lesson={id:8,date:20260112,startTime:800,endTime:845,su:[{id:2,name:"SOWI",longname:"Sozialwissenschaften/Wirtschaft"}]};
  render(<LessonDialog lesson={lesson} close={()=>{}}/>);
  assert.equal(screen.getByRole("heading",{name:"Sozialwissenschaften/Wirtschaft (SOWI)"}).tagName,"H2");
  cleanup();
});

test("a display restriction removes old lessons and offline data, then recovers when released",async()=>{
  const {render,screen,cleanup,user,waitFor}=await testing();
  const originalFetch=global.fetch;
  const selection={type:1 as const,id:101};
  const cacheKey=offlineTimetableCacheKey("blocked-test","2026-08-31",selection);
  const oldLocalStorage=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:window.localStorage});
  window.localStorage.clear();
  window.history.replaceState(null,"","/");
  window.localStorage.setItem(offlineTimetablePreferenceKey("blocked-test"),"true");
  window.localStorage.setItem(timetableViewModeStorageKey("blocked-test"),'"week"');
  let blocked=false;
  const router={bfcacheId:"test",back(){},forward(){},refresh(){},push(){},replace(){},prefetch:async()=>{}};
  global.fetch=async input=>String(input).startsWith("/api/timetable/elements")
    ? Response.json({elements:[{...selection,name:"Testklasse"}],defaultElement:selection})
    : blocked
      ? Response.json({error:"Anzeige gesperrt",code:"TIMETABLE_DISPLAY_BLOCKED"},{status:403})
      : Response.json({lessons:[{id:1,date:20260831,startTime:800,endTime:845,su:[{id:1,name:"TESTFACH"}]}],courses:[],holidays:[],timeGrid:[],range:{startDate:20260831,endDate:20260904}});
  try {
    render(<AppRouterContext.Provider value={router}><Dashboard displayName="Testkonto" filterStorageId="blocked-test" initialWeek="2026-08-31" defaultElement={selection}/></AppRouterContext.Provider>);
    await user.click(screen.getByRole("tab",{name:"Woche"}));
    await screen.findByRole("button",{name:/TESTFACH/});
    await waitFor(()=>assert.equal(screen.getByRole("button",{name:"Stundenplan aktualisieren"}).hasAttribute("disabled"),false));
    window.localStorage.setItem(cacheKey,"previous encrypted cache");
    blocked=true;
    await user.click(screen.getByRole("button",{name:"Stundenplan aktualisieren"}));
    await screen.findByRole("heading",{name:"Anzeige gesperrt"});
    assert.equal(screen.queryByRole("button",{name:/TESTFACH/}),null);
    assert.equal(screen.queryByText("Gespeicherter Stand"),null);
    assert.equal(window.localStorage.getItem(cacheKey),null);
    assert.equal(screen.getByRole("menuitem",{name:"Als Bild speichern"}).hasAttribute("disabled"),true);
    blocked=false;
    await user.click(screen.getByRole("button",{name:"Stundenplan aktualisieren"}));
    await screen.findByRole("button",{name:/TESTFACH/});
    assert.equal(screen.queryByRole("heading",{name:"Anzeige gesperrt"}),null);
  } finally {
    cleanup();global.fetch=originalFetch;window.localStorage.clear();
    if(oldLocalStorage)Object.defineProperty(globalThis,"localStorage",oldLocalStorage);
    else Reflect.deleteProperty(globalThis,"localStorage");
  }
});
