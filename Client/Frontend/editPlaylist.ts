import {
  ask,
  askChoice,
  askConfirm,
  waitEnter,
} from "../../services/prompt.ts";
import {
  renamePlaylist,
  addSong,
  removeSongByIndex,
  getPlaylists,
  setPlaylistStatus,
  togglePlaylistStatus,
  getPlaylistStatus,
} from "../Backend/playlist.ts";
import { activeUser } from "./authenticate.ts";
import { drawPlaylist } from "./drawPlaylist.ts";
import {
  getTrackNameFromID,
  getTrackArtistFromID,
} from "../../services/service.ts";
import { header } from "../../services/ui.ts";
import chalk from "chalk";
import { drawSong } from "./song.ts";
import { formatSongs } from "../Backend/format.ts";

export async function lookupPlaylist(name: string): Promise<void> {
  console.clear();
  header(`Playlist "${name}"`);
  const playlists = await getPlaylists(activeUser);
  const playlist = playlists.find((p) => p.name === name);

  if (!playlist || playlist.songs.length === 0) {
    console.log("Keine Songs in dieser Playlist.");
    await waitEnter();
    return drawPlaylist(activeUser);
  }

  console.log(await formatSongs(playlist));
  console.log("");
  await waitEnter();
  return drawPlaylist(activeUser);
}

export async function editPlaylist(name: string): Promise<void> {
  console.clear();
  header(`Playlist "${name}" bearbeiten`);

  const playlists = await getPlaylists(activeUser);
  const playlist = playlists.find((p) => p.name === name);

  if (!playlist || playlist.songs.length === 0) {
    console.log("Keine Songs in dieser Playlist.\n");
  } else {
    console.log(await formatSongs(playlist));
    console.log("");
  }

  const action = await askChoice("Option wählen:", [
    { name: "Playlist umbenennen", value: "rename" },
    { name: "Status ändern", value: "status" },
    { name: "Song hinzufügen", value: "add" },
    { name: "Song entfernen", value: "remove" },
    { name: "Zurück", value: "back" },
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

    const changeStatus = await askConfirm("Status ändern?");

    if (changeStatus) {
      await togglePlaylistStatus(activeUser, name);
    } else {
      return editPlaylist(name);
    }
  }

  if (action === "add") {
    const addChoice = await askChoice("Option wählen:", [
      { name: "Song-ID eingeben", value: "useID" },
      { name: "Song suchen", value: "goSearch" },
      { name: "Abbrechen", value: "cancel" },
    ]);

    if (addChoice === "useID") {
      const id = await ask("Song-ID eingeben:");
      await addSong(activeUser, name, id);
      return editPlaylist(name);
    } else if (addChoice === "goSearch") {
      return drawSong(activeUser);
    } else {
      editPlaylist(name);
    }
  }

  if (action === "remove") {
    if (!playlist || playlist.songs.length === 0) {
      console.log("Keine Songs in dieser Playlist.");
      return editPlaylist(name);
    }

    const songs = await Promise.all(
      playlist.songs.map(async (id) => {
        const title = await getTrackNameFromID(id);
        const artist = await getTrackArtistFromID(id);
        return {
          id,
          label: `${title} — ${artist}`,
        };
      }),
    );

    const selected = await askChoice("Song auswählen:", [
      ...songs.map((s) => ({
        name: s.label,
        value: s.id,
      })),
      {
        name: "Abbrechen",
        value: null,
      },
    ]);

    if (selected === null) return editPlaylist(name);

    const idx = playlist.songs.indexOf(selected);
    if (idx >= 0) await removeSongByIndex(activeUser, name, idx);

    return editPlaylist(name);
  }

  return drawPlaylist(activeUser);
}
