import { ask, askPassword, askChoice } from "../../services/prompt.ts";
import { createUser, validateUser } from "../Backend/authentication.ts";
import { initUser } from "../Backend/playlist.ts";
import { drawMenu } from "./menu.ts";
import { header } from "../../services/header.ts";

export let activeUser = "";

async function signUpUser(): Promise<void> {
  console.clear();
  header("Konto erstellen")

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
  header("Einloggen")

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
  header("Willkommen bei mAI music")
  console.log("(Bitte melden Sie sich an)\n")

  const action = await askChoice("Bitte auswählen:", [
    { name: "Konto erstellen", value: "signup" },
    { name: "Einloggen", value: "login" },
    { name: "Beenden", value: "exit"}
  ]);

  if (action === "signup") await signUpUser();
  else if(action === "login") await loginUser();
  else return

  if (activeUser) drawMenu(activeUser, false);
}