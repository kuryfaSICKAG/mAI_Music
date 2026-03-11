import { getServerUrl, safeFetch } from "./connection.ts";
import type { Status, Playlist } from "../../models/personalModels.ts";

function base() {
  const url = getServerUrl();
  if (!url) throw new Error("Keine Server-Verbindung.");
  return url;
}

// 1) User für Playlist-System initialisieren
export async function initUser(username: string) {
  const res = await safeFetch(`${base()}/playlist/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  });
  await res.body?.cancel(); // ok: Body wird nicht gelesen
}

// 2) Alle Playlists eines Users abrufen
export async function getPlaylists(username: string): Promise<Playlist[]> {
  const res = await safeFetch(`${base()}/playlist/${encodeURIComponent(username)}`);
  // Body wird gelesen -> KEIN cancel() danach!
  return res.ok ? await res.json() : [];
}

// 3) Playlist erstellen
export async function createPlaylist(username: string, name: string, status: Status = "private") {
  const res = await safeFetch(`${base()}/playlist/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, name, status })
  });
  await res.body?.cancel(); // ok: Body wird nicht gelesen
}

// 4) Playlist löschen
export async function deletePlaylist(username: string, name: string) {
  const res = await safeFetch(`${base()}/playlist/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, name })
  });
  await res.body?.cancel(); // ok
}

// 5) Playlist umbenennen
export async function renamePlaylist(username: string, oldName: string, newName: string) {
  const res = await safeFetch(`${base()}/playlist/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, oldName, newName })
  });
  await res.body?.cancel(); // ok
}

// 6) Song hinzufügen
export async function addSong(username: string, playlistName: string, songId: string) {
  const res = await safeFetch(`${base()}/playlist/song/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, playlistName, songId })
  });
  await res.body?.cancel(); // ok
}

// 7) Song über Index löschen
export async function removeSongByIndex(username: string, playlistName: string, index: number) {
  const res = await safeFetch(`${base()}/playlist/song/remove`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, playlistName, index })
  });
  await res.body?.cancel(); // ok
}

// 8) Status abfragen
export async function getPlaylistStatus(username: string, playlistName: string): Promise<Status> {
  const res = await safeFetch(
    `${base()}/playlist/${encodeURIComponent(playlistName)}/status?username=${encodeURIComponent(username)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) throw new Error(`Status konnte nicht geladen werden (${res.status})`);
  const data = await res.json(); // Body wird gelesen -> KEIN cancel() danach
  return data.status as Status;
}

// 9) Status setzen
export async function setPlaylistStatus(username: string, playlistName: string, status: Status): Promise<Status> {
  const res = await safeFetch(`${base()}/playlist/${encodeURIComponent(playlistName)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, status })
  });
  if (!res.ok) throw new Error(`Status konnte nicht gesetzt werden (${res.status})`);
  const data = await res.json(); // Body wird gelesen -> KEIN cancel() danach
  return data.status as Status;
}

// 10) Status umschalten (toggle)
export async function togglePlaylistStatus(username: string, playlistName: string): Promise<Status> {
  const res = await safeFetch(`${base()}/playlist/${encodeURIComponent(playlistName)}/status/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error(`Status konnte nicht umgeschaltet werden (${res.status})`);
  const data = await res.json(); // Body wird gelesen -> KEIN cancel() danach
  return data.status as Status;
}