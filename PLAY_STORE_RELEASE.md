# Google-Play-Veröffentlichung von Untiplan

Stand der Prüfung: 26. August 2026. Diese Datei ist die projektspezifische Arbeitsunterlage für die erste Veröffentlichung. Maßgeblich bleiben die jeweils aktuellen Texte von Google Play und eine rechtliche Prüfung des tatsächlichen Betriebs.

## Technische Veröffentlichungsform

Untiplan ist eine PWA. Für Google Play wird sie als **Trusted Web Activity (TWA)** verpackt. Die Android-Hülle zeigt ausschließlich die eigene, per Digital Asset Links bestätigte Untiplan-Domain. Das ist gegenüber einer selbstgebauten WebView vorzuziehen und weist nach, dass Website und Android-App demselben Betreiber gehören.

Vor dem Erzeugen der Android-App werden drei endgültige Angaben benötigt:

- öffentliche HTTPS-Startadresse der produktiven Untiplan-Instanz;
- endgültiger, später nicht mehr änderbarer Paketname (vorbereitet: `de.untiplan.app`);
- Upload-/App-Signing-Zertifikat und dessen SHA-256-Fingerabdruck.

Die PWA-Seite ist vorbereitet:

- Manifest mit 192-, 512- und Maskable-Icon;
- `standalone`-Darstellung, Start-URL und Theme-Farben;
- Offline-App-Shell ohne Caching privater API-Antworten;
- öffentliche Datenschutz-, Impressums- und Löschseiten;
- `/.well-known/assetlinks.json`, konfiguriert über `ANDROID_PACKAGE_NAME` und `ANDROID_SHA256_CERT_FINGERPRINTS`;
- produktionsfähige Demo unter `/vorschau`, damit die Play-Prüfung keine echten Schülerdaten oder Schulzugänge benötigt.

### Android App Bundle erzeugen

Nach Festlegung der produktiven URL:

1. Die produktive PWA bereitstellen und `https://DEINE-DOMAIN/manifest.webmanifest` prüfen.
2. Die offizielle Bubblewrap-CLI verwenden: `npx @bubblewrap/cli init --manifest=https://DEINE-DOMAIN/manifest.webmanifest`.
3. Paketname `de.untiplan.app`, Anzeigename `Untiplan`, Startpfad `/` und mindestens Android 8 (API 26) wählen.
4. Im erzeugten Android-Projekt `compileSdk` und `targetSdk` auf **36** setzen. Ab 31. August 2026 müssen neue Apps und Updates Android 16/API 36 oder höher anvisieren.
5. Mit `npx @bubblewrap/cli build` ein signiertes Android App Bundle (`.aab`) erzeugen. Keystore und Passwörter niemals einchecken.
6. Den SHA-256-Fingerabdruck des Upload-Zertifikats zunächst in `ANDROID_SHA256_CERT_FINGERPRINTS` eintragen und die Website neu bereitstellen.
7. Nach Aktivierung von Play App Signing zusätzlich den Fingerabdruck des **App-Signing-Zertifikats aus Play Console → App-Integrität** eintragen. Beide Werte dürfen kommasepariert vorhanden sein.
8. `https://DEINE-DOMAIN/.well-known/assetlinks.json` öffentlich, ohne Login und ohne Weiterleitung testen. Erst danach das `.aab` in einen internen Test hochladen.

Der lokale Rechner hat derzeit Java, aber noch kein Android SDK. Das eigentliche `.aab` wird daher erst nach Festlegung der Domain sowie Installation von Android Studio/SDK erzeugt.

## Play-Console-Angaben

### Store-Eintrag (Deutsch)

**App-Name (max. 30 Zeichen)**  
Untiplan

**Kurzbeschreibung (max. 80 Zeichen)**  
Dein WebUntis-Stundenplan mit Änderungen, Filtern und sicherem Offline-Modus

**Vollständige Beschreibung**

Untiplan macht deinen WebUntis-Stundenplan schnell und übersichtlich verfügbar.

Sieh auf einen Blick, was heute ansteht, wechsle zwischen Tages- und Wochenansicht und erkenne Ausfälle, Vertretungen, Raumänderungen und Veranstaltungen. Kursfilter helfen dir, nur die für dich wichtigen Unterrichtseinheiten anzuzeigen.

