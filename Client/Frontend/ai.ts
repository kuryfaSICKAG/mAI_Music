import { header } from "../../services/ui.ts";
import { ask, askChoice, askConfirm } from "../../services/prompt.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { getPlaylists } from "../Backend/playlist.ts";
import { drawMenu } from "./menu.ts";
import {
  createAIPlaylist,
  AIPlaylistFromPlaylist,
} from "../../services/aiService.ts";

export async function drawAI(activeUser: string) {
  console.clear();
  header(`${activeUser} - AI-Features`);

  const choice = await askChoice("Playlist erstellen lassen nach:", [
    { name: "Prompt", value: "prompt" },
    { name: "Playlist", value: "playlist" },
    { name: "Zurück", value: "back" },
  ]);

  if (choice === "prompt") {
    const playlistName = await ask("Wie soll die Playlist heißen?");
    const prompt = await ask("Bitte geben Sie einen Prompt ein:");
    await createAIPlaylist(activeUser, playlistName, prompt);
    return drawAI(activeUser);
  } else if (choice === "playlist") {
    const lists = await getPlaylists(activeUser);

    if (lists.length === 0) console.log("Keine Playlists vorhanden.\n");
    else {
      console.log(formatPlaylists(lists) + "\n");

      const playlist = await askChoice("Welche Playlist?", [
        ...lists.map((pl) => ({
          name: `${pl.name} (${pl.songs.length} Songs)`,
          value: pl.name,
        })),
        { name: "Abbrechen", value: "cancel" },
      ]);
      if (playlist === "cancel") return drawAI(activeUser);

      const newPlaylistName = await ask("Wie soll die Playlist heißen?");
      await AIPlaylistFromPlaylist(activeUser, newPlaylistName, playlist);
    }
    return drawAI(activeUser);
  } else return drawMenu(activeUser, true);
}
