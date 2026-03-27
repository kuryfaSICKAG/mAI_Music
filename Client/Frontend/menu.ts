import { askChoice } from "../../services/prompt.ts";
import { authenticate, resetActiveUser } from "./authenticate.ts";
import { drawPlaylist } from "./drawPlaylist.ts";
import { drawSong } from "./song.ts";
import { drawOnline } from "./online.ts";
import { drawAI } from "./ai.ts";
import { header } from "../../services/ui.ts";
import ora from "ora";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function drawMenu(
  activeUser: string,
  loggedIn: boolean,
): Promise<void> {
  if (!loggedIn) {
    const spinner = ora(`Du wirst eingeloggt als "${activeUser}"...`).start();
    await sleep(1500); // deine künstliche Wartezeit
    spinner.succeed("Fertig!");
  }

  console.clear();
  header("Hauptmenü");

  const choice = await askChoice("Was möchtest du tun?:", [
    { name: "Playlists verwalten", value: "playlist" },
    { name: "Songs suchen", value: "songs" },
    { name: "Online-Funktionen", value: "online" },
    { name: "AI-Features", value: "ai" },
    { name: "Abmelden", value: "logout" },
  ]);

  if (choice === "playlist") return drawPlaylist(activeUser);
  if (choice === "songs") return drawSong(activeUser);
  if (choice === "online") return drawOnline(activeUser);
  if (choice === "ai") return drawAI(activeUser);

  resetActiveUser();
  return authenticate();
}
