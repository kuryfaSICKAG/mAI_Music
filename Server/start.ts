import express, { type Request, type Response } from "express";
import { loadUsers, saveUsers, loadPlaylists } from "./Data/data.ts";

const app = express();
const PORT = 8080;

app.use(express.json());

// Root
app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server läuft!");
});

// ========== USERS ==========
app.get("/users", (req: Request, res: Response) => {
  const users = loadUsers();
  res.json(users);
});

app.post("/users", (req: Request, res: Response) => {
  const data = loadUsers();
  data.users.push(req.body);
  saveUsers(data);

  res.json({ message: "User gespeichert", data });
});

// ========== PLAYLISTS ==========
app.get("/playlists", (req: Request, res: Response) => {
  const playlists = loadPlaylists();
  res.json(playlists);
});

app.listen(PORT, () => {
  console.log(`Server läuft unter http://localhost:${PORT}`);
});

// ========== AUTHENTIFIZIERUNG ==========
app.post("/auth/create", (req, res) => {
    const { username, password } = req.body;

    const data = loadUsers();
    const exists = data.users.some((u: any) => u.username === username);

    if (exists) {
        return res.status(400).json({ error: "Benutzer existiert bereits!" });
    }

    data.users.push({ username, password });
    saveUsers(data);

    res.json({ message: "User erstellt", username });
});

app.post("/auth/login", (req, res) => {
    const { username, password } = req.body;
    const data = loadUsers();

    const user = data.users.find(
        (u: any) => u.username === username && u.password === password
    );

    if (!user) {
        return res.status(401).json({ error: "Benutzername oder Passwort falsch!" });
    }

    res.json({ message: "Login erfolgreich", username });
});