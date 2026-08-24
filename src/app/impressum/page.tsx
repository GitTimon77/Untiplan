import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";
import { getLegalConfig } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung und Kontakt für Untiplan",
};

export const dynamic = "force-dynamic";

export default function ImpressumPage() {
  const legal = getLegalConfig();
  const { operator } = legal;
  const emailConfigured = !operator.email.startsWith("[");

  return (
    <LegalShell
      eyebrow="Rechtliches"
      title="Impressum"
      intro="Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG)."
    >
      <section>
        <h2>Diensteanbieter</h2>
        <address>
          <strong>{operator.name}</strong><br />
          {operator.street}<br />
          {operator.postalCode} {operator.city}<br />
          {operator.country}
        </address>
      </section>

      {legal.representative && (
        <section>
          <h2>Vertretungsberechtigte Person</h2>
          <p>{legal.representative}</p>
        </section>
      )}

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: {emailConfigured ? <a href={`mailto:${operator.email}`}>{operator.email}</a> : operator.email}
        </p>
      </section>

      {(legal.register || legal.registerNumber) && (
        <section>
          <h2>Registereintrag</h2>
          <p>{[legal.register, legal.registerNumber].filter(Boolean).join(", ")}</p>
        </section>
      )}

      {legal.vatId && (
        <section>
          <h2>Umsatzsteuer-ID</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {legal.vatId}</p>
        </section>
      )}

      <section>
        <h2>Hinweis zum Angebot</h2>
        <p>Untiplan ist eine unabhängige Anwendung und kein Angebot der Untis GmbH. WebUntis und Untis sind Kennzeichen ihrer jeweiligen Rechteinhaber.</p>
        <p>Die verbindlichen Stundenplaninformationen stellt die jeweilige Schule in WebUntis bereit. Bei Abweichungen sind die Angaben der Schule beziehungsweise das originale WebUntis-Angebot maßgeblich.</p>
      </section>
    </LegalShell>
  );
}
