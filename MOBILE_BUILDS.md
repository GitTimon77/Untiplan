# Mobile Apps automatisch erstellen

Untiplan bleibt als Next.js-Anwendung auf dem Server. Die mobilen Apps sind kleine
Hüllen, die ausschließlich `https://untiplan.timonring.dev` öffnen:

- Android verwendet die vorhandene Trusted Web Activity (TWA).
- iOS verwendet eine native SwiftUI-App mit `WKWebView`.

Der GitHub-Workflow `.github/workflows/mobile-build.yml` läuft bei jedem Push auf
`main` sowie manuell über **GitHub → Actions → Mobile Apps erstellen → Run workflow**.
Nach einem erfolgreichen Lauf liegen die Downloads unten auf der Workflow-Seite
unter **Artifacts**. Sie werden 14 Tage aufbewahrt.

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
