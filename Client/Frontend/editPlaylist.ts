import { renamePlaylist, addSong, removeSongByIndex, getPlaylists, setPlaylistStatus, togglePlaylistStatus, getPlaylistStatus } from "../Backend/playlist.ts";
import { activeUser } from "./authenticate.ts";
import { question, questionInt } from "readline-sync";
import { drawPlaylist } from "./drawPlaylist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { type Playlist } from "../../models/personalModels.ts";

export async function editPlaylist(name: string): Promise<void> {
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");
    console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist "${name}" bearbeiten\n------------------------`);

    // Wenn Name leer -> nachfragen
    if (name === "") {
        console.log(formatPlaylists(await getPlaylists(activeUser)));

        name = question("~ Welche Playlist willst du bearbeiten?\n> ");
        if (name === "") {
            console.log("# Gib einen gültigen Namen ein!");
            return editPlaylist(name);
        }
    }

    const menu: number = questionInt(
        ">>> Playlist umbenennen (1)\n" +
        ">>> Playlist öffentlich/privat stellen (2)\n" +
        ">>> Song hinzufügen (3)\n" +
        ">>> Song entfernen (4)\n" +
        ">>> Zurück (5)\n\n> "
    );

    switch (menu) {
        case 1: {
            // Playlist umbenennen
            const oldName = name;
            const newName = question(`Alter Name: ${oldName}\nNeuen Namen eingeben:\n> `);

            if (newName === "") {
                console.log("# Gib einen gültigen Namen ein!");
                return editPlaylist(name);
            }

            await renamePlaylist(activeUser, oldName, newName);
            name = newName;
            return editPlaylist(name);
        }

        case 2: {
            try {
                const current = await getPlaylistStatus(activeUser, name);
                console.log(`\nAktueller Status: ${current === "public" ? "🔓 public" : "🔒 private"}`);

                const choice = questionInt(
                "\nStatus ändern:\n" +
                "  (1) Auf 'public' setzen\n" +
                "  (2) Auf 'private' setzen\n" +
                "  (3) Toggle (umschalten)\n" +
                "  (4) Abbrechen\n\n> "
                );

                switch (choice) {
                case 1: {
                    const next = await setPlaylistStatus(activeUser, name, "public");
                    console.log(`\n✔ Status auf '${next}' gesetzt.`);
                    break;
                }
                case 2: {
                    const next = await setPlaylistStatus(activeUser, name, "private");
                    console.log(`\n✔ Status auf '${next}' gesetzt.`);
                    break;
                }
                case 3: {
                    const next = await togglePlaylistStatus(activeUser, name);
                    console.log(`\n✔ Status umgeschaltet auf '${next}'.`);
                    break;
                }
                case 4: {
                    console.log("\nAbgebrochen.");
                    break;
                }
                default: {
                    console.log("\nUngültige Auswahl.");
                    break;
                }
                }
            } catch (e: any) {
                console.log(`# Fehler: ${e?.message ?? "Konnte Status nicht ändern."}`);
                // Optional: kurze Pause, damit die Meldung sichtbar bleibt
                question("\n(Enter) weiter…");
            }
            return editPlaylist(name);
            }

        case 3: {
            // Song hinzufügen
            const songId = question("Song-ID (Deezer Track ID):\n> ");
            if (!songId.trim()) {
                console.log("# Ungültige Song-ID!");
                return editPlaylist(name);
            }

            await addSong(activeUser, name, songId.trim());

            console.log(`\n✔ Song-ID "${songId.trim()}" hinzugefügt!`);
            return editPlaylist(name);
        }

        case 4: {
            // Song löschen
            const playlists: Playlist[] = await getPlaylists(activeUser);
            const playlist = playlists.find((p: Playlist) => p.name === name);

            if (!playlist) {
                console.log("# Playlist nicht gefunden!");
                return drawPlaylist(activeUser);
            }

            console.log("\nSongs:");
            playlist.songs.forEach((songId: string, i: number) => {
                console.log(`${i}: ${songId}`);
            });

            const idx = questionInt("\nWelchen Song löschen? (Index)\n> ");
            if (idx < 0 || idx >= playlist.songs.length) {
                console.log("# Ungültiger Index!");
                return editPlaylist(name);
            }

            await removeSongByIndex(activeUser, name, idx);

            console.log(`\n✔ Song entfernt!`);
            return editPlaylist(name);
        }

        case 5:
            return drawPlaylist(activeUser);

        default:
            console.log("nöööö");
            return editPlaylist(name);
    }
}