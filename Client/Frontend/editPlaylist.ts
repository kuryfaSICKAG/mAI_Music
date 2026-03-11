import { ask, askChoice, askConfirm } from "../../services/prompt.ts";
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
import { drawPlaylist } from "./drawPlaylist.ts";
import {
  getTrackNameFromID,
  getTrackArtistFromID
} from "../../services/service.ts";
import { header } from "../../services/header.ts";
import chalk from "chalk";

export async function editPlaylist(name: string): Promise<void> {
  console.clear();
  header(`Playlist "${name}" bearbeiten`)

  const action = await askChoice("Option wählen:", [
    { name: "Playlist umbenennen", value: "rename" },
    { name: "Status ändern", value: "status" },
    { name: "Song hinzufügen", value: "add" },
    { name: "Song entfernen", value: "remove" },
    { name: "Zurück", value: "back" }
  ]);

  if (action === "rename") {
    const newName = await ask("Neuer Name:");
    await renamePlaylist(activeUser, name, newName);
    return editPlaylist(newName);
  }
  
  if (action === "status") {
    const current = await getPlaylistStatus(activeUser, name);

    const statusLabel =
      current === "public"
        ? chalk.green("🔓 Aktuell: Public")
        : chalk.yellow("🔒 Aktuell: Private");

    console.log("\n" + statusLabel + "\n");

    const statusChoice = await askChoice("Neuen Status wählen:", [
      { name: "🔓 Public setzen", value: "public" },
      { name: "🔒 Private setzen", value: "private" },
      { name: "🔁 Umschalten (toggle)", value: "toggle" },
      { name: "❌ Abbrechen", value: "cancel" }
    ]);

    if (statusChoice === "public")
      await setPlaylistStatus(activeUser, name, "public");
    else if (statusChoice === "private")
      await setPlaylistStatus(activeUser, name, "private");
    else if (statusChoice === "toggle")
      await togglePlaylistStatus(activeUser, name);

    return editPlaylist(name);
  }

  if (action === "add") {
    const id = await ask("Song-ID eingeben:");
    await addSong(activeUser, name, id);
    return editPlaylist(name);
  }

  if (action === "remove") {
    const playlists = await getPlaylists(activeUser);
    const playlist = playlists.find(p => p.name === name);

    if (!playlist || playlist.songs.length === 0) {
      console.log("Keine Songs in dieser Playlist.");
      return editPlaylist(name);
    }

    const songs = await Promise.all(
      playlist.songs.map(async id => {
        const title = await getTrackNameFromID(id);
        const artist = await getTrackArtistFromID(id);
        return {
          id,
          label: `${title} — ${artist}`
        };
      })
    );

    const selected = await askChoice("Song auswählen:", songs.map(s => ({
      name: s.label,
      value: s.id
    })));

    const idx = playlist.songs.indexOf(selected);
    if (idx >= 0) await removeSongByIndex(activeUser, name, idx);

    return editPlaylist(name);
  }

  return drawPlaylist(activeUser);
}
