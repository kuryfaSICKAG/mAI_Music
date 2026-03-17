import { askConnection } from "./Client/Frontend/connect.ts";

// Leert die Konsole vor dem Start fuer eine saubere Ausgabe.
process.stdout.write("\x1bc");
askConnection();
