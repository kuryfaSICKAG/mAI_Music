import {
  renamePlaylist,
  addSong,
  removeSongByIndex,
  getPlaylists,
  setPlaylistStatus,
  togglePlaylistStatus,
  getPlaylistStatus
} from "../Backend/playlist.ts";
import { activeUser } from "./authenticate.ts";
import { question, questionInt } from "readline-sync";
import { drawPlaylist } from "./drawPlaylist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { type Playlist } from "../../models/personalModels.ts";

export async function editPlaylist(name: string): Promise<void> {
  console.clear();
  console.log("\n                     |========= Willkommen bei mAI music =========|");
  console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist "${name}" bearbeiten\n------------------------`);

  // Wenn Name leer -> nachfragen
  if (name === "") {
    console.log(formatPlaylists(await getPlaylists(activeUser))); // 1-basiert formatiert
    name = question("~ Welche Playlist willst du bearbeiten? (Name)\n> ").trim();
    if (name === "") {
      console.log("# Gib einen gültigen Namen ein!");
      return editPlaylist(name);
    }
  }

  const menu: number = questionInt(
    ">>> Playlist umbenennen (1)\n" +
    ">>> Playlist öffentlich/privat stellen (2)\n" +
    ">>> Song hinzufügen (3)\n" +
    ">>> Song entfernen (4)\n" +
    ">>> Zurück (0)\n\n> "
  );

  switch (menu) {
    case 1: {
      // Playlist umbenennen
      const oldName = name;
      const newName = question(`Alter Name: ${oldName}\nNeuen Namen eingeben:\n> `).trim();

      if (newName === "") {
        console.log("# Gib einen gültigen Namen ein!");
        return editPlaylist(name);
      }

      await renamePlaylist(activeUser, oldName, newName);
      name = newName;
      return editPlaylist(name);
    }

    case 2: {
      try {
        const current = await getPlaylistStatus(activeUser, name);
        console.log(`\nAktueller Status: ${current === "public" ? "🔓 public" : "🔒 private"}`);

        const choice = questionInt(
          "\nStatus ändern:\n" +
          "  (1) Auf 'public' setzen\n" +
          "  (2) Auf 'private' setzen\n" +
          "  (3) Toggle (umschalten)\n" +
          "  (0) Abbrechen\n\n> "
        );

        switch (choice) {
          case 1: {
            const next = await setPlaylistStatus(activeUser, name, "public");
            console.log(`\n✔ Status auf '${next}' gesetzt.`);
            break;
          }
          case 2: {
            const next = await setPlaylistStatus(activeUser, name, "private");
            console.log(`\n✔ Status auf '${next}' gesetzt.`);
            break;
          }
          case 3: {
            const next = await togglePlaylistStatus(activeUser, name);
            console.log(`\n✔ Status umgeschaltet auf '${next}'.`);
            break;
          }
          case 0: {
            console.log("\nAbgebrochen.");
            break;
          }
          default: {
            console.log("\nUngültige Auswahl.");
            break;
          }
        }
      } catch (e: any) {
        console.log(`# Fehler: ${e?.message ?? "Konnte Status nicht ändern."}`);
        question("\n(Enter) weiter…");
      }
      return editPlaylist(name);
    }

    case 3: {
      // Song hinzufügen
      const songId = question("Song-ID (Deezer Track ID):\n> ").trim();
      if (!songId) {
        console.log("# Ungültige Song-ID!");
        return editPlaylist(name);
      }

      await addSong(activeUser, name, songId);
      console.log(`\n✔ Song-ID "${songId}" hinzugefügt!`);
      return editPlaylist(name);
    }

    case 4: {
      // Song löschen (Anzeige & Eingabe 1-basiert)
      const playlists: Playlist[] = await getPlaylists(activeUser);
      const playlist = playlists.find((p: Playlist) => p.name === name);

      if (!playlist) {
        console.log("# Playlist nicht gefunden!");
        return drawPlaylist(activeUser);
      }

      if (!Array.isArray(playlist.songs) || playlist.songs.length === 0) {
        console.log("# Diese Playlist hat keine Songs.");
        return editPlaylist(name);
      }

      console.log("\nSongs:");
      playlist.songs.forEach((songId: string, i: number) => {
        console.log(`${i + 1}. ${songId}`); // 1-basiert anzeigen
      });

      const oneBased = questionInt("\nWelchen Song löschen? (Nummer)\n> ");
      const idx = oneBased - 1; // 1-basiert -> 0-basiert

      if (!Number.isInteger(oneBased) || idx < 0 || idx >= playlist.songs.length) {
        console.log("# Ungültige Nummer!");
        return editPlaylist(name);
      }

      await removeSongByIndex(activeUser, name, idx);
      console.log(`\n✔ Song entfernt!`);
      return editPlaylist(name);
    }

    case 0:
      return drawPlaylist(activeUser);

    default:
      console.log("nöööö");
      return editPlaylist(name);
  }
}