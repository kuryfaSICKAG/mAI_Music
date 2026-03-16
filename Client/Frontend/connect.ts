import { header } from "../../services/ui.ts";
import { ask, askConfirm } from "../../services/prompt.ts";
import { connectToServer } from "../Backend/connection.ts";
import { authenticate } from "./authenticate.ts";

export async function askConnection() {
  console.clear();
  header("Willkommen bei mAI Music");
  console.log("(Bitte Server auswählen)\n");

  const ip = await ask("Server-IP:");
  const portStr = await ask("Port:");
  const port = Number(portStr);

  console.log("\n🔌 Verbinde…");

  const result = await connectToServer(ip, port);

  if (!result.ok) {
    console.log(`\n❌ Verbindung fehlgeschlagen: ${result.error}`);
    const retry = await askConfirm("Erneut versuchen?");
    if (retry) return askConnection();
    return;
  }

  console.log(`\n✅ Erfolgreich verbunden mit ${result.url}`);
  await authenticate();
}
