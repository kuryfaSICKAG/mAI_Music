// Client/Frontend/connect.ts
import { question, questionInt } from "readline-sync";
import { connectToServer } from "../Backend/connection.ts";
import { authenticate } from "./authenticate.ts";

export async function askConnection() {
    console.clear();
    console.log("\n                     |========= Willkommen bei mAI music =========|");

    const ip = question("Gib die IP des Servers ein:\n> ");
    const port = questionInt("\nGib den Port des Servers ein:\n> ");

    console.log("\n🔌 Verbinde...");

    const result = await connectToServer(ip, port);

    if (!result.ok) {
        console.log(`\n❌ Verbindung fehlgeschlagen: ${result.error}\n`);
        const retry = question("Erneut versuchen? (j/n): ");
        if (retry.toLowerCase() === "j") return askConnection();
        return;
    }

    console.log(`\n✅ Erfolgreich verbunden mit: ${result.url}\n`);

    // Weiter zur Anmeldung
    await authenticate();
}