import { ask, askChoice, askConfirm, waitEnter } from "../../services/prompt.ts";
import { drawMenu } from "./menu.ts";
import { searchSong, addToPlaylist, getTrackNameFromID } from "../../services/service.ts";
import { getPlaylists } from "../Backend/playlist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { header } from "../../services/header.ts";

export async function drawSong(activeUser: string): Promise<void> {
  console.clear();
  header(`${activeUser} - Song-Suche`);

  // Schönes Menü statt Nummern
  const action = await askChoice("Aktion auswählen:", [
    { name: "🎵 Suche starten", value: "search" },
    { name: "⬅️  Zurück", value: "back" }
  ]);

  if (action === "back") {
    return drawMenu(activeUser, true);
  }

  if (action === "search") {
    const query = await ask("Suchkriterien eingeben:");

    // Suche ausführen
    const searchResults = await searchSong(query);

    if (!searchResults || searchResults.length === 0) {
      console.log("Keine Ergebnisse gefunden.");
      await waitEnter();
      return drawSong(activeUser);
    }

    // Ergebnisauswahl als Liste
    const choiceList = await Promise.all(
      searchResults.map(async (raw, i) => {
        const id = String(raw);
        const title = await getTrackNameFromID(id);
        return {
          name: `${i + 1}. ${title} (${id})`,
          value: id
        };
      })
    );

    const doAdd = await askConfirm("Möchtest du einen Song hinzufügen?");
    if (!doAdd) return drawSong(activeUser);

    const chosenSongId = await askChoice(
      "Welchen Song möchtest du hinzufügen?",
      [
        { name: "❌ Abbrechen", value: "__cancel__" as any },
        ...choiceList
      ]
    );

    if (chosenSongId === "__cancel__") return drawSong(activeUser);

    const songTitle = await getTrackNameFromID(chosenSongId);

    // Playlists anzeigen
    const playlists = await getPlaylists(activeUser);

    if (playlists.length === 0) {
      console.log("Keine Playlists vorhanden.");
      await waitEnter();
      return drawSong(activeUser);
    }

    console.log("\nDeine Playlists:\n");
    console.log(formatPlaylists(playlists));

    // Playlist als Liste auswählen
    const playlistName = await askChoice(
      "Zu welcher Playlist hinzufügen?",
      playlists.map(pl => ({
        name: `${pl.name} (${pl.songs.length} Songs)`,
        value: pl.name
      }))
    );

    const result = await addToPlaylist(chosenSongId, playlistName, activeUser);

    if (result === "added") {
      console.log(`✔ "${songTitle}" wurde zu "${playlistName}" hinzugefügt!`);
    } else if (result === "exists") {
      console.log(`⚠ "${songTitle}" ist dort bereits vorhanden.`);
    } else {
      console.log("❌ Fehler beim Speichern.");
    }

    await waitEnter();
    return drawSong(activeUser);
  }
}