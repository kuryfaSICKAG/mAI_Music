import {
  ask,
  askChoice,
  askConfirm,
  waitEnter,
} from "../../services/prompt.ts";
import { drawMenu } from "./menu.ts";
import {
  searchSong,
  addToPlaylist,
  getTrackNameFromID,
  getTrackArtistFromID,
} from "../../services/service.ts";
import { getPlaylists } from "../Backend/playlist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { header } from "../../services/ui.ts";
import { drawPlaylist } from "./drawPlaylist.ts";

export async function drawSong(activeUser: string): Promise<void> {
  console.clear();
  header(`${activeUser} – Song-Suche`);

  const action = await askChoice("Aktion auswählen:", [
    { name: "🎵 Suche starten", value: "search" },
    { name: "⬅️  Zurück", value: "back" },
  ]);

  if (action === "back") {
    console.log(""); // <<< eine extra Leerzeile
    return drawMenu(activeUser, true);
  }

  if (action === "search") {
    const query = await ask("Suchkriterien eingeben:");
    const searchResults = await searchSong(query);

    if (!searchResults || searchResults.length === 0) {
      console.log("Keine Ergebnisse gefunden.\n");
      await waitEnter();
      return drawSong(activeUser);
    }

    // Songliste (Titel + Artist)
    const resultChoices = await Promise.all(
      searchResults.map(async (raw, i) => {
        const id = String(raw);
        const title = await getTrackNameFromID(id);
        const artist = await getTrackArtistFromID(id);
        return {
          name: `${i + 1}. ${title} — ${artist} (${id})`,
          value: id,
        };
      }),
    );

    const doAdd = await askConfirm("Möchtest du einen Song hinzufügen?");
    console.log(""); // <<< extra Leerzeile

    if (!doAdd) return drawSong(activeUser);

    const songId = await askChoice("Song auswählen:", [
      ...resultChoices,
      { name: "❌ Abbrechen\n", value: "cancel" },
    ]);

    console.log(""); // <<< extra Leerzeile

    if (songId === "cancel") return drawSong(activeUser);

    const playlists = await getPlaylists(activeUser);
    if (!playlists.length) {
      console.log("Keine Playlists vorhanden.\n");
      await waitEnter();
      return drawSong(activeUser);
    }

    console.log(formatPlaylists(playlists) + "\n");

    const playlistName = await askChoice(
      "Zu welcher Playlist hinzufügen?",[
      ...playlists.map((pl) => ({
        name: `${pl.name} (${pl.songs.length} Songs)`,
        value: pl.name,
      })),
    {
        name: "❌ Abbrechen",
        value: null,
    }]
    );
    if(playlistName === null) return drawSong(activeUser);

    const title = await getTrackNameFromID(songId);
    const result = await addToPlaylist(songId, playlistName, activeUser);

    if (result === "added") {
      console.log(`✔ "${title}" wurde zu "${playlistName}" hinzugefügt!\n`);
    } else if (result === "exists") {
      console.log(`⚠ "${title}" ist bereits in "${playlistName}".\n`);
    } else {
      console.log("❌ Fehler beim Hinzufügen.\n");
    }

    await waitEnter();
    return drawSong(activeUser);
  }
}
