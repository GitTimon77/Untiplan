import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>Untiplan</span>
      <nav aria-label="Rechtliche Informationen">
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/daten-loeschen">Daten löschen</Link>
      </nav>
    </footer>
  );
}
