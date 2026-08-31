"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Course, Lesson, TimetableElement, TimetableElementSelection, TimetableElementType, TimetablePayload } from "@/lib/types";
import { addDays, isoDate, mondayFor } from "@/lib/date";
import { applyCourseFilter } from "@/lib/courses";
import { courseFilterStorageKey, LEGACY_COURSE_FILTER_STORAGE_KEY, normalizeCourseFilter, parseCourseFilter, serializeCourseFilter, type CourseFilter } from "@/lib/local-filters";
import { parseTimetableSelection, parseTimetableViewMode, serializeTimetableSelection, serializeTimetableViewMode, timetableSelectionStorageKey, timetableViewModeStorageKey, type TimetableViewMode } from "@/lib/local-timetable";
import { clearOfflineTimetables, offlineTimetablePreferenceKey, readOfflineTimetable, saveOfflineTimetable } from "@/lib/offline-timetable";
import { changeSnapshot, newChanges, notificationPreferenceKey, notificationSnapshotKey } from "@/lib/change-notifications";
import { downloadBlob, timetablePng } from "@/lib/timetable-export";
import { sortTimetableElements, timetableElementLabel } from "@/lib/timetable-elements";
import { lessonChangeSummary, timetableBounds } from "@/lib/timetable-view";
import { SiteFooter } from "@/components/site-footer";
import { DayColumn, TodayOverview, WeekView, dateNumber, names, weekDays } from "@/components/timetable-views";
import { AccountDialog, FilterDialog, LessonDialog, LogoutDialog, type AccountSummary } from "@/components/dashboard-dialogs";

