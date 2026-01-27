import { questionInt, question } from "readline-sync";
import { createUser, validateUser } from "../utils/util.ts";

export function drawMenu(){
    console.log("\n                     |========= Willkommen bei mAI music =========|")

    let login : number
    login = questionInt("\n>>> Bitte erstelle ein Konto! (1)\n>>> Du besitzt schon ein Konto? Logge dich ein! (2)\n\n> ")

    switch(login){
        case 1:
            signUpUser()
            break;
        case 2:
            loginUser()
            break
        default:
            console.log("nö")
    }

    console.log("\n")
}

function signUpUser() {
    const name = question("\nBenutzername: ")
    const password = question("Passwort: ", {hideEchoBack: true})
    const temp = question("Passwort erneut: ", {hideEchoBack: true})
    
    if(password!==temp){
        console.log("Passwörter stimmen nicht überein.")
        return null
    }

    const user = createUser(name, password);
    return user;
}

function loginUser() {
    const name = question("\nBenutzername: ")
    const password = question("Passwort: ", {hideEchoBack: true})

    const user = validateUser(name, password);
    return user;
}


