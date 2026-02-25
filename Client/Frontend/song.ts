import { question, questionInt } from "readline-sync";
import { drawMenu } from "./menu.ts";


export function drawSong(activeUser : string){
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");
    console.log(`\n------------------------\n${activeUser} - Song-Suche\n------------------------`);

    let menu : number = questionInt(">>> Suche starten (1)\n>>> Zurück (2)\n\n> ")

    switch(menu){
        case 1:
            console.log("suche nach...")
            break
        case 2:
            return drawMenu(activeUser, true)
        default:
            console.log("nöööö")
    }
}