const timetableElementLabels:Record<TimetableElementType,string> = {1:"Klassen",2:"Lehrkräfte",3:"Fächer",4:"Räume",5:"Schüler*innen"};
function relativeTime(timestamp:number,now:number){const minutes=Math.max(0,Math.floor((now-timestamp)/60000));return minutes<1?"gerade eben":minutes===1?"vor 1 Minute":minutes<60?`vor ${minutes} Minuten`:new Date(timestamp).toLocaleString("de-DE")}
export function Dashboard({displayName,filterStorageId,initialWeek,previewData,defaultElement}:{displayName:string;filterStorageId:string;initialWeek?:string;previewData?:TimetablePayload;defaultElement?:TimetableElementSelection|null}) {
 const router=useRouter();
 const [week,setWeek]=useState(()=>initialWeek?mondayFor(new Date(`${initialWeek}T12:00:00`)):mondayFor());
 const [mode,setMode]=useState<TimetableViewMode>("week");
 const [day,setDay]=useState(Math.min(4,Math.max(0,(new Date().getDay()||1)-1)));
 const [data,setData]=useState<TimetablePayload|null>(previewData||null);
 const [timetableElements,setTimetableElements]=useState<TimetableElement[]>([]);
 const [selectedElement,setSelectedElement]=useState<TimetableElementSelection|null>(defaultElement||null);
 const [elementsBusy,setElementsBusy]=useState(!previewData);
 const [elementsError,setElementsError]=useState("");
 const [courseFilter,setCourseFilter]=useState<CourseFilter>({selectedCourseKeys:[],filterEnabled:false});
 const [selected,setSelected]=useState<Lesson|null>(null);
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [courseSearch,setCourseSearch]=useState("");
 const [accountsOpen,setAccountsOpen]=useState(false);
 const [accounts,setAccounts]=useState<AccountSummary[]>([]);
 const [accountsBusy,setAccountsBusy]=useState(false);
 const [accountsError,setAccountsError]=useState("");
 const [switchingAccountId,setSwitchingAccountId]=useState("");
 const [logoutOpen,setLogoutOpen]=useState(false);
 const [logoutBusy,setLogoutBusy]=useState(false);
 const [logoutError,setLogoutError]=useState("");
 const [busy,setBusy]=useState(!previewData&&Boolean(defaultElement));
 const [error,setError]=useState("");
 const [offlineEnabled,setOfflineEnabled]=useState(false);
 const [isOnline,setIsOnline]=useState(true);
 const [isOfflineData,setIsOfflineData]=useState(false);
 const [lastUpdated,setLastUpdated]=useState<number|null>(null);
 const [clock,setClock]=useState(0);
 const [notificationsEnabled,setNotificationsEnabled]=useState(false);
 const [actionMessage,setActionMessage]=useState("");
 const filterStorageKey=useMemo(()=>courseFilterStorageKey(filterStorageId),[filterStorageId]);
 const selectionStorageKey=useMemo(()=>timetableSelectionStorageKey(filterStorageId),[filterStorageId]);
 const modeStorageKey=useMemo(()=>timetableViewModeStorageKey(filterStorageId),[filterStorageId]);
 const offlinePreferenceKey=useMemo(()=>offlineTimetablePreferenceKey(filterStorageId),[filterStorageId]);
 const notificationsPreferenceKey=useMemo(()=>notificationPreferenceKey(filterStorageId),[filterStorageId]);
 const load=useCallback(async(signal?:AbortSignal)=>{
  if(previewData){setData(previewData);setLastUpdated(Date.now());setBusy(false);return}
  if(!selectedElement){setBusy(false);return}
  setBusy(true);setError("");
  try {
   const response=await fetch(`/api/timetable?week=${isoDate(week)}&elementType=${selectedElement.type}&elementId=${selectedElement.id}`,{cache:"no-store",signal});
   const body=await response.json() as TimetablePayload&{error?:string};
   if(response.status===401){router.replace("/login");return}
   if(!response.ok)throw new Error(body.error);
   setData(body);setIsOfflineData(false);setLastUpdated(Date.now());
   if(offlineEnabled)await saveOfflineTimetable(filterStorageId,isoDate(week),selectedElement,body).catch(()=>{});
   if(notificationsEnabled&&typeof Notification!=="undefined")try{const snapshotKey=notificationSnapshotKey(filterStorageId,isoDate(week),selectedElement);const previousRaw=window.localStorage.getItem(snapshotKey);const previous=previousRaw?JSON.parse(previousRaw) as string[]:[];const fresh=newChanges(previous,body.lessons);window.localStorage.setItem(snapshotKey,JSON.stringify(changeSnapshot(body.lessons)));if(previousRaw&&fresh.length&&Notification.permission==="granted")new Notification(fresh.length===1?"Neue Stundenplanänderung":`${fresh.length} neue Stundenplanänderungen`,{body:fresh.slice(0,3).map(lesson=>`${names(lesson.su)}: ${lessonChangeSummary(lesson)}`).join("\n"),tag:`untiplan-${filterStorageId}`})}catch{}
  } catch(e) {
   if(signal?.aborted)return;
   const cached=offlineEnabled?await readOfflineTimetable(filterStorageId,isoDate(week),selectedElement).catch(()=>null):null;
   if(cached){setData(cached.data);setLastUpdated(cached.savedAt);setIsOfflineData(true);setError("")}else setError(e instanceof Error?e.message:"Stundenplan konnte nicht geladen werden.");
  } finally {if(!signal?.aborted)setBusy(false)}
 },[week,router,previewData,selectedElement,offlineEnabled,filterStorageId,notificationsEnabled]);
 useEffect(()=>{if(previewData)return;let ignore=false;(async()=>{setElementsBusy(true);setElementsError("");try{const response=await fetch(`/api/timetable/elements?date=${isoDate(week)}`,{cache:"no-store"});const body=await response.json();if(response.status===401){router.replace("/login");return}if(!response.ok)throw new Error(body.error);if(ignore)return;const discovered:TimetableElement[]=body.elements||[];const responseDefault:TimetableElementSelection|null=body.defaultElement||null;const complete=responseDefault&&!discovered.some(element=>element.id===responseDefault.id&&element.type===responseDefault.type)?[{...responseDefault,name:"Eigener Stundenplan"},...discovered]:discovered;const next=sortTimetableElements(complete);const stored=(()=>{try{return parseTimetableSelection(window.localStorage.getItem(selectionStorageKey))}catch{return null}})();const params=new URLSearchParams(window.location.search);const linked=parseTimetableSelection(JSON.stringify({type:Number(params.get("elementType")),id:Number(params.get("elementId"))}));setTimetableElements(next);setSelectedElement(current=>[linked,stored,current,responseDefault].find(candidate=>candidate&&next.some(element=>element.id===candidate.id&&element.type===candidate.type))||null)}catch(requestError){if(!ignore)setElementsError(requestError instanceof Error?requestError.message:"Verfügbare Stundenpläne konnten nicht geladen werden.")}finally{if(!ignore)setElementsBusy(false)}})();return()=>{ignore=true}},[previewData,router,selectionStorageKey,week]);
 // The effect synchronizes the selected week with the remote timetable API.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort()},[load]);
 useEffect(()=>{const update=()=>setIsOnline(navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)}},[]);
 useEffect(()=>{const update=()=>setClock(Date.now());const initial=window.setTimeout(update,0);const timer=window.setInterval(update,60000);return()=>{window.clearTimeout(initial);window.clearInterval(timer)}},[]);
 useEffect(()=>{if(previewData)return;const refresh=()=>{if(document.visibilityState==="visible"&&navigator.onLine)load()};const timer=window.setInterval(refresh,300000);document.addEventListener("visibilitychange",refresh);return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh)}},[load,previewData]);
 useEffect(()=>{const initial=window.setTimeout(()=>{try{setOfflineEnabled(window.localStorage.getItem(offlinePreferenceKey)==="true")}catch{}},0);return()=>window.clearTimeout(initial)},[offlinePreferenceKey]);
 useEffect(()=>{const initial=window.setTimeout(()=>{try{setNotificationsEnabled(window.localStorage.getItem(notificationsPreferenceKey)==="true"&&typeof Notification!=="undefined"&&Notification.permission==="granted")}catch{}},0);return()=>window.clearTimeout(initial)},[notificationsPreferenceKey]);
 useEffect(()=>{if(previewData)return;const initial=window.setTimeout(()=>{const linkedWeek=new URLSearchParams(window.location.search).get("week");if(linkedWeek&&/^\d{4}-\d{2}-\d{2}$/.test(linkedWeek))setWeek(mondayFor(new Date(`${linkedWeek}T12:00:00`)))},0);return()=>window.clearTimeout(initial)},[previewData]);
 useEffect(()=>{if(previewData||!selectedElement)return;const url=new URL(window.location.href);url.searchParams.set("week",isoDate(week));url.searchParams.set("elementType",String(selectedElement.type));url.searchParams.set("elementId",String(selectedElement.id));window.history.replaceState(null,"",url)},[previewData,selectedElement,week]);
 useEffect(()=>{if(previewData||!selectedElement)return;try{window.localStorage.setItem(selectionStorageKey,serializeTimetableSelection(selectedElement))}catch{}},[previewData,selectedElement,selectionStorageKey]);
 useEffect(()=>{try{
   // Each account keeps its preferred timetable view mode in this browser.
   // eslint-disable-next-line react-hooks/set-state-in-effect
   const stored=window.localStorage.getItem(modeStorageKey);setMode(stored?parseTimetableViewMode(stored):previewData?"week":"today");
  }catch{}},[modeStorageKey,previewData]);
 useEffect(()=>{try{window.localStorage.setItem(modeStorageKey,serializeTimetableViewMode(mode))}catch{}},[mode,modeStorageKey]);
 useEffect(()=>{try{
   // Each account owns a separate filter preference in this browser.
   // eslint-disable-next-line react-hooks/set-state-in-effect
   setCourseFilter(parseCourseFilter(window.localStorage.getItem(filterStorageKey)));
  }catch{}const sync=(event:StorageEvent)=>{if(event.key===filterStorageKey)setCourseFilter(parseCourseFilter(event.newValue))};window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync)},[filterStorageKey]);
 const filteredLessons=useMemo(()=>applyCourseFilter(data?.lessons||[],courseFilter.selectedCourseKeys,courseFilter.filterEnabled),[data,courseFilter]);
 const lessonsByDay=useMemo(()=>weekDays.map((_,i)=>filteredLessons.filter(l=>l.date===dateNumber(addDays(week,i))).sort((a,b)=>a.startTime-b.startTime)),[filteredLessons,week]);
 const timelineBounds=useMemo(()=>timetableBounds(data?.timeGrid||[],filteredLessons),[data?.timeGrid,filteredLessons]);
 const currentWeek=isoDate(week)===isoDate(mondayFor(new Date(clock)));
 const browserDay=new Date(clock).getDay();
 const todayIndex=Math.min(4,Math.max(0,browserDay-1));
 const todayLessons=previewData?lessonsByDay[day]:currentWeek&&browserDay>=1&&browserDay<=5?lessonsByDay[todayIndex]:[];
 const overviewDate=previewData?addDays(week,day):new Date(clock);
 const selectedElementType=selectedElement?.type||timetableElements[0]?.type||1;
 const elementsForSelectedType=timetableElements.filter(element=>element.type===selectedElementType);
 const courseOptions=useMemo(()=>{const availableCourses=data?.courses||[];const selectedKeys=new Set(courseFilter.selectedCourseKeys);const map=new Map<string,Course>(availableCourses.map(course=>[course.key,course]));for(const key of selectedKeys){if(!map.has(key)){map.set(key,{key,subjectId:0,teacherId:0,subject:`Ausgewählter Kurs (${key})`,teacher:"In dieser Woche nicht im Stundenplan"})}}return [...map.values()].sort((a,b)=>{const aSelected=selectedKeys.has(a.key)?0:1;const bSelected=selectedKeys.has(b.key)?0:1;return aSelected-bSelected||a.subject.localeCompare(b.subject,"de")||a.teacher.localeCompare(b.teacher,"de")})},[courseFilter.selectedCourseKeys,data?.courses]);
 const normalizedCourseSearch=courseSearch.trim().toLocaleLowerCase("de");
 const visibleCourseOptions=useMemo(()=>courseOptions.filter(course=>!normalizedCourseSearch||`${course.subject} ${course.teacher} ${course.key}`.toLocaleLowerCase("de").includes(normalizedCourseSearch)),[courseOptions,normalizedCourseSearch]);
 function saveFilters(keys:string[],enabled:boolean){const next=normalizeCourseFilter({selectedCourseKeys:keys,filterEnabled:enabled});setCourseFilter(next);try{window.localStorage.setItem(filterStorageKey,serializeCourseFilter(next))}catch{}}
 async function updateOffline(next:boolean){setOfflineEnabled(next);try{window.localStorage.setItem(offlinePreferenceKey,String(next));if(next&&data&&selectedElement)await saveOfflineTimetable(filterStorageId,isoDate(week),selectedElement,data);if(!next)clearOfflineTimetables(filterStorageId)}catch{setOfflineEnabled(false);setError("Der Offline-Speicher ist in diesem Browser nicht verfügbar.")}}
 async function updateNotifications(next:boolean){if(next&&(typeof Notification==="undefined"||await Notification.requestPermission()!=="granted")){setNotificationsEnabled(false);setError("Benachrichtigungen wurden in diesem Browser nicht freigegeben.");return}setNotificationsEnabled(next);try{window.localStorage.setItem(notificationsPreferenceKey,String(next));if(!next)for(let index=window.localStorage.length-1;index>=0;index-=1){const key=window.localStorage.key(index);if(key?.startsWith(`untiplan.change-snapshot.v1.${filterStorageId}.`))window.localStorage.removeItem(key)}}catch{}}
 function deleteCurrentAccountFilter(){setCourseFilter({selectedCourseKeys:[],filterEnabled:false});clearOfflineTimetables(filterStorageId);try{for(let index=window.localStorage.length-1;index>=0;index-=1){const key=window.localStorage.key(index);if(key?.startsWith(`untiplan.change-snapshot.v1.${filterStorageId}.`))window.localStorage.removeItem(key)}window.localStorage.removeItem(filterStorageKey);window.localStorage.removeItem(selectionStorageKey);window.localStorage.removeItem(modeStorageKey);window.localStorage.removeItem(offlinePreferenceKey);window.localStorage.removeItem(notificationsPreferenceKey);window.localStorage.removeItem(LEGACY_COURSE_FILTER_STORAGE_KEY)}catch{}}
 function showCurrentWeek(){const now=previewData?new Date(Math.floor(previewData.range.startDate/10000),Math.floor(previewData.range.startDate%10000/100)-1,previewData.range.startDate%100):new Date();setWeek(mondayFor(now));return now}
 function showToday(){const now=showCurrentWeek();setDay(Math.min(4,Math.max(0,(now.getDay()||1)-1)));setMode("today")}
 async function exportImage(){try{downloadBlob(`untiplan-${isoDate(week)}.png`,await timetablePng(filteredLessons,`Untiplan · ${week.toLocaleDateString("de-DE")}`));setActionMessage("Stundenplanbild wurde erstellt.")}catch(exportError){setError(exportError instanceof Error?exportError.message:"Bild konnte nicht erstellt werden.")}}
 async function openAccounts(){setAccountsOpen(true);setAccountsBusy(true);setAccountsError("");try{const response=await fetch("/api/auth/accounts",{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error);setAccounts(body.accounts||[])}catch(requestError){setAccountsError(requestError instanceof Error?requestError.message:"Konten konnten nicht geladen werden.")}finally{setAccountsBusy(false)}}
 async function switchToAccount(accountId:string){setSwitchingAccountId(accountId);setAccountsError("");try{const response=await fetch("/api/auth/switch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accountId})});const body=await response.json();if(!response.ok)throw new Error(body.error);router.refresh()}catch(requestError){setAccountsError(requestError instanceof Error?requestError.message:"Konto konnte nicht gewechselt werden.");setSwitchingAccountId("")}}
 async function logout(){setLogoutBusy(true);setLogoutError("");try{const response=await fetch("/api/auth/logout",{method:"POST"});const body=await response.json();if(!response.ok)throw new Error();deleteCurrentAccountFilter();if(body.hasActiveAccount)router.refresh();else{router.replace("/login");router.refresh()}}catch{setLogoutError("Das Abmelden hat nicht geklappt. Bitte versuche es erneut.");setLogoutBusy(false)}}
 function openLogout(){setLogoutError("");setLogoutOpen(true)}
 function closeLogout(){if(!logoutBusy)setLogoutOpen(false)}
 return <div className="app-layout"><main className="app-shell">
  <header className="topbar"><a className="brand" href="/stundenplan"><Image className="brand-icon" src="/untiplan-logo.png" alt="" width={36} height={36} priority/><b>Untiplan</b></a><div className="user"><span>{displayName}</span><button className="ghost" onClick={openAccounts} aria-haspopup="dialog">Konten</button><button className="ghost" onClick={openLogout} aria-haspopup="dialog">Konto entfernen</button></div></header>
  <section className="toolbar"><div><p className="eyebrow">Stundenplan</p><h1>{week.toLocaleDateString("de-DE",{day:"2-digit",month:"long"})} – {addDays(week,4).toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"})}</h1>{data?.schoolYear&&<p className="muted">Schuljahr {data.schoolYear}{data.latestImportTime?` · WebUntis-Stand ${new Date(data.latestImportTime).toLocaleString("de-DE")}`:""}</p>}<p className="sync-status" role="status"><span className={isOnline?"online":"offline"}>{isOnline?"Online":"Offline"}</span>{lastUpdated?<span>Aktualisiert {relativeTime(lastUpdated,clock)}</span>:null}{isOfflineData?<b>Gespeicherter Stand</b>:null}</p></div><div className="toolbar-actions">{mode!=="today"&&<><button className="ghost" onClick={()=>setWeek(addDays(week,-7))} aria-label="Vorherige Woche">←</button><button className="ghost" onClick={showCurrentWeek}>Aktuelle Woche</button><button className="ghost" onClick={()=>setWeek(addDays(week,7))} aria-label="Nächste Woche">→</button></>}<button className="ghost refresh-button" onClick={()=>load()} disabled={busy} aria-label="Stundenplan aktualisieren">{busy?"…":"↻"}</button><button className="filter-button" onClick={()=>setFiltersOpen(true)} aria-haspopup="dialog">Optionen{courseFilter.filterEnabled?` (${courseFilter.selectedCourseKeys.length})`:""} {courseFilter.filterEnabled?<span className="dot" aria-hidden="true"/>:null}</button></div></section>
  <nav className="view-tabs" role="tablist" aria-label="Stundenplanansicht"><button role="tab" aria-selected={mode==="today"} className={mode==="today"?"active":""} onClick={showToday}>Heute</button><button role="tab" aria-selected={mode==="week"} className={mode==="week"?"active":""} onClick={()=>setMode("week")}>Woche</button><button role="tab" aria-selected={mode==="day"} className={mode==="day"?"active":""} onClick={()=>setMode("day")}>Tag</button></nav>
  <div className="export-bar"><details className="export-menu"><summary>Ausgeben</summary><div role="menu" aria-label="Stundenplan ausgeben"><button role="menuitem" onClick={event=>{event.currentTarget.closest("details")?.removeAttribute("open");void exportImage()}} disabled={!filteredLessons.length}>Als Bild speichern</button><button role="menuitem" onClick={event=>{event.currentTarget.closest("details")?.removeAttribute("open");window.print()}}>PDF/Drucken</button></div></details></div>{actionMessage&&<p className="action-message" role="status">{actionMessage}</p>}
 {!previewData&&!elementsBusy&&timetableElements.length>0&&<div className="plan-picker" aria-label="Stundenplan auswählen"><label><span>Typ</span><select value={selectedElementType} onChange={event=>{const type=Number(event.target.value) as TimetableElementType;const first=timetableElements.find(element=>element.type===type);if(first){setSelectedElement({type:first.type,id:first.id});setSelected(null)}}}>{([1,2,3,4,5] as TimetableElementType[]).filter(type=>timetableElements.some(element=>element.type===type)).map(type=><option key={type} value={type}>{timetableElementLabels[type]}</option>)}</select></label><label className="plan-element-select"><span>Stundenplan</span><select value={selectedElement?.id||""} onChange={event=>{setSelectedElement({type:selectedElementType,id:Number(event.target.value)});setSelected(null)}}>{elementsForSelectedType.map(element=><option key={element.id} value={element.id}>{timetableElementLabel(element)}</option>)}</select></label></div>}
 {!previewData&&elementsError&&<p className="plan-picker-message error">{elementsError}</p>}
 {!previewData&&!elementsBusy&&!elementsError&&!timetableElements.length&&<p className="plan-picker-message muted">Für dieses Konto wurden keine auswählbaren Stundenpläne freigegeben.</p>}
 {previewData&&<div className="preview-notice"><b>Lokale Vorschau</b><span>Beispieldaten aus der gültigen WebUntis-Antwort · keine echte Abfrage</span></div>}
 {error&&<div className="notice error">{error}<button onClick={()=>load()}>Erneut versuchen</button></div>} {busy||elementsBusy&&!data?<div className="loader">Stundenplan wird geladen …</div>:!previewData&&!selectedElement?<div className="empty">Kein Stundenplan ausgewählt.</div>:mode==="today"?<TodayOverview lessons={todayLessons} date={overviewDate} holidays={previewData||currentWeek?data?.holidays||[]:[]} bounds={timelineBounds} now={new Date(clock)} onSelect={setSelected}/>:mode==="week"?<WeekView week={week} lessonsByDay={lessonsByDay} holidays={data?.holidays||[]} bounds={timelineBounds} now={new Date(clock)} onSelect={setSelected}/>:<><div className="day-tabs" role="tablist" aria-label="Wochentag auswählen">{weekDays.map((label,i)=><button key={label} role="tab" aria-selected={day===i} aria-label={label} className={day===i?"active":""} onClick={()=>setDay(i)}>{label.slice(0,2)}</button>)}</div><div className="day-view"><DayColumn label={weekDays[day]} date={addDays(week,day)} lessons={lessonsByDay[day]} holidays={data?.holidays||[]} bounds={timelineBounds} now={new Date(clock)} onSelect={setSelected}/></div></>}
 {filtersOpen&&data&&<FilterDialog courseFilter={courseFilter} courseOptions={courseOptions} visibleCourseOptions={visibleCourseOptions} courseSearch={courseSearch} setCourseSearch={setCourseSearch} saveFilters={saveFilters} offlineEnabled={offlineEnabled} updateOffline={updateOffline} notificationsEnabled={notificationsEnabled} updateNotifications={updateNotifications} close={()=>setFiltersOpen(false)}/>}
  {selected&&<LessonDialog lesson={selected} close={()=>setSelected(null)}/>} {accountsOpen&&<AccountDialog accounts={accounts} loading={accountsBusy} switchingAccountId={switchingAccountId} error={accountsError} close={()=>{if(!switchingAccountId)setAccountsOpen(false)}} switchAccount={switchToAccount}/>} {logoutOpen&&<LogoutDialog accountName={displayName} close={closeLogout} confirm={logout} busy={logoutBusy} error={logoutError}/>}</main><SiteFooter /></div> }
