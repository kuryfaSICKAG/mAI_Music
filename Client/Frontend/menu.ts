import { questionInt } from "readline-sync";
import { authenticate } from "./authenticate.ts";
import { drawPlaylist } from "./drawPlaylist.ts";
import { drawOnline } from "./online.ts";
import { drawSong } from "./song.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function drawMenu(activeUser: string, loggedIn : boolean) {
    if(!loggedIn){
        console.log(`Du wirst eingeloggt als "${activeUser}"`)
        for (let i = 0; i < 5; i++) {
            process.stdout.write(".\n")
            await sleep(500)
        }
        await sleep(200)
    }
    
    console.clear()
    console.log("\n                     |========= Willkommen bei mAI music =========|")
    console.log(`\n------------------------\n${activeUser}'s Homepage\n------------------------`)

    let menu : number = questionInt(">>> Playlists verwalten (1)\n>>> Songs suchen (2)\n>>> Online-Funktionen (3)\n>>> Abmelden (4)\n\n> ")

    switch(menu){
        case 1:
            drawPlaylist(activeUser)
            break
        case 2:
            drawSong(activeUser)
            break
        case 3:
            drawOnline(activeUser)
            break
        case 4:
            return authenticate()
        default:
            console.log("nöööö")
    }
}