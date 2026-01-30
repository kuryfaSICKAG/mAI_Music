import { questionInt, question } from "readline-sync";
import { activeUser, createUser, validateUser } from "../utils/user_data.ts";
import { drawMenu } from "./menu.ts";
import { addToPlaylist } from "../utils/playlist_data.ts";

function signUpUser() {
    console.log("\n------------------------\nKonto erstellen\n------------------------")
    const name : string = question("Benutzername: ")
    const password : string = question("Passwort: ", {hideEchoBack: true})
    const temp : string = question("Passwort erneut: ", {hideEchoBack: true})
    
    if(password!==temp){
        console.log("\# Passwörter stimmen nicht überein. Bitte versuche es erneut.")
        return signUpUser()
    }

    createUser(name, password)
    addToPlaylist(name)
}

function loginUser() {
    console.log("\n------------------------\nEinloggen\n------------------------")
    const name : string = question("Benutzername: ")
    const password : string = question("Passwort: ", {hideEchoBack: true})

    if(!validateUser(name, password)) return loginUser()
    addToPlaylist(name)
}

export function authenticate(){
    console.clear()
    console.clear()
    console.log("\n                     |========= Willkommen bei mAI music =========|")

    let login : number = questionInt("\n>>> Bitte erstelle ein Konto! (1)\n>>> Du besitzt schon ein Konto? Logge dich ein! (2)\n\n> ")

    switch(login){
        case 1:
            console.clear()
            signUpUser()
            drawMenu(activeUser, false)
            break;
        case 2:
            console.clear()
            loginUser()
            drawMenu(activeUser, false)
            break
        default:
            return
    }
}



