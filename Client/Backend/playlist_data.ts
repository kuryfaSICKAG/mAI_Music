//FS WEG!!!!

import fs from "fs";
import path from "path";

import type { DB, Playlist, Song } from "../../models/personalModels.ts";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = path.join(__dirname, "playlist_data.json");


/* -------------------------------- Utilities -------------------------------- */

export function loadDB(): DB {
  if (!fs.existsSync(filePath)) {
    const empty: DB = { playlistsByUser: {} };
    fs.writeFileSync(filePath, JSON.stringify(empty, null, 2), "utf8");
  }

  const raw = fs.readFileSync(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    // Minimal-Validierung der Top-Level-Struktur
    if (!parsed || typeof parsed !== "object" || typeof parsed.playlistsByUser !== "object") {
      throw new Error("Ungültige DB-Struktur.");
    }
    return parsed as DB;
  } catch (e) {
    // Fallback: DB zurücksetzen, falls Datei korrupt ist (optional)
    const reset: DB = { playlistsByUser: {} };
    fs.writeFileSync(filePath, JSON.stringify(reset, null, 2), "utf8");
    return reset;
  }
}

export function saveDB(db: DB): void {
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf8");
}

// Einfache Heuristik zur Song-Gleichheit (gegen Duplikate)
export function sameSong(a: Song, b: Song): boolean {
  // Du kannst das bei Bedarf verfeinern (Album, Künstlervergleich usw.).
  return (
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    a.year === b.year &&
    a.duration === b.duration
  );
}

/** Legt den User-Eintrag in der DB an, falls nicht vorhanden (idempotent). */
export function addToPlaylist(user: string): void {
  const db = loadDB();

  // Falls der User noch keinen Eintrag hat → leeres Array anlegen
  if (!db.playlistsByUser[user]) {
    db.playlistsByUser[user] = [];
  }

  saveDB(db);
}

/* ------------------------------- Public API -------------------------------- */

/**
 * Gibt alle Playlists eines Users zurück (leeres Array, wenn keine existieren).
 */
export function getPlaylists(user: string): Playlist[] {
  const db = loadDB();
  return db.playlistsByUser[user] ?? [];
}

/**
 * Sucht eine Playlist eines Users nach Name.
 */
export function getPlaylist(user: string, playlistName: string): Playlist | null {
  const lists = getPlaylists(user);
  return lists.find(p => p.name === playlistName) ?? null;
}

/**
 * Legt eine neue Playlist an. Schlägt fehl, wenn Name bereits existiert,
 * es sei denn, allowDuplicateName wird auf true gesetzt.
 */
export function createPlaylist(
  user: string,
  playlistName: string
): Playlist {
  const db = loadDB();
  const arr = db.playlistsByUser[user] ?? [];

  // Da du in deinem System keine doppelten Namen willst:
  if (arr.some(p => p.name === playlistName)) {
    throw new Error(
      `Playlist "${playlistName}" existiert bereits für ${user}.`
    );
  }

  const playlist: Playlist = { name: playlistName, songs: [] };
  db.playlistsByUser[user] = [...arr, playlist];

  saveDB(db);
  return playlist;
}

/**
 * Löscht eine Playlist. Gibt true zurück, wenn sie existierte und gelöscht wurde.
 */
export function deletePlaylist(user: string, playlistName: string): boolean {
  const db = loadDB();
  const arr = db.playlistsByUser[user] ?? [];
  const next = arr.filter(p => p.name !== playlistName);
  const changed = next.length !== arr.length;

  if (changed) {
    db.playlistsByUser[user] = next;
    saveDB(db);
  }
  return changed;
}

/**
 * B benennt eine Playlist um.
 */
export function renamePlaylist(
  user: string,
  oldName: string,
  newName: string
): void {
  const db = loadDB();
  const arr = db.playlistsByUser[user] ?? [];
  if (arr.some(p => p.name === newName)) {
    throw new Error(`Playlist "${newName}" existiert bereits.`);
  }
  const pl = arr.find(p => p.name === oldName);
  if (!pl) {
    throw new Error(`Playlist "${oldName}" nicht gefunden.`);
  }
  pl.name = newName;
  db.playlistsByUser[user] = arr;
  saveDB(db);
}

/**
 * Fügt einen Song zu einer Playlist hinzu (optional mit Duplikat-Vermeidung).
 */
export function addSongToPlaylist(
  user: string,
  playlistName: string,
  song: Song,
  opts?: { dedupe?: boolean }
): void {
  const db = loadDB();
  const arr = db.playlistsByUser[user] ?? [];
  const pl = arr.find(p => p.name === playlistName);
  if (!pl) {
    throw new Error(`Playlist "${playlistName}" nicht gefunden.`);
  }

  const dedupe = opts?.dedupe ?? true;
  if (dedupe && pl.songs.some(s => sameSong(s, song))) {
    // Überspringen statt Fehler werfen
    db.playlistsByUser[user] = arr;
    saveDB(db);
    return;
  }

  pl.songs.push(song);
  db.playlistsByUser[user] = arr;
  saveDB(db);
}

/**
 * Entfernt den ersten Song, der dem Prädikat entspricht.
 * Beispiel: removeSong(user, "MyList", s => s.name === "Song A")
 */
export function removeSong(
  user: string,
  playlistName: string,
  predicate: (s: Song, index: number) => boolean
): boolean {
  const db = loadDB();
  const arr = db.playlistsByUser[user] ?? [];
  const pl = arr.find(p => p.name === playlistName);
  if (!pl) return false;

  const idx = pl.songs.findIndex(predicate);
  if (idx === -1) return false;

  pl.songs.splice(idx, 1);
  db.playlistsByUser[user] = arr;
  saveDB(db);
  return true;
}

/**
 * Entfernt einen Song per Index (0-basiert). Gibt true bei Erfolg.
 */
export function removeSongByIndex(
  user: string,
  playlistName: string,
  index: number
): boolean {
  return removeSong(user, playlistName, (_s, i) => i === index);
}
