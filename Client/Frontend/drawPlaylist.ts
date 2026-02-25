import { questionInt, question, keyInYN } from "readline-sync";
import { drawMenu } from "./menu.ts";
import { getPlaylists, createPlaylist, deletePlaylist } from "../Backend/playlist.ts";
import { editPlaylist } from "./editPlaylist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import type { Playlist } from "../../models/personalModels.ts";

export async function drawPlaylist(activeUser: string): Promise<void> {
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");
    console.log(`\n------------------------\n${activeUser}'s Playlists\n------------------------`);

    // 🔥 WICHTIG: await benutzen!
    const playlists = await getPlaylists(activeUser);
    console.log(formatPlaylists(playlists));

    const menu: number = questionInt(
        "\n>>> Erstellen (1)\n>>> Bearbeiten (2)\n>>> Löschen   (3)\n>>> Zurück    (4)\n\n> "
    );

    let name: string;

    switch (menu) {
        case 1: {
            console.clear();
            console.log("\n                     |========= Willkommen bei mAI music =========|");
            console.log(`\n------------------------\n${activeUser}'s Playlists\nNeue Playlist erstellen\n------------------------`);

            name = question("~ Wie soll die Playlist heißen?\n> ");
            if (name === "") {
                console.log("# Gib einen gültigen Namen ein!");
                return drawPlaylist(activeUser);
            }

            await createPlaylist(activeUser, name);

            const nowEdit = question(`Willst du deine erstellte Playlist "${name}" direkt bearbeiten (y/n)?\n> `);
            if (nowEdit.toLowerCase() === "y") {
                return editPlaylist(name);
            }

            return drawPlaylist(activeUser);
        }

        case 2: {
            console.clear();
            console.log("\n                     |========= Willkommen bei mAI music =========|");
            console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist bearbeiten\n------------------------`);

            const lists: Playlist[] = await getPlaylists(activeUser);

            if (lists.length === 0) {
                console.log("# Du hast keine Playlists zum Bearbeiten!");
                return drawPlaylist(activeUser);
            }

            console.log(formatPlaylists(lists));

            name = question("\n~ Welche Playlist willst du bearbeiten?\n> ");

            if (!lists.some(pl => pl.name === name)) {
                console.log(`# Die Playlist "${name}" existiert nicht!`);
                return drawPlaylist(activeUser);
            }

            return editPlaylist(name);
        }

        case 3: {
            console.clear();
            console.log("\n                     |========= Willkommen bei mAI music =========|");
            console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist löschen\n------------------------`);

            const lists = await getPlaylists(activeUser);
            console.log(formatPlaylists(lists));

            name = question("\n~ Welche Playlist willst du löschen?\n> ");
            if (name === "") {
                console.log("# Gib einen gültigen Namen ein!");
                return drawPlaylist(activeUser);
            }

            await deletePlaylist(activeUser, name);

            return drawPlaylist(activeUser);
        }

        case 4:
            return drawMenu(activeUser, true);

        default:
            console.log("nöööö");
            return drawPlaylist(activeUser);
    }
}