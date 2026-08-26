import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";
import { getLegalConfig } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Daten löschen",
  description: "Untiplan-Konto entfernen und gespeicherte Daten löschen",
};

export const dynamic = "force-dynamic";

export default function DatenLoeschenPage() {
  const { operator } = getLegalConfig();
  const emailConfigured = !operator.email.startsWith("[");

  return (
    <LegalShell
      eyebrow="Kontrolle über deine Daten"
      title="Daten aus Untiplan löschen"
      intro="Du kannst alle von Untiplan zu einem hinzugefügten WebUntis-Konto gespeicherten Daten direkt und ohne Wartezeit löschen."
    >
      <section>
        <h2>Direkt in Untiplan</h2>
        <ol>
          <li>Öffne Untiplan im Browser oder in der installierten Android-App und melde dich an.</li>
          <li>Wähle oben „Konto entfernen“.</li>
          <li>Bestätige mit „Konto und Daten löschen“.</li>
        </ol>
        <p>Damit werden die serverseitige Sitzung einschließlich der verschlüsselten Zugangsdaten sowie die zugehörigen Filter, Benachrichtigungseinstellungen und verschlüsselten Offline-Stundenpläne auf diesem Gerät gelöscht. Weitere ausdrücklich hinzugefügte Konten bleiben erhalten und können einzeln auf dieselbe Weise entfernt werden.</p>
      </section>

      <section>
        <h2>Ohne installierte App</h2>
        <p>Die Löschung funktioniert auch über die öffentlich erreichbare Untiplan-Webseite: Melde dich dort mit dem betroffenen WebUntis-Konto an und führe die oben genannten Schritte aus. Wenn du keinen Zugriff mehr auf das Konto hast, sende eine Löschanfrage mit WebUntis-Server, Schule und Benutzername an {emailConfigured ? <a href={`mailto:${operator.email}?subject=Untiplan%20L%C3%B6schanfrage`}>{operator.email}</a> : operator.email}. Gib niemals dein Passwort in einer E-Mail an.</p>
      </section>

      <section>
        <h2>Was nicht gelöscht wird</h2>
        <p>Untiplan erstellt kein eigenes Benutzerkonto. Die Anmeldung verwendet ein bereits vorhandenes WebUntis-Konto. Das Entfernen aus Untiplan löscht deshalb nicht das WebUntis-Konto und verändert keine Daten im WebUntis-System deiner Schule. Für dessen Löschung oder Berichtigung wendest du dich an deine Schule.</p>
        <p>Technische Sicherheitsprotokolle des Hosters oder von Cloudflare können nach deren eigenen Aufbewahrungsfristen fortbestehen. Gesetzliche Aufbewahrungspflichten bleiben unberührt. Einzelheiten stehen in der <a href="/datenschutz">Datenschutzerklärung</a>.</p>
      </section>
    </LegalShell>
  );
}
