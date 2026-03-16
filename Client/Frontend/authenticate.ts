import { ask, askPassword, askChoice, waitEnter } from "../../services/prompt.ts";
import { createUser, validateUser } from "../Backend/authentication.ts";
import { initUser } from "../Backend/playlist.ts";
import { drawMenu, sleep } from "./menu.ts";
import { header } from "../../services/ui.ts";

export let activeUser = "";

async function signUpUser(): Promise<void> {
  console.clear();
  header("Konto erstellen");

  const name = await ask("Benutzername:");
  const pw = await askPassword("Passwort:");
  const pw2 = await askPassword("Passwort erneut:");

  if(name === "" || pw === "") {
    console.log("\n# Benutzername oder Passwort dürfen nicht leer sein.")
    await waitEnter()
    return authenticate()
  }

  if (pw !== pw2) {
    console.log("\n# Passwörter stimmen nicht überein.");
    await waitEnter()
    return authenticate();
  }

  const result = await createUser(name, pw);
  if (!result.ok) {
    console.log(`# ${result.error}`);
    await waitEnter()
    return authenticate();
  }

  activeUser = result.username;
  await initUser(activeUser);

  console.log(`\n✔ Benutzer "${activeUser}" erfolgreich erstellt!`);
}

async function loginUser(): Promise<void> {
  console.clear();
  header("Einloggen");

  const name = await ask("Benutzername:");
  const pw = await askPassword("Passwort:");

  if(name === "" || pw === "") {
    console.log("\n# Benutzername oder Passwort dürfen nicht leer sein.")
    await waitEnter()
    return authenticate()
  }

  const result = await validateUser(name, pw);
  if (!result.ok) {
    console.log(`# ${result.error}`);
    await waitEnter()
    return authenticate();
  }

  activeUser = result.username;
  await initUser(activeUser);

  console.log(`\n✔ Willkommen zurück, ${activeUser}!`);
}

export async function authenticate(): Promise<void> {
  console.clear();
  header("Willkommen bei mAI Music");
  console.log("(Bitte melden Sie sich an)\n");

  const action = await askChoice("Bitte auswählen:", [
    { name: "Einloggen", value: "login" },
    { name: "Konto erstellen", value: "signup" },
    { name: "Beenden", value: "exit" },
  ]);

  if (action === "signup") await signUpUser();
  else if (action === "login") await loginUser();
  else return;

  if (activeUser) drawMenu(activeUser, false);
}
