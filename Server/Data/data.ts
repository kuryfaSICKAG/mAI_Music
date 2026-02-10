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
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4), "utf8");
    }
}

// JSON Loader
export function loadJSON<T = any>(filePath: string): T {
    ensureFile(filePath, {});  // leeres Objekt, falls Datei fehlt
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

// JSON Saver
export function saveJSON(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
}

// ==================== USERS ====================
export function loadUsers() {
    ensureFile(userFile, { users: [] });
    return loadJSON(userFile);
}

export function saveUsers(data: any) {
    saveJSON(userFile, data);
}

// ==================== PLAYLISTS (playlistsByUser) ====================
export type PlaylistDB = {
    playlistsByUser: Record<string, { name: string; songs: any[] }[]>;
};

export function loadPlaylists(): PlaylistDB {
    // Sicherstellen, dass Datei existiert und richtige Struktur hat
    ensureFile(playlistFile, { playlistsByUser: {} });

    const db = loadJSON<PlaylistDB>(playlistFile);

    // Falls Struktur kaputt oder alt → reparieren
    if (!db.playlistsByUser || typeof db.playlistsByUser !== "object") {
        db.playlistsByUser = {};
        savePlaylists(db);
    }

    return db;
}

export function savePlaylists(db: PlaylistDB) {
    saveJSON(playlistFile, db);
}