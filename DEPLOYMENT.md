# Untiplan automatisch auf Ubuntu deployen

Diese Anleitung richtet einen einzelnen Ubuntu-Produktionsserver ein. Danach löst jeder Push auf den Branch `main` folgenden Ablauf aus:

1. GitHub Actions installiert die npm-Abhängigkeiten.
2. Lint, Typprüfung, Tests und Produktions-Build müssen erfolgreich sein.
3. GitHub Actions verbindet sich per SSH über Cloudflare Access mit dem Ubuntu-Server.
4. Der Server lädt exakt den zuvor geprüften Git-Commit.
5. Docker baut das App-Image neu und startet den Container.
6. Compose wartet auf den Healthcheck unter `/api/health`.
7. Bei einem Fehler wird automatisch der vorherige Commit wiederhergestellt.

Die Datei `.env` und das Docker-Volume `untiplan_data` bleiben bei einem Deployment unverändert.

## Voraussetzungen

- Ubuntu-Server mit `sudo`-Zugriff
- aktiver Cloudflare-Tunnel und eine bei Cloudflare verwaltete Domain
- GitHub-Repository `GitTimon77/Untiplan`
- Zugriff auf Cloudflare Zero Trust
- Zugriff auf die Repository-Einstellungen bei GitHub

In den Beispielen werden diese Werte verwendet:

| Einstellung | Wert |
|---|---|
| Server-Benutzer | `deploy` |
| Projektverzeichnis | `/opt/untiplan` |
| Branch | `main` |
| Compose-Projekt | `untiplan` |
| Daten-Volume | `untiplan_data` |

Wenn ein anderer Benutzer oder Pfad verwendet wird, muss der Workflow entsprechend angepasst werden.

## 1. Docker auf Ubuntu installieren

Wenn Docker Engine und das Compose-Plugin bereits installiert sind, kann dieser Abschnitt übersprungen werden. Für einen Produktionsserver sollte Docker aus dem offiziellen Docker-Repository installiert werden.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Docker-Paketquelle hinzufügen:

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

Docker installieren und starten:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
```

Aktuelle Details und unterstützte Ubuntu-Versionen stehen in der [offiziellen Docker-Anleitung](https://docs.docker.com/engine/install/ubuntu/).

## 2. Deployment-Benutzer anlegen

Ein separater Benutzer verhindert, dass sich GitHub Actions direkt als `root` anmeldet.

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy /opt/untiplan
sudo -iu deploy
```

In der neuen Sitzung prüfen:

```bash
docker version
docker compose version
```

Hinweis: Mitglieder der Gruppe `docker` können praktisch Root-Rechte auf dem Server erlangen. Für eine stärker isolierte Installation kann stattdessen Rootless Docker verwendet werden.

## 3. Dem Server Zugriff auf GitHub geben

Der Server muss neue Commits aus dem Repository abrufen können. Diese Verbindung ist unabhängig von dem späteren Schlüssel, mit dem GitHub Actions den Server erreicht.

### Öffentliches Repository

Bei einem öffentlichen Repository reicht HTTPS:

```bash
git clone https://github.com/GitTimon77/Untiplan.git /opt/untiplan
```

### Privates Repository

Für ein privates Repository als Benutzer `deploy` einen eigenen Schlüssel erzeugen:

```bash
install -m 700 -d ~/.ssh
ssh-keygen -t ed25519 -N "" -f ~/.ssh/github_untiplan -C "untiplan-server"
cat ~/.ssh/github_untiplan.pub
```

Den angezeigten öffentlichen Schlüssel in GitHub eintragen:

1. Repository `Untiplan` öffnen.
2. `Settings` öffnen.
3. `Deploy keys` auswählen.
4. `Add deploy key` wählen.
5. Titel `Ubuntu production server` vergeben.
6. Den öffentlichen Schlüssel einfügen.
7. `Allow write access` **nicht** aktivieren.

GitHub-SSH-Konfiguration öffnen:

