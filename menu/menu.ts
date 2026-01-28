import { questionInt, question } from "readline-sync";
import { createUser, validateUser } from "../utils/user_data.ts";
import promptSync from "prompt-sync"


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

const prompt = promptSync({ sigint: true });

function signUpUser() {
    const name = question("\nBenutzername: ")
    const password = prompt("Passwort: ", { echo: "*" });
    const temp = prompt("Passwort erneut: ", { echo: "*" });
    
    if(password!==temp){
        console.log("Passwörter stimmen nicht überein.")
        return null
    }

    const user = createUser(name, password);
    return user;
}

function loginUser() {
    const name = question("\nBenutzername: ")
    const password = prompt("Passwort: ", { echo: "*" });

    const user = validateUser(name, password);
    return user;
}


