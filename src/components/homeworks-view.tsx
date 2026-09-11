"use client";

import { useMemo, useState } from "react";
import type { Homework } from "@/lib/types";
import { fromUntisDate, toUntisDate } from "@/lib/date";

type HomeworkFilter = "open" | "completed" | "all";

function formatDate(value: number) {
  return fromUntisDate(value).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function dueLabel(homework: Homework, today: number) {
  if (homework.completed) return "Erledigt";
  const days = Math.round((fromUntisDate(homework.dueDate).getTime() - fromUntisDate(today).getTime()) / 86400000);
  if (days < 0) return days === -1 ? "Seit gestern fällig" : `Seit ${Math.abs(days)} Tagen fällig`;
  if (days === 0) return "Heute fällig";
  if (days === 1) return "Morgen fällig";
  return `Fällig ${formatDate(homework.dueDate)}`;
}

export function HomeworksView({ homeworks, busy, error, sourceUrl, today, retry }: { homeworks: Homework[]; busy: boolean; error: string; sourceUrl: string; today: Date; retry: () => void }) {
  const [filter, setFilter] = useState<HomeworkFilter>("open");
  const [search, setSearch] = useState("");
  const todayNumber = toUntisDate(today);
  const openCount = homeworks.filter(homework => !homework.completed).length;
  const overdueCount = homeworks.filter(homework => !homework.completed && homework.dueDate < todayNumber).length;
  const normalizedSearch = search.trim().toLocaleLowerCase("de");
  const visibleHomeworks = useMemo(() => homeworks.filter(homework => {
    if (filter === "open" && homework.completed) return false;
    if (filter === "completed" && !homework.completed) return false;
    return !normalizedSearch || `${homework.subject} ${homework.teacher} ${homework.text}`.toLocaleLowerCase("de").includes(normalizedSearch);
  }), [filter, homeworks, normalizedSearch]);

  return <section className="homeworks-view" aria-labelledby="homeworks-heading">
    <div className="homeworks-head">
      <div><p className="eyebrow">WebUntis</p><h2 id="homeworks-heading">Hausaufgaben</h2><p className="muted">Aufgaben und Fälligkeiten auf einen Blick</p></div>
      <div className="homeworks-count" aria-label={`${openCount} offene Hausaufgaben${overdueCount ? `, ${overdueCount} überfällig` : ""}`}><b>{openCount}</b><span>{openCount === 1 ? "offene Aufgabe" : "offene Aufgaben"}</span>{overdueCount > 0 && <em>{overdueCount} überfällig</em>}</div>
    </div>
    <div className="homeworks-controls">
      <div className="homeworks-filters" role="group" aria-label="Hausaufgaben filtern">
        <button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Offen <span>{openCount}</span></button>
        <button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>Erledigt</button>
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Alle</button>
      </div>
      <label className="homeworks-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Fach oder Aufgabe suchen" aria-label="Hausaufgaben durchsuchen" /></label>
    </div>
    {error && <div className="homeworks-error" role="alert"><span>{error}</span><button onClick={retry}>Erneut versuchen</button></div>}
    {busy && !homeworks.length ? <div className="homeworks-state">Hausaufgaben werden geladen …</div>
      : !homeworks.length && !error ? <div className="homeworks-state"><b>Keine Hausaufgaben</b><span>WebUntis enthält für diesen Zeitraum keine Aufgaben.</span></div>
      : !visibleHomeworks.length ? <div className="homeworks-state"><b>Keine passenden Aufgaben</b><span>Ändere den Filter oder den Suchbegriff.</span></div>
      : <div className="homeworks-list">{visibleHomeworks.map(homework => {
        const overdue = !homework.completed && homework.dueDate < todayNumber;
        return <article className={`homework-card${homework.completed ? " completed" : overdue ? " overdue" : ""}`} key={homework.id}>
          <div className="homework-date" aria-hidden="true"><span>{fromUntisDate(homework.dueDate).toLocaleDateString("de-DE", { month: "short" })}</span><b>{fromUntisDate(homework.dueDate).toLocaleDateString("de-DE", { day: "2-digit" })}</b></div>
          <div className="homework-body">
            <div className="homework-meta"><strong>{homework.subject}</strong><span className="homework-status">{dueLabel(homework, todayNumber)}</span></div>
            <p>{homework.text}</p>
            <div className="homework-details">
              {homework.teacher && <span>Lehrkraft: {homework.teacher}</span>}
              {homework.assignedDate !== homework.dueDate && <span>Aufgegeben: {formatDate(homework.assignedDate)}</span>}
              {homework.attachmentCount > 0 && <span>{homework.attachmentCount === 1 ? "1 Anhang" : `${homework.attachmentCount} Anhänge`}</span>}
            </div>
          </div>
        </article>;
      })}</div>}
    {sourceUrl && <a className="homeworks-source" href={sourceUrl} target="_blank" rel="noreferrer">Hausaufgaben in WebUntis öffnen</a>}
  </section>;
}
