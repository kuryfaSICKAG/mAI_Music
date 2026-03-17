import {
  ask,
  askChoice,
  askConfirm,
  waitEnter,
} from "../../services/prompt.ts";
import { drawMenu } from "./menu.ts";
import {
  getPlaylists,
  createPlaylist,
  deletePlaylist,
} from "../Backend/playlist.ts";
import { editPlaylist, lookupPlaylist } from "./editPlaylist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { header } from "../../services/ui.ts";

export async function drawPlaylist(activeUser: string): Promise<void> {
  console.clear();
  header(`${activeUser}'s Playlists`);

  const lists = await getPlaylists(activeUser);
  if (lists.length === 0) console.log("Keine Playlists vorhanden.");
  else console.log(formatPlaylists(lists));

  const choice = await askChoice("Option wählen:", [
    { name: "Playlist einsehen", value: "lookup" },
    { name: "Playlist erstellen", value: "create" },
    { name: "Playlist bearbeiten", value: "edit" },
    { name: "Playlist löschen", value: "delete" },
    { name: "Zurück", value: "back" },
  ]);

  if (choice === "lookup") {
    if (lists.length === 0) return drawPlaylist(activeUser);

    const selected = await askChoice(
      "Welche Playlist einsehen?",
      lists.map((p) => ({
        name: `${p.name} (${p.songs.length} Songs)`,
        value: p.name,
      })),
    );
    await lookupPlaylist(selected);
  }

  if (choice === "create") {
    const name = await ask("Wie soll die Playlist heißen?");
    if (name === "") {
      console.log("# Der Name darf nicht leer sein.");
      await waitEnter();
      return drawPlaylist(activeUser);
    }
    await createPlaylist(activeUser, name);

    const editNow = await askConfirm(`Playlist "${name}" jetzt bearbeiten?`);
    if (editNow) return editPlaylist(name);

    return drawPlaylist(activeUser);
  }

  if (choice === "edit") {
    if (lists.length === 0) return drawPlaylist(activeUser);

    const selected = await askChoice(
      "Welche Playlist bearbeiten?",
      lists.map((p) => ({
        name: `${p.name} (${p.songs.length} Songs)`,
        value: p.name,
      })),
    );

    return editPlaylist(selected);
  }

  if (choice === "delete") {
    if (lists.length === 0) return drawPlaylist(activeUser);

    const selected = await askChoice(
      "Welche Playlist löschen?",
      lists.map((p) => ({
        name: `${p.name} (${p.songs.length} Songs)`,
        value: p.name,
      })),
    );

    const ok = await askConfirm(`Playlist "${selected}" wirklich löschen?`);
    if (ok) await deletePlaylist(activeUser, selected);

    return drawPlaylist(activeUser);
  }

  return drawMenu(activeUser, true);
}
