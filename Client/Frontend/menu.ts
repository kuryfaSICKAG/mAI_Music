import { askChoice } from "../../services/prompt.ts";
import { authenticate } from "./authenticate.ts";
import { drawPlaylist } from "./drawPlaylist.ts";
import { drawSong } from "./song.ts";
import { drawOnline } from "./online.ts";
import { header } from "../../services/header.ts";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function drawMenu(activeUser: string, loggedIn: boolean): Promise<void> {
  if (!loggedIn) {
    console.log(`Du wirst eingeloggt als "${activeUser}"`);
    await sleep(1500);
  }

  console.clear();
  header("Hauptmenü")

  const choice = await askChoice("Was möchtest du tun?:", [
    { name: "Playlists verwalten", value: "playlist" },
    { name: "Songs suchen", value: "songs" },
    { name: "Online-Funktionen", value: "online" },
    { name: "Abmelden", value: "logout" }
  ]);

  if (choice === "playlist") return drawPlaylist(activeUser);
  if (choice === "songs") return drawSong(activeUser);
  if (choice === "online") return drawOnline(activeUser);

  return authenticate();
}