```bash
nano ~/.ssh/config
```

Folgenden Inhalt speichern:

```sshconfig
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_untiplan
  IdentitiesOnly yes
```

Danach:

```bash
chmod 600 ~/.ssh/config
ssh -T git@github.com
```

Beim ersten Verbindungsaufbau den angezeigten GitHub-Fingerprint mit den [veröffentlichten GitHub-SSH-Fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints) vergleichen. Die Meldung, dass GitHub keinen Shell-Zugriff anbietet, ist anschließend normal.

Repository klonen und den zu verwendenden Schlüssel dauerhaft für dieses Repository festlegen:

```bash
git clone git@github.com:GitTimon77/Untiplan.git /opt/untiplan
cd /opt/untiplan
git config core.sshCommand "ssh -i /home/deploy/.ssh/github_untiplan -o IdentitiesOnly=yes"
git fetch origin main
```

Deploy-Keys sind auf ein einzelnes Repository begrenzt und standardmäßig read-only. Weitere Hintergründe enthält die [GitHub-Dokumentation zu Deploy-Keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys).

## 4. Produktionskonfiguration anlegen

Die Produktionswerte werden ausschließlich auf dem Server gespeichert:

```bash
cd /opt/untiplan
umask 077
cp .env.example .env
openssl rand -base64 48
nano .env
```

Die Ausgabe von `openssl` als `SESSION_SECRET` einsetzen. Eine vollständige Datei sieht beispielsweise so aus:

```dotenv
SESSION_SECRET=HIER_DEN_GENERIERTEN_WERT_EINTRAGEN
SESSION_TTL_DAYS=14
DATA_DIR=./data
WEBUNTIS_CLIENT=Untiplan
APP_PORT=3002
CLOUDFLARE_TUNNEL_TOKEN=
```

Dateirechte prüfen:

```bash
chmod 600 .env
ls -l .env
```

Wichtige Regeln:

- `.env` niemals committen oder in GitHub hochladen.
- `SESSION_SECRET` dauerhaft sichern und nicht bei jedem Deployment neu erzeugen.
- Eine Änderung von `SESSION_SECRET` meldet alle Benutzer ab und macht gespeicherte Zugangsdaten unlesbar.
- Die `.dockerignore` verhindert, dass `.env` in den Docker-Build-Kontext gelangt.

## 5. Untiplan erstmals manuell starten

Vor dem automatischen Deployment sollte die Serverinstallation einmal manuell geprüft werden:

```bash
cd /opt/untiplan
docker compose config --quiet
docker compose build --pull app
docker compose up -d --wait --wait-timeout 180 app
docker compose ps
curl --fail http://127.0.0.1:3002/api/health
```

Eine erfolgreiche Antwort des letzten Befehls enthält `"status":"ok"`.

Nützliche Diagnosebefehle:

```bash
docker compose logs --tail=200 app
docker compose logs -f app
docker inspect --format='{{.State.Health.Status}}' untiplan-app-1
```

Die Portbindung `127.0.0.1:3002:3000` ist absichtlich nur lokal erreichbar. Port 3002 ist der Host-Port; Port 3000 bleibt der interne Container-Port. Mit `APP_PORT` in `.env` kann der Host-Port geändert werden, ohne Dockerfile oder Compose-Datei anzupassen.

## 6. Optional: Cloudflare-Tunnel aktivieren

Es gibt zwei unterstützte Varianten.

### Bereits auf dem Host installierter Tunnel

Der Cloudflare-Ingress zeigt auf:

```text
http://localhost:3002
```

### Tunnel als Compose-Dienst

Im Cloudflare-Zero-Trust-Dashboard einen Tunnel und einen öffentlichen Hostnamen erstellen. Als Dienst-URL verwenden:

```text
http://app:3000
```

