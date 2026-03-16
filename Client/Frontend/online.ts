import {
  askChoice,
  ask,
  askConfirm,
  waitEnter,
} from "../../services/prompt.ts";
import { drawMenu } from "./menu.ts";
import { getPlaylists } from "../Backend/playlist.ts";
import {
  listPublicPlaylists,
  getPublicPlaylistDetail,
  sendPlaylist,
} from "../Backend/onlineServices.ts";
import { formatSongs } from "../Backend/format.ts";
import { sleep } from "./menu.ts";
import { header } from "../../services/ui.ts";
import { checkForUser } from "../Backend/authentication.ts";

export async function drawOnline(activeUser: string) {
  console.clear();
  header(`${activeUser}'s Online Hub`);

  const action = await askChoice("Option wählen:", [
    { name: "Playlist verschicken", value: "send" },
    { name: "Öffentliche Playlists suchen", value: "search" },
    { name: "Zurück", value: "back" },
  ]);

  if (action === "send") {
    const lists = await getPlaylists(activeUser);
    if (lists.length === 0) {
      console.log("Keine Playlists vorhanden.");
      await waitEnter();
      return drawOnline(activeUser);
    }

    const selected = await askChoice("Welche Playlist verschicken?", [
      ...lists.map((pl) => ({
        name: `${pl.name} (${pl.songs.length} Songs)`,
        value: pl.name,
      })),
      {
        name: "❌ Abbrechen",
        value: null,
      },
    ]);

    if (selected === null) {
      console.log("Auswahl abgebrochen.");
      await waitEnter();
      return drawOnline(activeUser);
    }

    const goalUser = await ask("An welchen Benutzer senden?");

    const check = await checkForUser(goalUser);
    if (!check.ok) {
      console.log(`# ${check.error}`);
      await waitEnter();
      return drawOnline(activeUser);
    }

    const result = await sendPlaylist(activeUser, goalUser, selected);

    if (!result.ok) console.log(`# Fehler: ${result.error}`);
    else console.log(`✔ ${result.message}`);

    await sleep(1000);
    return drawOnline(activeUser);
  }

  if (action === "search") {
    const r = await listPublicPlaylists();
    if (!r.ok) {
      console.log(`# Fehler: ${r.error}`);
      await waitEnter();
      return drawOnline(activeUser);
    }

    const items = r.items;
    if (items.length === 0) {
      console.log("Keine öffentlichen Playlists gefunden.");
      await waitEnter();
      return drawOnline(activeUser);
    }

    const chosen = await askChoice("Playlist auswählen:", [
      ...items.map((pl) => ({
        name: `${pl.name} — by ${pl.username} — ${pl.songs.length} Songs`,
        value: { user: pl.username, name: pl.name },
      })),
      {
        name: "❌ Abbrechen",
        value: null,
      },
    ]);

    if (chosen === null) {
      return drawOnline(activeUser);
    }

    const d = await getPublicPlaylistDetail(chosen.user, chosen.name);

    if (!d.ok) {
      console.log(`# Fehler: ${d.error}`);
      await waitEnter();
      return drawOnline(activeUser);
    }

    const detail = d.detail;
    console.clear();
    header(`${detail.playlist.name} (Public)`);

    const songs = detail.playlist.songs;

    if (songs.length === 0) {
      const save = await askConfirm("Leere Playlist speichern?");
      if (save)
        await sendPlaylist(chosen.user, activeUser, detail.playlist.name);
      return drawOnline(activeUser);
    }

    console.log(await formatSongs(detail.playlist));
    console.log("");

    const save = await askConfirm("Diese Playlist speichern?");
    if (save) await sendPlaylist(chosen.user, activeUser, detail.playlist.name);

    return drawOnline(activeUser);
  }

  if (action === "back") {
    return drawMenu(activeUser, true);
  }
}
