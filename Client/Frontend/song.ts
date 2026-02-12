import { question, questionInt } from "readline-sync";


export function drawSong(activeUser : string){
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");
    console.log(`\n------------------------\n${activeUser} - Songs suchen nach Kriterien\n------------------------`);

    let menu : number = questionInt(">>> Titel (1)\n>>> Lyrics (2)\n>>> Künstler/Band (3)\n>>> Zurück (4)\n\n> ")

    switch(menu){
        case 1:
            console.log("nach titel suchen")
            break
        case 2:
            console.log("nach lyrics suchen")
            break
        case 3:
            console.log("nach künstler/band suchen")
            break
        case 4:
            return drawSong(activeUser)
        default:
            console.log("nöööö")
    }
}