Den Tunnel-Token auf dem Server in `.env` eintragen:

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=DEIN_CLOUDFLARE_TOKEN
```

Anschließend:

```bash
cd /opt/untiplan
docker compose --profile tunnel up -d --wait --wait-timeout 180
docker compose ps
docker compose logs --tail=100 cloudflared
```

Der automatische Workflow aktualisiert danach nur den Dienst `app`. Ein bereits laufender `cloudflared`-Container bleibt aktiv und verbindet sich nach einem App-Neustart erneut.

## 7. GitHub Actions Zugriff auf den Server geben

Nun wird ein zweites Schlüsselpaar erstellt. Es dient ausschließlich der Richtung **GitHub Actions → Ubuntu-Server**.

Auf dem eigenen Windows-Rechner in PowerShell:

```powershell
$keyPath = "$env:USERPROFILE\.ssh\untiplan_actions"
ssh-keygen -t ed25519 -f $keyPath -C "github-actions-untiplan"
Get-Content "$keyPath.pub"
```

Für einen vollautomatischen Workflow muss der Schlüssel ohne Passphrase verwendbar sein. Bei den beiden Passphrase-Abfragen daher jeweils Enter drücken.

Die angezeigte öffentliche Zeile auf dem Server als Benutzer `deploy` hinterlegen:

```bash
install -m 700 -d ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Der private Schlüssel bleibt auf dem eigenen Rechner und wird gleich als GitHub-Secret gespeichert. Er darf niemals auf den Server oder ins Repository kopiert werden.

## 8. SSH über Cloudflare Access einrichten

Ein normaler Cloudflare-Webtunnel macht SSH nicht automatisch erreichbar. Für GitHub Actions wird im vorhandenen Tunnel ein eigener SSH-Hostname angelegt, beispielsweise `ssh.example.com`.

In Cloudflare Zero Trust:

1. `Networking` → `Tunnels` öffnen und den vorhandenen Tunnel auswählen.
2. Unter `Routes` eine `Published application` hinzufügen.
3. Als Subdomain beispielsweise `ssh` und die eigene Domain auswählen.
4. Als Service `SSH` und als Ziel `localhost:22` eintragen.
5. Speichern und prüfen, dass der Tunnel weiterhin `Healthy` ist.

Danach eine Access-Anwendung für denselben Hostnamen erstellen und einen Service-Token zulassen:

1. `Access controls` → `Applications` öffnen.
2. Eine selbst gehostete Anwendung für den SSH-Hostnamen anlegen.
3. Unter `Access controls` → `Service credentials` → `Service Tokens` einen Token namens `Untiplan GitHub Actions` erstellen.
4. Client ID und Client Secret sofort sicher kopieren; das Secret wird nur einmal vollständig angezeigt.
5. In der Access-Anwendung eine Richtlinie mit Aktion `Service Auth` anlegen.
6. Unter `Include` den zuvor erstellten Service-Token auswählen.

Cloudflare beschreibt den SSH-Published-Hostname in der [SSH-Tunnel-Anleitung](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-cloudflared-authentication/) und maschinelle Zugänge in der [Service-Token-Dokumentation](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/).

### SSH-Host-Key erfassen

Cloudflare transportiert die SSH-Verbindung, ersetzt aber nicht die Identität des Ubuntu-Servers. GitHub Actions prüft deshalb weiterhin dessen Ed25519-Host-Key.

Auf dem Server zunächst den Fingerprint anzeigen:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Danach eine `known_hosts`-Zeile erzeugen. `ssh.example.com` durch den tatsächlichen SSH-Hostnamen ersetzen:

```bash
sudo awk '{print "ssh.example.com " $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub
```

Die ausgegebene einzelne Zeile wird später vollständig als `SERVER_KNOWN_HOSTS` gespeichert. Der private SSH-Host-Key unter `/etc/ssh/ssh_host_ed25519_key` darf niemals angezeigt oder kopiert werden.

## 9. GitHub-Environment und Secrets einrichten

In GitHub:

1. Repository `Untiplan` öffnen.
2. `Settings` → `Environments` wählen.
3. Ein Environment namens `production` erstellen.
4. Unter `Deployment branches` ausschließlich `main` erlauben.
5. Unter `Environment secrets` die folgenden sieben Werte anlegen.

