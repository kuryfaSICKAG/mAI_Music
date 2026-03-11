import { ask, askInt, askPassword } from "../../services/prompt.ts";
import { drawMenu } from "./menu.ts";


export async function drawSong(activeUser : string){
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");
    console.log(`\n------------------------\n${activeUser} - Song-Suche\n------------------------`);

    let menu : number = await askInt(">>> Suche starten (1)\n>>> Zurück (0)\n\n> ")

    switch(menu){
        case 1:
            console.log("suche nach...")
            break
        case 0:
            return drawMenu(activeUser, true)
        default:
            console.log("nöööö")
    }
}