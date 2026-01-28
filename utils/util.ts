import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

// __dirname/__filename für ES Modules erzeugen
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const filePath = path.join(__dirname, "", "user_Data.json");

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
        console.log("❌ Benutzer existiert bereits!");
        return null;
    }

    const newUser = { username, password };
    data.users.push(newUser);

    saveUsers(data);
    console.log("✅ Benutzer wurde erfolgreich gespeichert!");

    activeUser = username
    return newUser;
}

export function validateUser(username: string, password: string) {
    const data = loadUsers();

    const user = data.users.find((u: any) =>
        u.username === username && u.password === password
    );

    if (!user) {
        console.log("❌ Benutzername oder Passwort falsch!");
        return null;
    }

    console.log("✅ Login erfolgreich!");
    activeUser = username
    return user;
}