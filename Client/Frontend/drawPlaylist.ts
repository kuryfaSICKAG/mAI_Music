import { questionInt, question } from "readline-sync";
import { drawMenu } from "./menu.ts";
import { getPlaylists, createPlaylist, deletePlaylist } from "../Backend/playlist.ts";
import { editPlaylist } from "./editPlaylist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import type { Playlist } from "../../models/personalModels.ts";

/**
 * Beweist dem TS-Compiler, dass 'idx' ein valider Array-Index ist.
 * Damit ist 'arr[idx]' garantiert NICHT undefined (auch mit noUncheckedIndexedAccess).
 */
function assertInRange<T>(arr: T[], idx: number, msg = "# Ungültige Nummer!"): asserts idx is number {
  if (!Number.isInteger(idx) || idx < 0 || idx >= arr.length) {
    throw new Error(msg);
  }
}

/** Liest eine 1-basierte Nummer ein und liefert den 0-basierten Index zurück */
function askOneBasedToZeroBased(prompt: string): number {
  const oneBased = questionInt(prompt);
  return oneBased - 1;
}

export async function drawPlaylist(activeUser: string): Promise<void> {
  console.clear();
  console.log("\n                     |========= Willkommen bei mAI music =========|");
  console.log(`\n------------------------\n${activeUser}'s Playlists\n------------------------`);

  // 👉 Nur einmal laden – überall nutzen
  const lists: Playlist[] = await getPlaylists(activeUser);
  console.log(formatPlaylists(lists)); // (1-basiert formatiert)

  const menu: number = questionInt(
    "\n>>> Erstellen (1)\n>>> Bearbeiten (2)\n>>> Löschen   (3)\n>>> Zurück    (0)\n\n> "
  );

  switch (menu) {
    // ---------------------------------------------------------------
    // 1) Playlist erstellen
    // ---------------------------------------------------------------
    case 1: {
      console.clear();
      console.log("\n                     |========= Willkommen bei mAI music =========|");
      console.log(`\n------------------------\n${activeUser}'s Playlists\nNeue Playlist erstellen\n------------------------`);

      const name = question("~ Wie soll die Playlist heißen?\n> ").trim();
      if (name === "") {
        console.log("# Gib einen gültigen Namen ein!");
        return drawPlaylist(activeUser);
      }

      await createPlaylist(activeUser, name);

      const nowEdit = question(
        `Willst du deine erstellte Playlist "${name}" direkt bearbeiten (y/n)?\n> `
      ).trim().toLowerCase();

      if (nowEdit === "y") return editPlaylist(name);
      return drawPlaylist(activeUser);
    }

    // ---------------------------------------------------------------
    // 2) Playlist bearbeiten (User-Eingabe 1-basiert)
    // ---------------------------------------------------------------
    case 2: {
      console.clear();
      console.log("\n                     |========= Willkommen bei mAI music =========|");
      console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist bearbeiten\n------------------------`);

      if (lists.length === 0) {
        console.log("# Du hast keine Playlists zum Bearbeiten!");
        return drawPlaylist(activeUser);
      }

      console.log(formatPlaylists(lists));

      try {
        const idx = askOneBasedToZeroBased("\n~ Welche Playlist willst du bearbeiten? (Nummer)\n> ");
        assertInRange(lists, idx);              // ✅ beweist: Index gültig
        const selected = lists[idx]!;            // ✅ Typ: Playlist (nicht undefined)
        return editPlaylist(selected.name);
      } catch (e) {
        console.log((e as Error).message);
        return drawPlaylist(activeUser);
      }
    }

    // ---------------------------------------------------------------
    // 3) Playlist löschen (User-Eingabe 1-basiert, y/n-Bestätigung)
    // ---------------------------------------------------------------
    case 3: {
      console.clear();
      console.log("\n                     |========= Willkommen bei mAI music =========|");
      console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist löschen\n------------------------`);

      if (lists.length === 0) {
        console.log("# Du hast keine Playlists zum Löschen!");
        return drawPlaylist(activeUser);
      }

      console.log(formatPlaylists(lists));

      try {
        const idx = askOneBasedToZeroBased("\n~ Welche Playlist willst du löschen? (Nummer)\n> ");
        assertInRange(lists, idx);              // ✅ beweist: Index gültig
        const selected = lists[idx]!;            // ✅ Typ: Playlist

        const confirm = question(
          `Willst du die Playlist "${selected.name}" wirklich löschen? (y/n)\n> `
        ).trim().toLowerCase();

        if (confirm !== "y") {
          console.log("Abgebrochen.");
          return drawPlaylist(activeUser);
        }

        await deletePlaylist(activeUser, selected.name);
        console.log(`✔️ Playlist "${selected.name}" wurde gelöscht.`);

        return drawPlaylist(activeUser);
      } catch (e) {
        console.log((e as Error).message);
        return drawPlaylist(activeUser);
      }
    }

    // ---------------------------------------------------------------
    // 0) Menü zurück
    // ---------------------------------------------------------------
    case 0:
      return drawMenu(activeUser, true);

    // ---------------------------------------------------------------
    // Fallback
    // ---------------------------------------------------------------
    default:
      console.log("nöööö");
      return drawPlaylist(activeUser);
  }
}