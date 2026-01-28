import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = path.join(__dirname, "user_data.json");

// Datei laden
function loadUsers() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ users: [] }, null, 4));
    }
    const rawData = fs.readFileSync(filePath, "utf8");
    return JSON.parse(rawData);
}

// Datei speichern
function saveUsers(data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
}

export let activeUser : string

export function createUser(username: string, password: string) {
    const data = loadUsers();

    // prüfen ob user existiert
    if (data.users.some((u: any) => u.username === username)) {
        console.log("Benutzer existiert bereits!");
        return null;
    }

    const newUser = { username, password };
    data.users.push(newUser);

    saveUsers(data);

    activeUser = username
}

export function validateUser(username: string, password: string) {
    const data = loadUsers();

    const user = data.users.find((u: any) =>
        u.username === username && u.password === password
    );

    if (!user) {
        console.log("\n# Benutzername oder Passwort falsch!");
        return false;
    }

    activeUser = username
    return true
}