Auf Wunsch speichert Untiplan bereits geladene Wochen verschlüsselt auf deinem Gerät. So bleibt dein letzter Stundenplan auch ohne Verbindung verfügbar. Änderungen können lokal als Benachrichtigung erscheinen. Mehrere WebUntis-Konten lassen sich getrennt hinzufügen und wechseln.

Weitere Funktionen:

- Heute-, Tages- und Wochenansicht
- Anzeige von Ferien und Aktualisierungsstand
- Bildexport, Drucken und PDF-Ausgabe
- verschlüsselter Offline-Speicher nach ausdrücklicher Aktivierung
- keine Werbung und kein Tracking

Für Live-Daten brauchst du ein vorhandenes WebUntis-Konto deiner Schule. Untiplan ist eine unabhängige Anwendung und kein Angebot der Untis GmbH. Bei Abweichungen sind die Angaben deiner Schule und das originale WebUntis-Angebot maßgeblich.

**Kategorie und Tags**  
App → Bildung; passende Tags: Schule, Stundenplan, Produktivität.

**Kontakt**  
Die Support-E-Mail muss mit `LEGAL_EMAIL` und dem öffentlich sichtbaren Datenschutzkontakt übereinstimmen. Website: produktive Untiplan-Startseite. Datenschutz-URL: `https://DEINE-DOMAIN/datenschutz`. Datenlöschungs-URL: `https://DEINE-DOMAIN/daten-loeschen`.

### App-Inhalte

- **Werbung:** Nein.
- **App-Zugriff:** Teile der App benötigen ein bestehendes WebUntis-Konto. Prüfer öffnen auf der Loginseite „Ohne Anmeldung mit Beispieldaten ansehen“. Die Demo enthält ausschließlich synthetische Daten und zeigt Stundenplan, Ansichten, Änderungen, Filter, Offline-Optionen und Export. Live-Abrufe, echtes Kontowechseln und echte Benachrichtigungen benötigen ein WebUntis-Konto.
- **Content Rating:** Fragebogen wahrheitsgemäß als Bildungs-/Produktivitäts-App ohne Gewalt, Sexualität, Glücksspiel, Drogen, nutzergenerierte öffentliche Inhalte oder Kommunikation ausfüllen. Die endgültige Einstufung erzeugt IARC.
- **News-App:** Nein.
- **Gesundheit, Finanzen, Regierung, VPN:** Nein.
- **Berechtigungen:** Die TWA soll keine Standort-, Kamera-, Mikrofon-, Kontakt-, SMS-, Anruflisten-, Datei- oder Werbe-ID-Berechtigung deklarieren. Browser-Benachrichtigungen werden erst nach einer ausdrücklichen Nutzeraktion angefragt.
- **Kontolöschung:** Untiplan erstellt kein eigenes Konto, speichert aber Sitzungen für bestehende WebUntis-Konten. Aus Vorsicht sind sowohl ein In-App-Löschweg als auch die öffentliche Löschseite vorhanden. Das Entfernen löscht die Untiplan-Sitzung, verschlüsselte Zugangsdaten und lokale Kontodaten, nicht das externe WebUntis-Konto.

### Zielgruppe – Entscheidung vor Einreichung erforderlich

Die App ist für Schüler gedacht, weshalb die Altersauswahl nicht künstlich auf Erwachsene beschränkt werden sollte. Wer Altersgruppen auswählt, die nach lokalem Recht Kinder umfassen, muss zusätzlich die Families-Richtlinie erfüllen. Untiplan enthält zwar keine Werbung oder Analyse-SDKs, überträgt aber für die Kernfunktion Anmeldedaten und Schuldaten an das vom Nutzer gewählte WebUntis-System. Vor Veröffentlichung muss der Betreiber deshalb entscheiden und rechtlich prüfen, ob die Verteilung Kinder einschließt und ob die WebUntis-Anbindung die dann geltenden Families-Anforderungen erfüllt. Diese Entscheidung kann nicht aus dem Quellcode abgeleitet werden.

## Data Safety – projektspezifischer Entwurf

Die Antworten müssen nochmals gegen die reale Hosting-Konfiguration, Cloudflare-Einstellungen und das endgültige TWA-Paket geprüft werden.

