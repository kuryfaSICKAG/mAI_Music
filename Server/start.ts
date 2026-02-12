
import express, { type Request, type Response } from "express";
import { loadUsers, saveUsers, loadPlaylists, savePlaylists } from "./Data/data.ts";
import cluster from "cluster";
import os from "os";


const app = express();
const PORT = 8080;
app.use(express.json());

// Multi-core support: Use Node.js cluster to fork workers
if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart worker
  });
} else {

/* ========================================================================== */
/*                                    ROOT                                    */
/* ========================================================================== */

app.get("/", (_req: Request, res: Response) => {
  res.send("Express + TypeScript Server läuft!");
});

/* ========================================================================== */
/*                                    USERS                                   */
/* ========================================================================== */

app.get("/users", (_req: Request, res: Response) => {
  const users = loadUsers();
  res.json(users);
});

app.post("/users", (req: Request, res: Response) => {
  const data = loadUsers();
  data.users.push(req.body);
  saveUsers(data);

  res.json({ message: "User gespeichert", data });
});

/* ========================================================================== */
/*                                 PLAYLIST GET                               */
/* ========================================================================== */

app.get("/playlists", (_req: Request, res: Response) => {
  const playlists = loadPlaylists();
  res.json(playlists);
});

/* ========================================================================== */
/*                                  AUTH                                      */
/* ========================================================================== */

app.post("/auth/create", (req: Request, res: Response) => {
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

app.post("/auth/login", (req: Request, res: Response) => {
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

/* ========================================================================== */
/*                           PLAYLIST BY USER (NEU)                           */
/* ========================================================================== */

/*
    Struktur playlist_data.json:

    {
      "playlistsByUser": {
         "fabian": [
            { "name": "Chill", "songs": [] },
            { "name": "Lofi", "songs": [] }
         ],
         "anna": [...]
      }
    }
*/

/* === 1) User für Playlist-System initialisieren (idempotent) === */
app.post("/playlist/init", (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username fehlt" });

  const db = loadPlaylists();
  if (!db.playlistsByUser) db.playlistsByUser = {};
  if (!db.playlistsByUser[username]) db.playlistsByUser[username] = [];

  savePlaylists(db);
  res.json({ ok: true });
});

/* === 2) Playlists eines Users abrufen === */
app.get("/playlist/:username", (req: Request, res: Response) => {
  const username = req.params.username as string;

  const db = loadPlaylists();
  const lists = db.playlistsByUser?.[username] ?? [];

  res.json(lists);
});

/* === 3) Playlist erstellen === */

app.post("/playlist/create", (req: Request, res: Response) => {
  const { username, name, public: isPublic = false } = req.body;

  if (!username || !name) {
    return res.status(400).json({ error: "username oder name fehlt" });
  }

  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];

  if (arr.some((p: any) => p.name === name)) {
    return res.status(409).json({ error: `Playlist \"${name}\" existiert bereits.` });
  }

  const playlist = { name, songs: [], public: !!isPublic };
  db.playlistsByUser[username] = [...arr, playlist];

  savePlaylists(db);
  res.status(201).json(playlist);
});

/* === 4) Playlist löschen === */
app.delete("/playlist/delete", (req: Request, res: Response) => {
  const { username, name } = req.body;

  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];
  const next = arr.filter((p: any) => p.name !== name);

  if (next.length === arr.length) {
    return res.status(404).json({ error: "Playlist nicht gefunden" });
  }

  db.playlistsByUser[username] = next;
  savePlaylists(db);

  res.json({ ok: true });
});

/* === 5) Playlist umbenennen === */

app.patch("/playlist/rename", (req: Request, res: Response) => {
  const { username, oldName, newName, public: isPublic } = req.body;

  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];

  if (arr.some((p: any) => p.name === newName)) {
    return res.status(409).json({ error: `Playlist \"${newName}\" existiert bereits.` });
  }

  const pl = arr.find((p: any) => p.name === oldName);

  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  pl.name = newName;
  if (typeof isPublic === "boolean") pl.public = isPublic;
  savePlaylists(db);

  res.json({ ok: true });
});

/* === 6) Song hinzufügen === */
app.post("/playlist/song/add", (req: Request, res: Response) => {
  const { username, playlistName, song, dedupe = true } = req.body;

  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];
  const pl = arr.find((p: any) => p.name === playlistName);

  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  if (
    dedupe &&
    pl.songs.some(
      (s: any) =>
        s.name.toLowerCase() === song.name.toLowerCase() &&
        s.year === song.year &&
        s.duration === song.duration
    )
  ) {
    return res.json({ ok: true, skipped: true });
  }

  pl.songs.push(song);
  savePlaylists(db);

  res.json({ ok: true });
});

/* === 7) Song löschen === */
app.delete("/playlist/song/remove", (req: Request, res: Response) => {
  const { username, playlistName, index } = req.body;

  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];
  const pl = arr.find((p: any) => p.name === playlistName);

  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  if (index < 0 || index >= pl.songs.length) {
    return res.status(400).json({ error: "Ungültiger Index" });
  }

  pl.songs.splice(index, 1);
  savePlaylists(db);

  res.json({ ok: true });
});

/* ========================================================================== */
/*                                  SERVER START                              */
/* ========================================================================== */


  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} läuft unter http://localhost:${PORT}`);
  });
}
/* ========================================================================== */
/*                        GET ALL USER DATA (ADMIN/DEBUG)                     */
/* ========================================================================== */

// Returns all user data and their playlists (for admin/debug)
app.get("/alluserdata", (_req: Request, res: Response) => {
  const users = loadUsers();
  const playlists = loadPlaylists();
  res.json({ users, playlists });
});
