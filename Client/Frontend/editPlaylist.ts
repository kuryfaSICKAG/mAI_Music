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

export async function editPlaylist(name: string): Promise<void> {
  console.clear();
  console.log(`\nPlaylist "${name}" bearbeiten\n`);

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
    const statusChoice = await askChoice("Status ändern:", [
      { name: "Public", value: "public" },
      { name: "Private", value: "private" },
      { name: "Toggle", value: "toggle" },
      { name: "Abbrechen", value: "cancel" }
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
