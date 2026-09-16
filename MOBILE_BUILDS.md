# Mobile Apps automatisch erstellen

Untiplan bleibt als Next.js-Anwendung auf dem Server. Die mobilen Apps sind kleine
Hüllen, die ausschließlich `https://untiplan.timonring.dev` öffnen:

- Android verwendet die vorhandene Trusted Web Activity (TWA).
- iOS verwendet eine native SwiftUI-App mit `WKWebView`.

Der GitHub-Workflow `.github/workflows/mobile-build.yml` läuft bei jedem Push auf
`main` sowie manuell über **GitHub → Actions → Mobile Apps erstellen → Run workflow**.
Nach einem erfolgreichen Lauf liegen die Downloads unten auf der Workflow-Seite
unter **Artifacts**. Sie werden 14 Tage aufbewahrt.

## Dauerhafte Downloads über GitHub Releases

Ein Git-Tag, dessen Name mit `v` beginnt, baut beide Apps und veröffentlicht die
Ergebnisse zusätzlich dauerhaft unter **GitHub → Releases**. Der Tag muss das
Format `vHAUPTVERSION.NEBENVERSION.KORREKTUR` verwenden, beispielsweise:

```powershell
git add .
git commit -m "Mobile Builds und Releases einrichten"
git push origin main
git tag v1.0.0
git push origin v1.0.0
```

Das Release enthält je nach Signierung `Untiplan.apk` oder
`Untiplan-test.apk`, optional `Untiplan.aab`, `Untiplan-unsigned.ipa` und eine
`SHA256SUMS.txt`. Ohne Android-Signierungs-Secrets wird es als **Pre-release**
gekennzeichnet. Derselbe Tag darf nicht für eine neue Version wiederverwendet
werden; für die nächste Version beispielsweise `v1.0.1` erstellen.

## Android

Ohne weitere Konfiguration erzeugt der Workflow `Untiplan-test.apk`. Diese Datei
ist sofort installierbar, aber nur zum Testen gedacht. GitHub erzeugt den
Debug-Schlüssel auf jedem Runner neu; deshalb muss eine vorhandene Testversion vor
der Installation eines späteren Builds unter Umständen deinstalliert werden. Da
dieser wechselnde Schlüssel nicht in den Digital Asset Links der Website stehen
kann, öffnet Android die Testversion normalerweise mit Browser-Bedienelementen.
Für die echte randlose TWA ist die stabile Release-Signierung erforderlich.

Für stabile Updates und Google Play wird einmalig ein eigener Android-Schlüssel
benötigt. Er darf niemals im Repository liegen. Wenn alle folgenden
Repository-Secrets gesetzt sind, erzeugt der Workflow stattdessen automatisch eine
signierte `Untiplan.apk` und eine `Untiplan.aab`:

| Secret | Inhalt |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Keystore-Datei als Base64-Text |
| `ANDROID_KEYSTORE_PASSWORD` | Passwort des Keystores |
| `ANDROID_KEY_ALIAS` | Alias des Schlüssels |
| `ANDROID_KEY_PASSWORD` | Passwort des Schlüssels |

In PowerShell lässt sich eine vorhandene Keystore-Datei ohne Zeilenumbrüche so
kodieren:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\sicher\untiplan.keystore"))
```

Den ausgegebenen Text in GitHub unter **Settings → Secrets and variables →
Actions → New repository secret** speichern. Den Keystore und seine Passwörter
zusätzlich offline sichern. Ohne diese Sicherung können später keine Updates mit
derselben App-Identität veröffentlicht werden.

## iPhone und iPad ohne eigenen Mac

Der iOS-Job läuft auf einem von GitHub bereitgestellten Mac und erzeugt
`Untiplan-unsigned.ipa`. Das ist eine echte kompilierte iOS-App, aber noch nicht
von Apple signiert. Sie kann unter Windows beispielsweise mit AltStore Classic
oder Sideloadly für das eigene Gerät signiert und installiert werden.

Bei einem kostenlosen Apple-Konto läuft das dabei erzeugte Provisioning Profile
nach sieben Tagen ab. Die App muss dann über das jeweilige Sideloading-Werkzeug
erneuert werden. Für TestFlight oder den App Store werden eine kostenpflichtige
Apple-Developer-Mitgliedschaft sowie Apple-Zertifikat und Provisioning Profile
benötigt; diese können später als GitHub-Secrets in einen separaten
Distributions-Workflow aufgenommen werden.

## Wichtige Grenzen

- Die Website muss per HTTPS erreichbar sein, damit beide Apps funktionieren.
- Eine reine Web-Hülle kann bei einer öffentlichen App-Store-Prüfung als zu wenig
  eigenständige App-Funktionalität bewertet werden.
- Die iOS-App öffnet Links zu anderen Domains in Safari. Anmeldung, Cookies und
  Sitzungen der Untiplan-Domain bleiben im App-WebView erhalten.
- Die Android-TWA benötigt für den randlosen, verifizierten Betrieb weiterhin
  korrekte Digital Asset Links für das Zertifikat, mit dem die APK/AAB signiert ist.

## IPA unter Windows auf einem iPhone installieren

Die erzeugte IPA ist kompiliert, aber noch nicht von Apple signiert. Eine
Installation ist unter Windows beispielsweise mit AltStore Classic möglich:

1. iTunes und iCloud direkt von Apple installieren. AltStore empfiehlt hier die
   Apple-Downloads und nicht die Microsoft-Store-Ausgaben.
2. AltServer für Windows installieren und als Administrator starten.
3. Das entsperrte iPhone per USB verbinden, dem Computer vertrauen und in iTunes
   die WLAN-Synchronisierung aktivieren.
4. Über das AltServer-Symbol im Infobereich **Install AltStore** und das iPhone
   auswählen. Zur Signierung wird ein Apple-Konto benötigt.
5. Auf dem iPhone unter **Einstellungen → Allgemein → VPN und
   Geräteverwaltung** dem Entwicklerprofil vertrauen.
6. Ab iOS 16 unter **Einstellungen → Datenschutz & Sicherheit →
   Entwicklermodus** den Entwicklermodus einschalten.
7. `Untiplan-unsigned.ipa` aus dem GitHub Release auf das iPhone laden. In
   AltStore unter **My Apps** auf **+** tippen und die IPA auswählen. AltServer
   muss dabei erreichbar sein.

Mit einem kostenlosen Apple-Konto ist die Signatur sieben Tage gültig. AltStore
versucht, sie im selben WLAN regelmäßig zu erneuern; andernfalls in AltStore
**Refresh All** verwenden.
