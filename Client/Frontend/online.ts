import { question, questionInt } from "readline-sync";
import { drawMenu } from "./menu.ts";
import { getPlaylists } from "../Backend/playlist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { sendPlaylist } from "../Backend/onlineServices.ts";
import { sleep } from "./menu.ts";
import { listPublicPlaylists, getPublicPlaylistDetail, getSongInfoPublic } from "../Backend/onlineServices.ts";

export async function drawOnline(activeUser : string){
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");
    console.log(`\n------------------------\n${activeUser}'s Online Hub\n------------------------`);

    //benachrichtugung für erhaltene playlist

    let menu : number = questionInt(">>> Playlists verschicken (1)\n>>> Playlists suchen (2)\n>>> Benachrichtigungen (3)\n>>> Zurück (0)\n\n> ")
    
    switch(menu){
        case 1:
            const playlists = await getPlaylists(activeUser);
            console.log(formatPlaylists(playlists));

            let name = question("~ Welche Playlist willst du verschicken?\n> ");
            if (name === "") {
                console.log("# Gib einen gültigen Namen ein!");
                return drawOnline(activeUser);
            }

            let goalUser = question("\n~ An wen willst du die Playlist schicken?\n> ")

            const result = await sendPlaylist(activeUser, goalUser, name);

            if (!result.ok) {
                 console.log("# Fehler:", result.error);
             }
             else {
                console.log("✔ " + result.message);
            }
            console.log(`Playlist "${name}" wird an ${goalUser} gesendet.`)
            for (let i = 0; i < 5; i++) {
                process.stdout.write(".\n")
                await sleep(500)
            }
            await sleep(200)
            return drawOnline(activeUser)
            
        case 2: {
            console.clear();
            console.log("\n                     |========= Öffentliche Playlists =========|\n");

            const r = await listPublicPlaylists();
            if (!r.ok) {
                console.log("# Fehler:", r.error);
                question("\n(Enter) zurück…");
                return drawOnline(activeUser);
            }

            const items = r.items;

            if (!Array.isArray(items) || items.length === 0) {
                console.log("Keine öffentlichen Playlists gefunden.");
                question("\n(Enter) zurück…");
                return drawOnline(activeUser);
            }

            items.forEach((pl, i) => {
                console.log(`${i + 1}. ${pl.name} (public) — by ${pl.username} — ${pl.songs.length} Song(s)`);
            });

            const idx = questionInt("\nWelche Playlist ansehen? (Nummer, 0 = zurück)\n> ");
            if (idx === 0) return drawOnline(activeUser);

            // 💡 Harte Grenzenprüfung → danach ist der Zugriff sicher
            if (!Number.isInteger(idx) || idx < 1 || idx > items.length) {
                console.log("# Ungültige Auswahl.");
                question("\n(Enter) zurück…");
                return drawOnline(activeUser);
            }

            const selIndex = idx - 1;
            const sel = items[selIndex];

            // 🔒 Zusätzlicher Guard: TS weiß jetzt sicher, dass `sel` existiert
            if (!sel) {
                console.log("# Unerwarteter Fehler: Auswahl ist leer.");
                question("\n(Enter) zurück…");
                return drawOnline(activeUser);
            }

            const d = await getPublicPlaylistDetail(sel.username, sel.name);
            if (!d.ok) {
                console.log("# Fehler:", d.error);
                question("\n(Enter) zurück…");
                return drawOnline(activeUser);
            }

            const detail = d.detail;

            console.clear();
            console.log("\n                     |========= Öffentliche Playlist =========|\n");
            console.log(`| ${detail.playlist.name} (public) — ${detail.playlist.songs.length} Song(s) — by ${detail.username}`);

            const songs = Array.isArray(detail.playlist.songs) ? detail.playlist.songs : [];

            if (songs.length === 0) {
                console.log("\n# Diese Playlist enthält keine Songs.");
                question("\n(Enter) zurück…");
                return drawOnline(activeUser);
            }

            // 👉 Songs 1-basiert anzeigen
            songs.forEach((id, i) => {
                if (typeof id === "string" && id.length > 0) {
                    console.log(`  ${i + 1}. Song-ID: ${id}`);
                }
            });

            // 👉 1-basiert abfragen
            const songNum = questionInt("\nSong-Details ansehen? (Nummer, 0 = überspringen)\n> ");

            if (songNum === 0) return drawOnline(activeUser);

            const si = songNum - 1; // 1 → 0

            // 👉 Harte Grenzenprüfung
            if (!Number.isInteger(songNum) || si < 0 || si >= songs.length) {
                console.log("\n# Ungültige Nummer.");
                question("\n(Enter) weiter…");
                return drawOnline(activeUser);
            }

            const candidate = songs[si];

            // 👉 wegen noUncheckedIndexedAccess zusätzlich absichern
            if (typeof candidate !== "string" || candidate.length === 0) {
                console.log("\n# Ungültige Song-Auswahl.");
                question("\n(Enter) weiter…");
                return drawOnline(activeUser);
            }

            const info = await getSongInfoPublic(candidate);

            if (info.ok) {
                const s = info.song;
                console.log(`\nID: ${s.id}\nTitel: ${s.title}\nArtist: ${s.artist}\nAlbum: ${s.album}\nDauer: ${s.duration}s`);
            } else {
                console.log("\n# " + info.error);
            }

            question("\n(Enter) weiter…");
            return drawOnline(activeUser);
            }
        case 3:
            //funktioniert aktuell nicht
            drawOnline(activeUser)
            break
        case 0:
            return drawMenu(activeUser, true)
        default:
            console.log("nöööö")
            break
    }
}