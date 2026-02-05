import fs from "fs";
import path from "path";

// Dateien korrekt referenzieren
const userFile = path.join(process.cwd(), "Server/TS/user_data.json");
const playlistFile = path.join(process.cwd(), "Server/TS/playlist_data.json");

// Allgemeine Loader
export function loadJSON(filePath: string) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 4));
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Allgemeiner Saver
export function saveJSON(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// Spezifische Exporte ↓↓↓
export function loadUsers() {
    return loadJSON(userFile);
}

export function saveUsers(data: any) {
    saveJSON(userFile, data);
}

export function loadPlaylists() {
    return loadJSON(playlistFile);
}

export function savePlaylists(data: any) {
    saveJSON(playlistFile, data);
}