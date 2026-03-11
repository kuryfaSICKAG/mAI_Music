import { ask, askPassword, askChoice } from "../../services/prompt.ts";
import { createUser, validateUser } from "../Backend/authentication.ts";
import { initUser } from "../Backend/playlist.ts";
import { drawMenu } from "./menu.ts";

export let activeUser = "";

async function signUpUser(): Promise<void> {
  console.clear();
  console.log("\n------------------------\nKonto erstellen\n------------------------");

  const name = await ask("Benutzername:");
  const pw = await askPassword("Passwort:");
  const pw2 = await askPassword("Passwort erneut:");

  if (pw !== pw2) {
    console.log("\n# Passwörter stimmen nicht überein.");
    return signUpUser();
  }

  const result = await createUser(name, pw);
  if (!result.ok) {
    console.log(`# ${result.error}`);
    return signUpUser();
  }

  activeUser = result.username;
  await initUser(activeUser);

  console.log(`\n✔ Benutzer "${activeUser}" erfolgreich erstellt!`);
}

async function loginUser(): Promise<void> {
  console.clear();
  console.log("\n------------------------\nEinloggen\n------------------------");

  const name = await ask("Benutzername:");
  const pw = await askPassword("Passwort:");

  const result = await validateUser(name, pw);
  if (!result.ok) {
    console.log(`# ${result.error}`);
    return loginUser();
  }

  activeUser = result.username;
  await initUser(activeUser);

  console.log(`\n✔ Willkommen zurück, ${activeUser}!`);
}

export async function authenticate(): Promise<void> {
  console.clear();
  console.log("\nWillkommen bei mAI music");

  const action = await askChoice("Bitte auswählen:", [
    { name: "Konto erstellen", value: "signup" },
    { name: "Einloggen", value: "login" }
  ]);

  if (action === "signup") await signUpUser();
  else await loginUser();

  if (activeUser) drawMenu(activeUser, false);
}