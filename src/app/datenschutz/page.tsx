import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";
import { getLegalConfig } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzerklärung für Untiplan",
};

export const dynamic = "force-dynamic";

export default function DatenschutzPage() {
  const legal = getLegalConfig();
  const { operator } = legal;
  const emailConfigured = !operator.email.startsWith("[");

  return (
    <LegalShell
      eyebrow="Deine Daten"
      title="Datenschutzerklärung"
      intro="Hier erfährst du verständlich, welche Daten Untiplan verarbeitet und warum. Stand: 25. August 2026."
    >
      <section>
        <h2>1. Verantwortlicher</h2>
        <address>
          <strong>{operator.name}</strong><br />
          {operator.street}<br />
          {operator.postalCode} {operator.city}<br />
          {operator.country}<br />
          E-Mail: {emailConfigured ? <a href={`mailto:${operator.email}`}>{operator.email}</a> : operator.email}
        </address>
      </section>

      <section>
        <h2>2. Bereitstellung und Sicherheit der Website</h2>
        <p>Beim Aufruf der Website werden technisch notwendige Verbindungsdaten verarbeitet. Dazu können IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, übertragene Datenmenge, Referrer sowie Browser- und Betriebssystemangaben gehören. Die Verarbeitung ist erforderlich, um die Website auszuliefern, Angriffe abzuwehren und Fehler zu beheben.</p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt im sicheren und zuverlässigen Betrieb des Angebots. Die Anwendung selbst verwendet keine Reichweitenmessung, Werbung oder Nutzerprofile.</p>
        {legal.hostingProvider ? (
          <p>
            Hosting-Dienstleister: {legal.hostingProvider}
            {legal.hostingPrivacyUrl && <> · <a href={legal.hostingPrivacyUrl} rel="noreferrer">Datenschutzhinweise des Hosting-Dienstleisters</a></>}
          </p>
        ) : (
          <p>Die Anwendung wird auf einer vom Verantwortlichen verwalteten Serverumgebung betrieben. Falls dafür ein externer Hosting-Dienstleister eingesetzt wird, muss dieser hier vor der Veröffentlichung ergänzt werden.</p>
        )}
      </section>

      {legal.useCloudflare && (
        <section>
          <h2>3. Cloudflare</h2>
          <p>Zum sicheren Veröffentlichen der Website wird Cloudflare eingesetzt. Dabei kann Cloudflare insbesondere IP-Adressen, Sicherheitsereignisse und technische Verbindungsdaten verarbeiten. Zweck sind die verschlüsselte Übertragung, die Abwehr missbräuchlicher Zugriffe und die zuverlässige Bereitstellung. Empfänger ist Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA.</p>
          <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt in Sicherheit und Verfügbarkeit. Cloudflare stützt Übermittlungen in die USA auf seine Zertifizierung nach dem EU-US Data Privacy Framework und ergänzend auf EU-Standardvertragsklauseln. Weitere Informationen stehen in der <a href="https://www.cloudflare.com/de-de/privacypolicy/" rel="noreferrer">Datenschutzrichtlinie von Cloudflare</a>.</p>
        </section>
      )}

      <section>
        <h2>{legal.useCloudflare ? "4" : "3"}. Schulsuche</h2>
        <p>Wenn du die Schulsuche verwendest, sendet der Untiplan-Server deinen eingegebenen Suchbegriff an die Schulsuche von WebUntis. Das Ergebnis enthält passende Schulen, Anschriften und WebUntis-Server. Der Suchbegriff und die Ergebnisse werden von Untiplan nicht dauerhaft gespeichert.</p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, weil die Verarbeitung auf deine Anfrage zur Auswahl der Schule erfolgt.</p>
      </section>

      <section>
        <h2>{legal.useCloudflare ? "5" : "4"}. Anmeldung und Stundenplan</h2>
        <p>Für die Anmeldung verarbeitet Untiplan den ausgewählten WebUntis-Server, die Schule, deinen Benutzernamen und dein Passwort. Die Daten werden an das WebUntis-System deiner Schule übermittelt, um die Anmeldung zu prüfen und deinen Stundenplan abzurufen. Dabei werden außerdem deine WebUntis-Personenkennung, dein Anzeigename und Stundenplandaten wie Kurse, Lehrkräfte, Räume, Klassen, Zeiten, Vertretungen und Hinweise verarbeitet.</p>
        <p>Die Zugangsdaten werden auf dem Untiplan-Server mit AES-256-GCM verschlüsselt gespeichert. Der Stundenplan wird bei Bedarf von WebUntis abgerufen und von Untiplan nicht dauerhaft auf dem Server gespeichert. Empfänger der Anmelde- und Abrufdaten ist das ausgewählte WebUntis-System; für dessen Datenverarbeitung gelten zusätzlich die Datenschutzhinweise deiner Schule und von <a href="https://www.untis.at/de/datenschutz" rel="noreferrer">Untis</a>.</p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Ohne diese Daten kann Untiplan den ausdrücklich angeforderten Stundenplan nicht bereitstellen.</p>
      </section>

      <section>
        <h2>{legal.useCloudflare ? "6" : "5"}. Sitzung, lokaler Kursfilter und App-Cache</h2>
        <div className="legal-table-wrap">
          <table>
            <thead>
              <tr><th>Speicher</th><th>Zweck</th><th>Dauer</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>bwu_session</code> (Cookie)</td>
                <td>Sichere Zuordnung deiner Anmeldung; zufälliger Sitzungswert, für JavaScript nicht lesbar</td>
                <td>{legal.sessionDays} Tage oder bis zur Abmeldung</td>
              </tr>
              <tr>
                <td><code>untiplan.course-filter.v1</code> (Local Storage)</td>
                <td>Speichert auf deinem Gerät, welche Kurskennungen du ein- oder ausgeblendet hast</td>
                <td>Bis du den Filter oder die Browserdaten löschst</td>
              </tr>
              <tr>
                <td>Cache Storage</td>
                <td>Speichert öffentliche Seiten, Logo und Programmdateien für die installierbare Web-App; API-Antworten mit Stundenplandaten werden nicht gespeichert</td>
                <td>Bis zur Aktualisierung der App oder zum Löschen der Browserdaten</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Diese Speicherungen sind für die von dir angeforderte Anmeldung, Filterfunktion beziehungsweise App-Bereitstellung erforderlich. Dafür ist nach § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung nötig. Ein Cookie-Banner wird deshalb nicht angezeigt.</p>
      </section>

      <section>
        <h2>{legal.useCloudflare ? "7" : "6"}. Speicherdauer und Löschung</h2>
        <p>Die verschlüsselte Sitzung ist höchstens {legal.sessionDays} Tage nutzbar. Bei der Abmeldung wird sie unmittelbar gelöscht; abgelaufene Sitzungen werden bei der weiteren Sitzungsverwaltung bereinigt. Vorübergehend verarbeitete Stundenplandaten werden nach Beantwortung der jeweiligen Anfrage nicht serverseitig gespeichert. Gesetzliche Aufbewahrungspflichten bleiben unberührt.</p>
      </section>

      <section>
        <h2>{legal.useCloudflare ? "8" : "7"}. Deine Rechte</h2>
        <p>Du hast nach Maßgabe der DSGVO das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Außerdem kannst du dich bei einer Datenschutzaufsichtsbehörde beschweren, insbesondere an deinem Wohnort, Arbeitsplatz oder am Ort des vermuteten Verstoßes.</p>
        <p>Eine ausschließlich automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung und ein Profiling finden nicht statt.</p>
        <p>Für Datenschutzanfragen erreichst du den Verantwortlichen unter {emailConfigured ? <a href={`mailto:${operator.email}`}>{operator.email}</a> : operator.email}.</p>
      </section>
    </LegalShell>
  );
}
