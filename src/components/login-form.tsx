"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SchoolSearchResult } from "@/lib/schools";
import { COURSE_FILTER_STORAGE_KEY } from "@/lib/local-filters";

type SearchResponse = { schools?: SchoolSearchResult[]; error?: string };

export function LoginForm({ addingAccount = false }: { addingAccount?: boolean }) {
  const router = useRouter();
  const listboxId = useId();
  const searchFieldRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<SchoolSearchResult | null>(null);
  const [schools, setSchools] = useState<SchoolSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const search = query.trim();
    if (mode !== "search" || selectedSchool || search.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/schools?q=${encodeURIComponent(search)}`, {
          signal: controller.signal,
        });
        const data = await response.json() as SearchResponse;
        if (!response.ok) throw new Error(data.error || "Schulsuche fehlgeschlagen.");
        const nextSchools = data.schools || [];
        setSchools(nextSchools);
        setActiveIndex(nextSchools.length ? 0 : -1);
        setHasSearched(true);
        setListOpen(true);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setSchools([]);
        setHasSearched(true);
        setSearchError(requestError instanceof Error ? requestError.message : "Schulsuche fehlgeschlagen.");
        setListOpen(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mode, query, selectedSchool]);

  useEffect(() => {
    function closeResultsOnOutsidePress(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !searchFieldRef.current?.contains(target)) setListOpen(false);
    }

    document.addEventListener("pointerdown", closeResultsOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeResultsOnOutsidePress);
  }, []);

  function selectSchool(school: SchoolSearchResult) {
    setSelectedSchool(school);
    setQuery(school.displayName);
    setSchools([]);
    setListOpen(false);
    setActiveIndex(-1);
    setSearching(false);
    setHasSearched(false);
    setError("");
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setListOpen(false);
      return;
    }
    if (!schools.length || !listOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % schools.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => (index <= 0 ? schools.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSchool(schools[activeIndex]);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "search" && !selectedSchool) {
      setError("Bitte wähle deine Schule aus den Suchergebnissen aus.");
      return;
    }

    setBusy(true);
    setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Anmeldung fehlgeschlagen.");
      if (addingAccount) {
        try { window.localStorage.removeItem(COURSE_FILTER_STORAGE_KEY); } catch {}
      }
      router.replace("/stundenplan");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      {mode === "search" ? (
        <div
          ref={searchFieldRef}
          className="school-search-field"
          onBlur={event => {
            const searchField = event.currentTarget;
            window.setTimeout(() => {
              if (!searchField.contains(document.activeElement)) setListOpen(false);
            }, 0);
          }}
        >
          <label htmlFor="school-search">Schule suchen</label>
          <div className="school-search-input-wrap">
            <input
              id="school-search"
              value={query}
              placeholder="Schulname, Ort oder Adresse"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={listOpen}
              aria-controls={listboxId}
              aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
              onChange={event => {
                setQuery(event.target.value);
                setSelectedSchool(null);
                setSchools([]);
                setSearching(false);
                setHasSearched(false);
                setListOpen(false);
                setActiveIndex(-1);
                setError("");
              }}
              onFocus={() => {
                if (!selectedSchool && query.trim().length >= 2 && hasSearched) setListOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              required
            />
            {searching && <span className="search-spinner" aria-label="Schule wird gesucht" />}
          </div>
          <small className="school-search-hint">Tippe mindestens zwei Zeichen und wähle deine Schule aus.</small>

          {selectedSchool && (
            <div className="selected-school" aria-live="polite">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>{selectedSchool.displayName}</strong>
                <small>{selectedSchool.address || selectedSchool.server}</small>
              </div>
            </div>
          )}

          {listOpen && !selectedSchool && (
            <div className="school-results-panel">
              {schools.length > 0 ? (
                <ul id={listboxId} role="listbox" aria-label="Gefundene Schulen">
                  {schools.map((school, index) => (
                    <li key={`${school.id}:${school.loginName}`} role="presentation">
                      <button
                        id={`${listboxId}-${index}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === index}
                        className={activeIndex === index ? "active" : undefined}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectSchool(school)}
                      >
                        <strong>{school.displayName}</strong>
                        <small>{school.address || school.server}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : hasSearched && !searching ? (
                <p>{searchError || "Keine passende Schule gefunden."}</p>
              ) : null}
            </div>
          )}

          {selectedSchool && (
            <>
              <input type="hidden" name="server" value={selectedSchool.server} />
              <input type="hidden" name="school" value={selectedSchool.loginName} />
            </>
          )}
        </div>
      ) : (
        <div className="manual-school-fields">
          <label>
            WebUntis-Server
            <input name="server" placeholder="mese.webuntis.com" autoCapitalize="none" required />
          </label>
          <label>
            Schule
            <input name="school" placeholder="Name oder Kürzel der Schule" required />
          </label>
        </div>
      )}

      <button
        className="manual-toggle"
        type="button"
        onClick={() => {
          setMode(current => current === "search" ? "manual" : "search");
          setError("");
          setSearchError("");
          setSchools([]);
          setSearching(false);
          setHasSearched(false);
          setListOpen(false);
          setActiveIndex(-1);
        }}
      >
        {mode === "search" ? "Schule nicht gefunden? Serverdaten manuell eingeben" : "Zurück zur Schulsuche"}
      </button>

      <div className="form-grid">
        <label>
          Benutzername
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          Passwort
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>
        {busy ? "Verbindung wird geprüft …" : addingAccount ? "Konto hinzufügen" : "Sicher anmelden"}
      </button>
      <small>Deine Zugangsdaten werden ausschließlich verschlüsselt auf diesem Server gespeichert.</small>
    </form>
  );
}
