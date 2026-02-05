import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM Ersatz für __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dateien im selben Ordner wie data.ts
const userFile = path.join(__dirname, "user_data.json");
const playlistFile = path.join(__dirname, "playlist_data.json");

// Datei/Ordner sicherstellen
function ensureFile(filePath: string, defaultData: object) {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
    }
}

// JSON Loader
export function loadJSON(filePath: string) {
    ensureFile(filePath, {});
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// JSON Saver
export function saveJSON(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// Spezifische Exporte
export function loadUsers() {
    ensureFile(userFile, { users: [] });
    return loadJSON(userFile);
}

export function saveUsers(data: any) {
    saveJSON(userFile, data);
}

export function loadPlaylists() {
    ensureFile(playlistFile, { playlists: [] });
    return loadJSON(playlistFile);
}

export function savePlaylists(data: any) {
    saveJSON(playlistFile, data);
}