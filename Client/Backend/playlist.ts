import { getServerUrl } from "./connection.ts";

function base() {
    const url = getServerUrl();
    if (!url) throw new Error("Keine Server-Verbindung.");
    return url;
}

// 1) User für Playlist-System initialisieren
export async function initUser(username: string) {
    await fetch(`${base()}/playlist/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
    });
}

// 2) Alle Playlists eines Users abrufen
export async function getPlaylists(username: string) {
    const res = await fetch(`${base()}/playlist/${username}`);
    return res.ok ? res.json() : [];
}

// 3) Playlist erstellen
export async function createPlaylist(username: string, name: string) {
    await fetch(`${base()}/playlist/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name })
    });
}

// 4) Playlist löschen
export async function deletePlaylist(username: string, name: string) {
    await fetch(`${base()}/playlist/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name })
    });
}

// 5) Playlist umbenennen
export async function renamePlaylist(username: string, oldName: string, newName: string) {
    await fetch(`${base()}/playlist/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, oldName, newName })
    });
}

// 6) Song hinzufügen
export async function addSong(username: string, playlistName: string, song: any) {
    await fetch(`${base()}/playlist/song/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, playlistName, song })
    });
}

// 7) Song über Index löschen  ← DAS HAT DIR GEFHLT!
export async function removeSongByIndex(username: string, playlistName: string, index: number) {
    await fetch(`${base()}/playlist/song/remove`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, playlistName, index })
    });
}