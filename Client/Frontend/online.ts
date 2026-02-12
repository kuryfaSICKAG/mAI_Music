import { question, questionInt } from "readline-sync";
import { drawMenu } from "./menu.ts";
import { getPlaylists } from "../Backend/playlist.ts";
import { formatPlaylists } from "../Backend/format.ts";
import { sendPlaylist } from "../Backend/onlineServices.ts";

export async function drawOnline(activeUser : string){
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");
    console.log(`\n------------------------\n${activeUser}'s Online Hub\n------------------------`);

    //benachrichtugung für erhaltene playlist

    let menu : number = questionInt(">>> Playlists verschicken (1)\n>>> Playlists suchen (2)\n>>> Benachrichtugungen (3)\n>>> Zurück (4)\n\n> ")
    
        switch(menu){
            case 1:
                const playlists = await getPlaylists(activeUser);
                console.log(formatPlaylists(playlists));

                let name = question("~ Welche Playlist willst du bearbeiten?\n> ");
                if (name === "") {
                    console.log("# Gib einen gültigen Namen ein!");
                    return drawOnline(activeUser);
                }

                let goalUser = question("\n~ An wen willst du die Playlist schicken?\n> ")

                const result = await sendPlaylist(activeUser, goalUser, name);

                if (!result.ok) {
                    console.log("# Fehler:", result.error);
                } else {
                    console.log("✔ " + result.message);
                }
                break
            case 2:
                //falls online/private playlists noch möglich sind
                break
            case 3:
                drawOnline(activeUser)
                break
            case 4:
                return drawMenu(activeUser, true)
            default:
                console.log("nöööö")
        }
}