- **Werden Daten erhoben?** Ja.
- **Werden Daten verschlüsselt übertragen?** Ja; Produktion muss ausschließlich HTTPS verwenden, ebenso alle WebUntis-Aufrufe.
- **Können Nutzer eine Löschung verlangen?** Ja; In-App-Löschung und `/daten-loeschen`.
- **Werbung/Analytics:** Nein.
- **Name:** erhoben, erforderlich, Zweck App-Funktion/Kontoverwaltung; der WebUntis-Anzeigename liegt bis zur Löschung oder maximal für die konfigurierte Sitzungsdauer auf dem Untiplan-Server.
- **User IDs:** erhoben, erforderlich, Zweck App-Funktion/Kontoverwaltung; Benutzername und WebUntis-Personenkennung.
- **Sonstige personenbezogene Informationen:** vorsorglich als erhoben prüfen, da Schule, Klasse und Stundenplaninhalte verarbeitet werden. Serverseitig werden Stundenplanantworten nur vorübergehend verarbeitet; lokaler Offline-Speicher ist optional und verschlüsselt.
- **Geräte- oder andere IDs:** anhand der tatsächlichen Cloudflare-/Hosting-Protokolle prüfen. IP-Adressen und Sicherheitsereignisse können vom Infrastrukturbetreiber verarbeitet werden; es gibt keine Werbe-ID oder selbst erzeugte Geräte-ID.
- **App-Aktivität:** nicht zu Analytics-Zwecken erhoben. Filter und Optionen bleiben lokal auf dem Gerät.
- **Weitergabe:** mit juristischer/Play-Definition prüfen. Daten gehen funktionsbedingt an den ausgewählten WebUntis-Dienst und Infrastruktur-Dienstleister. Ob dies als „Sharing“ oder als von Google definierte Ausnahme für Dienstleister beziehungsweise nutzerinitiierte Übertragung einzutragen ist, hängt von Verträgen und tatsächlicher Rolle des Betreibers ab. Nicht pauschal „keine Weitergabe“ auswählen, ohne dies geprüft zu haben.

## Prüf- und Veröffentlichungsablauf

1. Echte Betreiberangaben in allen `LEGAL_*`-Variablen setzen; Platzhalter führen zu einer nicht veröffentlichungsfähigen Datenschutzerklärung und einem unvollständigen Impressum.
2. Öffentliche Domain, Paketname und Zielgruppe endgültig festlegen.
3. PWA bereitstellen; Manifest, Service Worker, Datenschutz, Löschseite und Asset Links über HTTPS testen.
4. Store-Icon (512 × 512), Feature Graphic (1024 × 500) und mindestens zwei echte App-Screenshots hochladen. Für bessere Sichtbarkeit empfiehlt Google vier Screenshots mit mindestens 1080 px Auflösung.
5. App in Play Console anlegen, kostenfrei, Standardsprache Deutsch, Play App Signing aktivieren.
6. Store-Eintrag, Kontakt, Datenschutz, App-Zugriff, Werbung, Zielgruppe, IARC-Inhaltsbewertung und Data Safety vollständig ausfüllen.
7. API-36-App-Bundle in den internen Test hochladen; Pre-Launch-Report auf mehreren Android-Versionen und Bildschirmgrößen auswerten.
8. Digital Asset Links mit dem Play-App-Signing-Fingerabdruck aktualisieren und prüfen, dass in der TWA keine Browser-Adressleiste erscheint.
9. Geschlossenen Test durchführen. Bei persönlichen Entwicklerkonten, die nach dem 13. November 2023 erstellt wurden, sind mindestens 12 durchgehend angemeldete Tester über 14 Tage nötig; danach Produktionszugang beantragen.
10. Erst nach behobenen Pre-Launch-, Richtlinien- und Barrierefreiheitsproblemen gestuft veröffentlichen. Für die erste Prüfung bis zu sieben Tage oder in Ausnahmefällen länger einplanen.

## Offizielle Quellen

- [Google Play Developer Program Policies](https://support.google.com/googleplay/android-developer/answer/17190352)
- [Ziel-API-Anforderung](https://developer.android.com/google/play/requirements/target-sdk)
- [Trusted Web Activities](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities)
- [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started)
- [App für die Prüfung vorbereiten](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Kontolöschung](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Store-Eintrag anlegen](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Grafiken und Screenshots](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Mindestfunktionalität](https://support.google.com/googleplay/android-developer/answer/9898783)
- [Spam, WebViews und repetitive Inhalte](https://support.google.com/googleplay/android-developer/answer/9899034)
- [Zielgruppe und Kinder](https://support.google.com/googleplay/android-developer/answer/9867159)
- [Testpflicht für neue persönliche Konten](https://support.google.com/googleplay/android-developer/answer/14151465)
