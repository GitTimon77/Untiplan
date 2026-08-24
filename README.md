# Untiplan

Untiplan ist eine eigenständige Next.js-WebApp/PWA für WebUntis. Der Browser spricht ausschließlich mit Untiplan; alle WebUntis-JSON-RPC-Aufrufe und die `JSESSIONID` bleiben auf dem Server.

## Funktionen

- sichere Anmeldung über `authenticate` und serverseitige WebUntis-Aufrufe
- Schulsuche nach Name, Ort oder Adresse mit automatischer Übernahme von Server und Login-Kürzel
- zufällige, `HttpOnly`-/`SameSite`-geschützte App-Sitzung
- AES-256-GCM-verschlüsselte WebUntis-Zugangsdaten im persistenten Server-Volume
- Wochen- und Tagesstundenplan, Unterrichtsdetails und Ferieninformationen
- Kennzeichnung von Ausfall, Vertretung, unregelmäßigem Unterricht und Veranstaltungen
- automatische Kursliste aus Fach plus ursprünglicher Lehrkraft
- dauerhaft gespeicherte, pro Sitzung getrennte Kursfilter
- responsive Oberfläche, Dark Mode, Web-App-Manifest und Service Worker
- Docker Compose, Healthcheck, optionaler Cloudflare-Tunnel und automatisches GitHub-Deployment

## Lokal starten

Voraussetzung ist Node.js 20.19 oder neuer; empfohlen wird Node.js 22.

```bash
cp .env.example .env
openssl rand -base64 48
```

Die Ausgabe als `SESSION_SECRET` in `.env` eintragen. Anschließend:

```bash
npm ci
npm run dev
```

Untiplan ist danach unter `http://localhost:3000` erreichbar. Lokale Sitzungsdaten werden im ignorierten Verzeichnis `data` gespeichert.

## Automatisch auf Ubuntu deployen

Der vollständige Ablauf steht in [DEPLOYMENT.md](DEPLOYMENT.md). Er umfasst:

1. Docker und einen eigenen Deployment-Benutzer auf Ubuntu einrichten.
2. Dem Server read-only Zugriff auf das GitHub-Repository geben.
3. `.env` und das dauerhafte Daten-Volume auf dem Server anlegen.
4. einen separaten SSH-Schlüssel für GitHub Actions hinterlegen.
5. den SSH-Hostnamen und Service-Token in Cloudflare Access einrichten.
6. die sieben benötigten Secrets im GitHub-Environment `production` speichern.
7. mit dem enthaltenen Workflow bei jedem Push auf `main` testen und deployen.

Der Workflow in `.github/workflows/deploy.yml` führt Lint, Typprüfung, Tests und Produktions-Build aus. Danach deployt er exakt den geprüften Commit per SSH über Cloudflare Access. Der Compose-Healthcheck muss erfolgreich sein; andernfalls wird automatisch der zuvor laufende Commit wiederhergestellt.

## Docker manuell starten

```bash
cp .env.example .env
# SESSION_SECRET in .env ersetzen
docker compose build --pull app
docker compose up -d --wait --wait-timeout 180 app
docker compose ps
```

Der Container lauscht intern auf Port 3000 und wird standardmäßig nur unter `127.0.0.1:3002` veröffentlicht. Bind-Adresse und Host-Port lassen sich mit `APP_BIND_ADDRESS` und `APP_PORT` in `.env` ändern. Für öffentlichen Zugriff wird ein Reverse Proxy oder der optionale Cloudflare-Tunnel benötigt. Die Sitzungs- und Filterdaten liegen dauerhaft im Volume `untiplan_data`.

## Cloudflare Tunnel

Bei einem auf dem Host eingerichteten Tunnel zeigt der Ingress standardmäßig auf `http://localhost:3002`.

Läuft ein bereits vorhandener Tunnel in einem separaten Docker-Container, kann in `.env` beispielsweise `APP_BIND_ADDRESS=192.168.178.11` gesetzt werden. Die Cloudflare-Dienst-URL lautet dann `http://192.168.178.11:3002`.

Alternativ kann der Compose-Dienst verwendet werden. Im Cloudflare-Zero-Trust-Dashboard muss die Dienst-URL dann `http://app:3000` lauten. Den Tunnel-Token als `CLOUDFLARE_TUNNEL_TOKEN` in `.env` eintragen und anschließend starten:

```bash
docker compose --profile tunnel up -d --wait --wait-timeout 180
```

## Wartung

```bash
npm run lint
npm run typecheck
npm test
npm run build
docker compose logs -f app
```

Das Healthcheck-Ziel ist `/api/health`. Eine Änderung von `SESSION_SECRET` macht bereits verschlüsselte Sitzungen unlesbar; das Secret sollte daher gesichert und niemals eingecheckt werden.

## Sicherheitsgrenzen

Der Dateispeicher ist für eine einzelne App-Instanz gedacht. Für mehrere parallele Replikate sollte er durch PostgreSQL oder Redis mit zentralem Session- und Filterstore ersetzt werden. Die Zieladresse akzeptiert ausschließlich WebUntis-Hostnamen und verwendet HTTPS. Ubuntu, Docker und `cloudflared` sollten regelmäßig aktualisiert werden. Für einen begrenzten Nutzerkreis empfiehlt sich zusätzlich Cloudflare Access.
