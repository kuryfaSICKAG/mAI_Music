import { renamePlaylist, addSong, removeSongByIndex, getPlaylists } from "../Backend/playlist.ts";
import { activeUser } from "./authenticate.ts";
import { question, questionInt } from "readline-sync";
import { drawPlaylist } from "./drawPlaylist.ts";
import { formatPlaylists } from "../Backend/format.ts";

type Playlist = {
    name: string;
    songs: any[];
};

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
        ">>> Song hinzufügen (2)\n" +
        ">>> Song entfernen (3)\n" +
        ">>> Zurück (4)\n\n> "
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
            // Song hinzufügen
            const songName = question("Songname:\n> ");
            if (!songName.trim()) {
                console.log("# Ungültiger Name!");
                return editPlaylist(name);
            }

            const year = questionInt("Jahr:\n> ");
            const duration = questionInt("Dauer (Sekunden):\n> ");

            await addSong(activeUser, name, {
                name: songName,
                year,
                duration
            });

            console.log(`\n✔ Song "${songName}" hinzugefügt!`);
            return editPlaylist(name);
        }

        case 3: {
            // Song löschen
            const playlists: Playlist[] = await getPlaylists(activeUser);
            const playlist = playlists.find((p: Playlist) => p.name === name);

            if (!playlist) {
                console.log("# Playlist nicht gefunden!");
                return drawPlaylist(activeUser);
            }

            console.log("\nSongs:");
            playlist.songs.forEach((s: any, i: number) => {
                console.log(`${i}: ${s.name} (${s.year}) - ${s.duration}s`);
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

        case 4:
            return drawPlaylist(activeUser);

        default:
            console.log("nöööö");
            return editPlaylist(name);
    }
}