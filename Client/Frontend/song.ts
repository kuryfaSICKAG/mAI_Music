import { ask, askInt, askPassword } from "../../services/prompt.ts";
import { drawMenu } from "./menu.ts";
import { searchSong, addToPlaylist, getTrackNameFromID } from "../../services/service.ts";
import { getPlaylists } from "../Backend/playlist.ts";
import { formatPlaylists } from "../Backend/format.ts";

export async function drawSong(activeUser : string){
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");
    console.log(`\n------------------------\n${activeUser} - Song-Suche\n------------------------`);

    let menu : number = await askInt(">>> Suche starten (1)\n>>> Zurück (0)\n\n> ")

    switch(menu){
        case 1:
            console.log(activeUser)
            let search = ask("Suchkriterien eingeben:")
            let searchResults = await searchSong(await search)
            const j = await ask("\n>>> Möchtest du einen Song Hinzufügen? (y/n)");
            switch(j){
                case "y": {
                    const k = await askInt("\n>>> Bitte gib die Nummer des Songs ein, den du hinzufügen möchtest: ");
                    if(k<=0) break;
                    const song = searchResults[k-1];
                    if (song == null) {
                        console.log("Ungültige Song-Nummer.");
                        break;
                    }
                    const songId = String(song);
                    const title = await getTrackNameFromID(songId);
                    const lists = await getPlaylists(activeUser);
                    if (lists.length === 0) console.log("Keine Playlists vorhanden.");
                    else console.log(formatPlaylists(lists));
                    const playlistNr = await askInt("Gib die Nummer der Playlist ein, zu der du den Song hinzufügen möchtest: ");
                    const playlistName = lists[playlistNr-1]?.name;
                    if (!playlistName) {
                        console.log("Ungültige Playlist-Nummer.");
                        break;
                    }
                    const addResult = await addToPlaylist(songId, playlistName, activeUser)
                    if (addResult === "added") {
                        console.log(`Du hast den Song "${title}" mit der ID "${songId}" zu ${playlistName} hinzugefügt!`);
                    } else if (addResult === "exists") {
                        console.log(`Der Song "${title}" mit der ID ${songId} ist bereits in der Playlist ${playlistName}.`);
                    } else {
                        console.log("Song konnte nicht gespeichert werden (User/Playlist prüfen).");
                    }
                    return drawSong(activeUser)
                }
            }
            
            break
        case 0:
            return drawMenu(activeUser, true)
        default:
            console.log("nöööö")
    }
}