| Secret | Wert |
|---|---|
| `SERVER_HOST` | Cloudflare-SSH-Hostname, beispielsweise `ssh.example.com` |
| `SERVER_PORT` | `22` |
| `SERVER_USER` | `deploy` |
| `SERVER_SSH_KEY` | vollständiger Inhalt der privaten Datei `untiplan_actions` |
| `SERVER_KNOWN_HOSTS` | die auf dem Server erzeugte Zeile für den Cloudflare-SSH-Hostnamen |
| `CF_ACCESS_CLIENT_ID` | Client ID des Cloudflare-Service-Tokens |
| `CF_ACCESS_CLIENT_SECRET` | Client Secret des Cloudflare-Service-Tokens |

Den privaten Schlüssel unter Windows anzeigen:

```powershell
Get-Content -Raw "$env:USERPROFILE\.ssh\untiplan_actions"
```

Der Inhalt einschließlich dieser Zeilen muss kopiert werden:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

GitHub-Secrets werden dem Workflow nur explizit zur Verfügung gestellt. Environment-Secrets können zusätzlich durch Branch-Regeln und erforderliche Freigaben geschützt werden. Siehe [GitHub Secrets](https://docs.github.com/en/actions/concepts/security/secrets) und [Deployment-Environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments).

## 10. Workflow veröffentlichen

Der fertige Workflow liegt in `.github/workflows/deploy.yml`. Lokal prüfen, welche Dateien geändert wurden:

```bash
git status
git diff --check
```

Danach committen und pushen:

```bash
git add .
git commit -m "Rename project to Untiplan and add deployment"
git push origin main
```

Der Push startet den Workflow automatisch. Unter `GitHub → Actions → Untiplan prüfen und deployen` ist der Fortschritt sichtbar.

Der Workflow besitzt nur `contents: read`, verhindert parallele Produktionsdeployments und verwendet ausschließlich Secrets aus dem Environment `production`.

## 11. Was der Workflow auf dem Server macht

Der Deployment-Job führt sinngemäß diese Schritte aus:

```bash
cd /opt/untiplan
git fetch --prune origin main
git checkout --detach <getesteter-commit>
docker compose build --pull app
docker compose up --detach --wait --wait-timeout 180 app
```

Vorher merkt er sich den aktuell ausgecheckten Commit. Schlägt Build, Start oder Healthcheck fehl, wird dieser Commit wieder ausgecheckt und erneut gestartet. Der GitHub-Lauf bleibt rot, obwohl die vorherige App-Version wieder erreichbar ist, damit der Fehler sichtbar bleibt.

Nicht eingecheckte Änderungen an versionierten Dateien auf dem Server führen bewusst zum Abbruch. Produktionscode sollte ausschließlich über GitHub geändert werden. Die ignorierte `.env` ist davon nicht betroffen.

## 12. Deployment kontrollieren

Auf GitHub müssen die Jobs `Qualität prüfen` und `Auf Produktionsserver deployen` grün sein. Auf dem Server:

```bash
cd /opt/untiplan
git rev-parse HEAD
docker compose ps
curl --fail http://127.0.0.1:3002/api/health
```

Der erste Befehl sollte denselben Commit anzeigen wie der erfolgreiche GitHub-Actions-Lauf.

## 13. Häufige Fehler

### `Permission denied (publickey)` beim Deployment

- `SERVER_SSH_KEY` enthält nicht den vollständigen privaten Actions-Schlüssel.
- Der zugehörige öffentliche Schlüssel fehlt in `/home/deploy/.ssh/authorized_keys`.
- `SERVER_USER` oder `SERVER_PORT` ist falsch.
- Rechte prüfen: `.ssh` benötigt `700`, `authorized_keys` benötigt `600`.

### `Host key verification failed`

- `SERVER_KNOWN_HOSTS` fehlt oder enthält nicht den in `SERVER_HOST` verwendeten Cloudflare-SSH-Hostnamen.
- Nach einer legitimen Neuinstallation des Servers den neuen Host-Key erneut direkt auf dem Server verifizieren und das Secret aktualisieren.

### Cloudflare öffnet eine Browser-Anmeldung oder meldet einen Handshake-Fehler

- `CF_ACCESS_CLIENT_ID` oder `CF_ACCESS_CLIENT_SECRET` fehlt beziehungsweise ist abgelaufen.
- Die Access-Richtlinie verwendet nicht die Aktion `Service Auth`.
- Der Service-Token wurde nicht unter `Include` ausgewählt.
- Der Published Hostname zeigt nicht als `SSH`-Dienst auf `localhost:22`.

### `Repository not found` oder Fehler bei `git fetch`

- Bei einem privaten Repository fehlt der read-only Deploy-Key in GitHub.
- Der private Server-Schlüssel `~/.ssh/github_untiplan` oder `core.sshCommand` fehlt.
- Als Benutzer `deploy` mit `git fetch origin main` testen.

### Zugriff auf `/var/run/docker.sock` verweigert

- Der Benutzer `deploy` ist noch nicht Mitglied der Gruppe `docker`.
- Nach `sudo usermod -aG docker deploy` muss eine neue Login-Sitzung gestartet werden.

### `SESSION_SECRET muss gesetzt sein`

- `/opt/untiplan/.env` fehlt.
- Der Wert ist kürzer als 32 Zeichen.
- Die Datei liegt versehentlich in einem anderen Verzeichnis.

### Container wird `unhealthy`

```bash
cd /opt/untiplan
docker compose ps
docker compose logs --tail=200 app
curl -v http://127.0.0.1:3002/api/health
```

### App ist lokal erreichbar, aber nicht über die Domain

Das Deployment öffnet Host-Port 3002 absichtlich nicht öffentlich. In diesem Fall Cloudflare-Tunnel, DNS und den dort eingetragenen Dienst prüfen.

## 14. Vorhandenes altes Docker-Volume migrieren

Dieser Schritt ist nur nötig, wenn bereits eine ältere Version mit dem Volume-Namen `betterwebuntis_data` beziehungsweise einem automatisch vorangestellten Compose-Projektnamen betrieben wurde.

Vorhandene Volumes anzeigen:

```bash
docker volume ls
```

Den alten Namen notieren, zum Beispiel `untiplan_betterwebuntis_data`. Danach die App stoppen, ohne Volumes zu löschen:

```bash
cd /opt/untiplan
docker compose down
docker volume create untiplan_data
```

`ALTES_VOLUME` im folgenden Befehl durch den tatsächlich angezeigten Namen ersetzen:

```bash
docker run --rm \
  -v ALTES_VOLUME:/source:ro \
  -v untiplan_data:/target \
  alpine sh -c 'cp -a /source/. /target/'
```

Anschließend starten und prüfen:

```bash
docker compose up -d --wait --wait-timeout 180 app
curl --fail http://127.0.0.1:3002/api/health
```

Das alte Volume erst nach erfolgreicher Kontrolle und einem Backup entfernen. Niemals `docker compose down -v` verwenden, wenn die gespeicherten Sitzungen erhalten bleiben sollen.

## 15. Backup des Daten-Volumes

Backup-Verzeichnis anlegen:

```bash
sudo install -d -o deploy -g deploy /opt/untiplan-backups
```

Als Benutzer `deploy` ein Archiv erstellen:

```bash
docker run --rm \
  -v untiplan_data:/data:ro \
  -v /opt/untiplan-backups:/backup \
  alpine sh -c 'tar -czf /backup/untiplan-$(date +%F-%H%M%S).tar.gz -C /data .'
```

Das Backup enthält verschlüsselte WebUntis-Zugangsdaten. Für eine Wiederherstellung wird zusätzlich dasselbe `SESSION_SECRET` benötigt; beides sollte getrennt und geschützt gesichert werden.
