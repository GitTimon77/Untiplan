# BetterWebUntis Web

Eine eigenständige Next.js-WebApp/PWA für WebUntis. Der Browser spricht ausschließlich mit dieser Anwendung; alle WebUntis-JSON-RPC-Aufrufe und die `JSESSIONID` bleiben auf dem Server.

## Enthalten

- sichere Anmeldung über `authenticate` und serverseitige WebUntis-Aufrufe
- zufällige, `HttpOnly`-/`SameSite`-geschützte App-Sitzung
- AES-256-GCM-verschlüsselte WebUntis-Zugangsdaten im persistenten Server-Volume
- Wochen- und Tagesstundenplan, Unterrichtsdetails und Ferieninformationen
- Kennzeichnung von Ausfall, Vertretung, unregelmäßigem Unterricht und Veranstaltungen
- automatische Kursliste aus Fach plus ursprünglicher Lehrkraft (`subjectId-teacher.orgid|id`)
- dauerhaft gespeicherte, pro Sitzung getrennte Kursfilter
- responsive Oberfläche, Dark Mode, Web-App-Manifest und Service Worker
- Docker Compose, Healthcheck und optionaler Cloudflare-Tunnel

## Lokal starten

Voraussetzungen: Node.js 20.9 oder neuer.

```bash
cp .env.example .env
# SESSION_SECRET in .env durch mindestens 32 zufällige Zeichen ersetzen
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen. Für einen Secret-Wert eignet sich beispielsweise `openssl rand -base64 48`.

## Ubuntu/Docker

```bash
git clone <dein-repository> better-webuntis-web
cd better-webuntis-web
cp .env.example .env
openssl rand -base64 48
# Ausgabe als SESSION_SECRET in .env eintragen
docker compose up -d --build app
docker compose ps
```

Die App lauscht absichtlich nur auf `127.0.0.1:3000`; sie ist damit nicht direkt aus dem Internet erreichbar. Daten liegen im Docker-Volume `betterwebuntis_data`.

## Cloudflare Tunnel

Variante A: Bei einem bereits auf dem Host eingerichteten Tunnel zeigt der Ingress auf `http://localhost:3000`.

Variante B: Im Cloudflare-Zero-Trust-Dashboard einen Tunnel und einen öffentlichen Hostnamen anlegen. Als Dienst-URL `http://app:3000` wählen, den Tunnel-Token als `CLOUDFLARE_TUNNEL_TOKEN` in `.env` speichern und starten:

```bash
docker compose --profile tunnel up -d --build
```

Cloudflare übernimmt TLS. Der Sitzungs-Cookie wird im Produktionscontainer automatisch mit `Secure` gesetzt.

## Wartung und Prüfungen

```bash
npm run typecheck
npm test
npm run build
docker compose logs -f app
docker compose pull cloudflared && docker compose --profile tunnel up -d --build
```

Das Healthcheck-Ziel ist `/api/health`. Ein Backup des Docker-Volumes sichert Sitzungen und Filter. Nach einer Änderung von `SESSION_SECRET` sind bereits verschlüsselte Sitzungen nicht mehr lesbar; Benutzer müssen sich neu anmelden. Das Secret deshalb sicher sichern und nicht ins Repository einchecken.

## Sicherheitsgrenzen der ersten Version

Der Dateispeicher ist für eine einzelne App-Instanz gedacht. Für mehrere parallel laufende Replikate sollte er durch PostgreSQL/Redis mit zentralem Session- und Filterstore ersetzt werden. Die Zieladresse akzeptiert ausschließlich WebUntis-Hostnamen und verwendet HTTPS. Zusätzlich sollten Ubuntu, Docker und `cloudflared` regelmäßig aktualisiert sowie Cloudflare Access erwogen werden, wenn nur ein begrenzter Nutzerkreis Zugriff erhalten soll.
