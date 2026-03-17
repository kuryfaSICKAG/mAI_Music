import { header } from "../../services/ui.ts";
import {
  ask,
  askChoice,
  waitEnter,
} from "../../services/prompt.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { getPlaylists } from "../Backend/playlist.ts";
import {
  createAIPlaylist,
  AIPlaylistFromPlaylist,
  addAISongsToPlaylist,
  addAIToSamePlaylistFromPlaylistAnalysis,
} from "../../services/aiService.ts";
import { drawMenu } from "./menu.ts";

export async function drawAI(activeUser: string) {
  console.clear();
  header(`${activeUser} - AI-Features`);

  const choice = await askChoice("Was möchtest du tun:", [
    { name: "Neue Playlist mit Prompt erstellen", value: "prompt" },
    {
      name: "Neue Playlist aus bestehender Playlist erstellen",
      value: "playlist",
    },
    { name: "Playlist durch Prompt ergänzen", value: "append" },
    {
      name: "Playlist durch KI-Analyse ergänzen",
      value: "analyze-append-same",
    },
    { name: "Zurück", value: "back" },
  ]);

  if (choice === "prompt") {
    const playlistName = await ask("Wie soll die Playlist heißen?");
    const prompt = await ask("Bitte geben Sie einen Prompt ein:");
    await createAIPlaylist(activeUser, playlistName, prompt);
    await waitEnter();
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
    await waitEnter();
    return drawAI(activeUser);
  } else if (choice === "append") {
    const lists = await getPlaylists(activeUser);

    if (lists.length === 0) {
      console.log("Keine Playlists vorhanden.\n");
      await waitEnter();
      return drawAI(activeUser);
    }

    console.log(formatPlaylists(lists) + "\n");
    const targetPlaylist = await askChoice(
      "Zu welcher Playlist sollen KI-Songs hinzugefügt werden?",
      [
        ...lists.map((pl) => ({
          name: `${pl.name} (${pl.songs.length} Songs)`,
          value: pl.name,
        })),
        { name: "Abbrechen", value: "cancel" },
      ],
    );

    if (targetPlaylist === "cancel") {
      return drawAI(activeUser);
    }

    const prompt = await ask("Bitte geben Sie einen Prompt ein:");
    await addAISongsToPlaylist(activeUser, targetPlaylist, prompt);
    await waitEnter();
    return drawAI(activeUser);
  } else if (choice === "analyze-append-same") {
    const lists = await getPlaylists(activeUser);

    if (lists.length === 0) {
      console.log("Keine Playlists vorhanden.\n");
      await waitEnter();
      return drawAI(activeUser);
    }

    console.log(formatPlaylists(lists) + "\n");
    const playlist = await askChoice(
      "Welche Playlist soll analysiert und erweitert werden?",
      [
        ...lists.map((pl) => ({
          name: `${pl.name} (${pl.songs.length} Songs)`,
          value: pl.name,
        })),
        { name: "Abbrechen", value: "cancel" },
      ],
    );

    if (playlist === "cancel") {
      return drawAI(activeUser);
    }

    await addAIToSamePlaylistFromPlaylistAnalysis(activeUser, playlist);
    await waitEnter();
    return drawAI(activeUser);
  } else return drawMenu(activeUser, true);
}
