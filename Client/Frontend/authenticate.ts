import { questionInt, question } from "readline-sync";
import { createUser, validateUser } from "../Backend/authentication.ts";
import { drawMenu } from "./menu.ts";
import { addToPlaylist } from "../Backend/playlist_data.ts";

// Frontend-State: aktiver Benutzer
export let activeUser: string

async function signUpUser(): Promise<void> {
    console.log("\n------------------------\nKonto erstellen\n------------------------");
    const name: string = question("Benutzername: ");
    const password: string = question("Passwort: ", { hideEchoBack: true });
    const temp: string = question("Passwort erneut: ", { hideEchoBack: true });

    if (password !== temp) {
        console.log("\n# Passwörter stimmen nicht überein. Bitte versuche es erneut.");
        return signUpUser();
    }

    const result = await createUser(name, password);
    if (!result.ok) {
        console.log(`\n# ${result.error}`);
        return signUpUser();
    }

    activeUser = result.username;
    addToPlaylist(result.username);
}

async function loginUser(): Promise<void> {
    console.log("\n------------------------\nEinloggen\n------------------------");
    const name: string = question("Benutzername: ");
    const password: string = question("Passwort: ", { hideEchoBack: true });

    const result = await validateUser(name, password);
    if (!result.ok) {
        console.log(`\n# ${result.error}`);
        return loginUser();
    }

    activeUser = result.username;
    addToPlaylist(result.username);
}

export async function authenticate(): Promise<void> {
    console.clear();
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");

    const login: number = questionInt(
        "\n>>> Bitte erstelle ein Konto! (1)\n>>> Du besitzt schon ein Konto? Logge dich ein! (2)\n\n> "
    );

    switch (login) {
        case 1:
            console.clear();
            await signUpUser();
            break;
        case 2:
            console.clear();
            await loginUser();
            break;
        default:
            return;
    }

    // Nur weiter, wenn es wirklich einen aktiven User gibt
    if (activeUser) {
        drawMenu(activeUser, false);
    }
}
``