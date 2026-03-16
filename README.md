# mAI Music

Dieses Projekt ist eine Konsolenanwendung zur Musiksuche, Playlist-Verwaltung, Server-Verbindung und KI-gestützten Playlist-Erstellung.

## Voraussetzungen

- Node.js 20 oder neuer
- npm
- Internetverbindung fuer Deezer-Abfragen
- `.env`-Datei mit OpenAI API Key

## Repository lokal clonen

Das Projekt kann mit Git lokal heruntergeladen werden:

```bash
git clone https://github.com/kuryfaSICKAG/mAI_Music.git
cd mAI_Music
```

Falls das Repository unter einem anderen Namen oder in einen anderen Ordner geklont wird, muss anschliessend nur in den jeweiligen Projektordner gewechselt werden.

## Installation

Im Projektordner einmalig ausführen:

```bash
npm install
```

Danach muss im Projektordner eine Datei namens `.env` erstellt werden:

```env
OPENAI_API_KEY=dein_api_key
```

Ohne diese Datei sind die KI-Funktionen nicht nutzbar.

## Server starten

Der Backend-Server laeuft standardmaessig auf Port `8080`.

Im ersten Terminal starten:

```bash
npm run server
```

Wenn der Start erfolgreich war, erscheint eine Meldung aehnlich zu:

```text
Server laeuft unter http://localhost:8080
```

## Programm starten

Die Konsolenanwendung wird in einem zweiten Terminal gestartet:

```bash
npm run client
```

Die Anwendung fragt danach nach:

- Server-IP
- Port

Fuer einen lokalen Start koennen in der Regel folgende Werte verwendet werden:

- Server-IP: `localhost`
- Port: `8080`

Anschliessend kann man sich einloggen oder ein neues Konto erstellen.

## Verfügbare Skripte

Die TypeScript-Dateien werden direkt ueber `tsx` gestartet.

- `npm run server` startet nur den Server
- `npm run client` startet nur die Konsolenanwendung

## KI-Funktionen

Fuer die KI-Funktionen muss vor dem Start eine `.env`-Datei mit gueltigem API Key vorhanden sein:

```env
OPENAI_API_KEY=dein_api_key
```

Ohne diesen Eintrag funktionieren die normalen Server-, Such- und Playlist-Funktionen weiterhin, die KI-Features jedoch nicht.

## Typischer Ablauf

1. `npm install` ausfuehren
2. `.env` mit `OPENAI_API_KEY` anlegen
3. `npm run server` im ersten Terminal starten
4. `npm run client` im zweiten Terminal starten
5. Im Client mit dem Server verbinden
6. Benutzerkonto anlegen oder einloggen
7. Playlists, Songs, Online- und KI-Funktionen verwenden

## Tests

```bash
npm test
```
