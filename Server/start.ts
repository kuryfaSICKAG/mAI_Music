import express, { type Request, type Response } from "express";
import { loadUsers, saveUsers, loadPlaylists, savePlaylists, type UserProfile, type UserRecord } from "./Data/data.ts";
import { searchRouter } from "./routes/search.ts";
import { DeezerAPI } from "../apiServices/deezerAPI/deezer.ts";
import { searchDeezer } from "./services/deezerSearch.ts";

const app = express();
const PORT = 8080;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const deezer = new DeezerAPI();
const serverStartedAt = Date.now();

app.use(express.json());
app.use(searchRouter);

function defaultProfile(): UserProfile {
  return {
    favoriteGenres: [],
    locale: "de-DE",
    onboardingDone: false,
  };
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function toSafeUser(user: UserRecord) {
  return {
    username: user.username,
    profile: user.profile,
    favorites: user.favorites,
  };
}

function createSession(username: string): { token: string; createdAt: string; expiresAt: string } {
  const token = createId();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  return { token, createdAt, expiresAt };
}

function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const xToken = req.headers["x-auth-token"];
  return typeof xToken === "string" && xToken.trim() ? xToken.trim() : null;
}

function getAuthContext(req: Request): { db: ReturnType<typeof loadUsers>; user: UserRecord; token: string } | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const db = loadUsers();
  const now = Date.now();
  const sessions = db.authSessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  if (sessions.length !== db.authSessions.length) {
    db.authSessions = sessions;
    saveUsers(db);
  }

  const session = sessions.find((s) => s.token === token);
  if (!session) return null;

  const user = db.users.find((u) => u.username === session.username);
  if (!user) return null;

  return { db, user, token };
}

function resolveEffectiveUsername(req: Request, bodyUsername?: string): string | null {
  const auth = getAuthContext(req);
  if (auth) return auth.user.username;
  if (typeof bodyUsername === "string" && bodyUsername.trim()) return bodyUsername.trim();
  return null;
}

function safeSongs(songs: any): any[] {
  return Array.isArray(songs) ? songs : [];
}

function findPlaylist(username: string, playlistName: string) {
  const db = loadPlaylists();
  const userPlaylists = db.playlistsByUser[username] ?? [];
  const playlist = userPlaylists.find((p: any) => p.name === playlistName);
  return { db, userPlaylists, playlist };
}

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
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ error: "username oder password fehlt" });
  }

  if (data.users.some((u) => u.username === username)) {
    return res.status(409).json({ error: "Benutzer existiert bereits!" });
  }

  data.users.push({ username, password, profile: defaultProfile(), favorites: [] });
  saveUsers(data);

  res.json({ message: "User gespeichert", data });
});

/* ========================================================================== */
/*                                  AUTH                                      */
/* ========================================================================== */

app.post("/auth/create", (req: Request, res: Response) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ error: "username oder password fehlt" });
  }

  const data = loadUsers();
  const exists = data.users.some((u: any) => u.username === username);

  if (exists) {
    return res.status(400).json({ error: "Benutzer existiert bereits!" });
  }

  data.users.push({ username, password, profile: defaultProfile(), favorites: [] });
  const session = createSession(username);
  data.authSessions.push({ ...session, username });
  saveUsers(data);

  res.json({ message: "User erstellt", username, token: session.token, expiresAt: session.expiresAt });
});

app.post("/auth/login", (req: Request, res: Response) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ error: "username oder password fehlt" });
  }

  const data = loadUsers();

  const user = data.users.find(
    (u: any) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Benutzername oder Passwort falsch!" });
  }

  const session = createSession(username);
  data.authSessions = data.authSessions.filter((s) => s.username !== username);
  data.authSessions.push({ ...session, username });
  saveUsers(data);

  res.json({ message: "Login erfolgreich", username, token: session.token, expiresAt: session.expiresAt });
});

app.post("/auth/logout", (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Kein Auth-Token" });

  const db = loadUsers();
  const before = db.authSessions.length;
  db.authSessions = db.authSessions.filter((s) => s.token !== token);
  saveUsers(db);

  if (before === db.authSessions.length) {
    return res.status(404).json({ error: "Session nicht gefunden" });
  }

  return res.json({ ok: true });
});

app.post("/auth/refresh", (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Kein Auth-Token" });

  const db = loadUsers();
  const oldSession = db.authSessions.find((s) => s.token === token);
  if (!oldSession) {
    return res.status(401).json({ error: "Ungültige Session" });
  }

  if (new Date(oldSession.expiresAt).getTime() <= Date.now()) {
    db.authSessions = db.authSessions.filter((s) => s.token !== token);
    saveUsers(db);
    return res.status(401).json({ error: "Session abgelaufen" });
  }

  const next = createSession(oldSession.username);
  db.authSessions = db.authSessions.filter((s) => s.token !== token);
  db.authSessions.push({ ...next, username: oldSession.username });
  saveUsers(db);

  return res.json({ ok: true, token: next.token, expiresAt: next.expiresAt });
});

app.get("/auth/me", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  return res.json({ ok: true, user: toSafeUser(auth.user) });
});

/* ========================================================================== */
/*                                 PROFILE                                    */
/* ========================================================================== */

app.get("/profile/me", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  return res.json({ username: auth.user.username, profile: auth.user.profile });
});

app.patch("/profile/me", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  const { favoriteGenres, locale, onboardingDone } = req.body ?? {};

  if (favoriteGenres !== undefined) {
    if (!Array.isArray(favoriteGenres) || favoriteGenres.some((g) => typeof g !== "string")) {
      return res.status(400).json({ error: "favoriteGenres muss string[] sein" });
    }
    auth.user.profile.favoriteGenres = favoriteGenres;
  }

  if (locale !== undefined) {
    if (typeof locale !== "string" || !locale.trim()) {
      return res.status(400).json({ error: "locale muss string sein" });
    }
    auth.user.profile.locale = locale.trim();
  }

  if (onboardingDone !== undefined) {
    if (typeof onboardingDone !== "boolean") {
      return res.status(400).json({ error: "onboardingDone muss boolean sein" });
    }
    auth.user.profile.onboardingDone = onboardingDone;
  }

  saveUsers(auth.db);
  return res.json({ ok: true, profile: auth.user.profile });
});

app.get("/profile/:username", (req: Request, res: Response) => {
  const username = String(req.params.username ?? "");
  const db = loadUsers();
  const user = db.users.find((u) => u.username === username);

  if (!user) {
    return res.status(404).json({ error: "User nicht gefunden" });
  }

  return res.json({ username: user.username, profile: user.profile });
});

/* ========================================================================== */
/*                                 FAVORITES                                  */
/* ========================================================================== */

app.get("/favorites", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  return res.json({ username: auth.user.username, favorites: auth.user.favorites });
});

app.post("/favorites/song", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  const song = req.body?.song;
  if (!song || typeof song !== "object") {
    return res.status(400).json({ error: "song fehlt" });
  }

  const songId = String(song.id ?? "");
  const alreadyExists = auth.user.favorites.some((s: any) => {
    if (songId && String(s?.id ?? "") === songId) return true;
    return (
      String(s?.name ?? "").toLowerCase() === String(song?.name ?? "").toLowerCase() &&
      Number(s?.year ?? 0) === Number(song?.year ?? 0)
    );
  });

  if (alreadyExists) {
    return res.json({ ok: true, skipped: true });
  }

  auth.user.favorites.push(song);
  saveUsers(auth.db);
  return res.status(201).json({ ok: true, count: auth.user.favorites.length });
});

app.delete("/favorites/song", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  const songId = String(req.body?.songId ?? "").trim();
  const name = String(req.body?.name ?? "").trim().toLowerCase();
  const year = req.body?.year !== undefined ? Number(req.body.year) : undefined;

  const next = auth.user.favorites.filter((s: any) => {
    if (songId) return String(s?.id ?? "") !== songId;
    if (name) {
      const sameName = String(s?.name ?? "").trim().toLowerCase() === name;
      if (year === undefined) return !sameName;
      return !(sameName && Number(s?.year ?? 0) === year);
    }
    return true;
  });

  if (next.length === auth.user.favorites.length) {
    return res.status(404).json({ error: "Favorit nicht gefunden" });
  }

  auth.user.favorites = next;
  saveUsers(auth.db);
  return res.json({ ok: true, count: auth.user.favorites.length });
});

/* ========================================================================== */
/*                                 PLAYLISTS                                  */
/* ========================================================================== */

app.post("/playlist/init", (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username fehlt" });

  const db = loadPlaylists();
  if (!db.playlistsByUser[username]) db.playlistsByUser[username] = [];

  savePlaylists(db);
  res.json({ ok: true });
});

app.get("/playlists", (_req: Request, res: Response) => {
  const playlists = loadPlaylists();
  res.json(playlists);
});

app.get("/playlist/:username", (req: Request, res: Response) => {
  const username = req.params.username as string;
  const db = loadPlaylists();
  const lists = db.playlistsByUser?.[username] ?? [];
  res.json(lists);
});

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

app.patch("/playlist/rename", (req: Request, res: Response) => {
  const { username, oldName, newName } = req.body;

  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];

  if (arr.some((p: any) => p.name === newName)) {
    return res.status(409).json({ error: `Playlist \"${newName}\" existiert bereits.` });
  }

  const pl = arr.find((p: any) => p.name === oldName);

  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  pl.name = newName;
  savePlaylists(db);

  res.json({ ok: true });
});

app.post("/playlist/song/add", (req: Request, res: Response) => {
  const { username, playlistName, song, dedupe = true } = req.body;

  const { db, playlist: pl } = findPlaylist(username, playlistName);
  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  if (
    dedupe &&
    pl.songs.some(
      (s: any) =>
        s.name?.toLowerCase?.() === song?.name?.toLowerCase?.() &&
        s.year === song?.year &&
        s.duration === song?.duration
    )
  ) {
    return res.json({ ok: true, skipped: true });
  }

  const withId = song && typeof song === "object" ? { ...song, id: String(song.id ?? createId()) } : song;
  pl.songs.push(withId);
  savePlaylists(db);

  res.json({ ok: true });
});

app.delete("/playlist/song/remove", (req: Request, res: Response) => {
  const { username, playlistName, index } = req.body;

  const { db, playlist: pl } = findPlaylist(username, playlistName);
  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  if (index < 0 || index >= pl.songs.length) {
    return res.status(400).json({ error: "Ungültiger Index" });
  }

  pl.songs.splice(index, 1);
  savePlaylists(db);

  res.json({ ok: true });
});

app.delete("/playlist/song/:songId", (req: Request, res: Response) => {
  const songId = String(req.params.songId ?? "").trim();
  const username = resolveEffectiveUsername(req, req.body?.username);
  const playlistName = String(req.body?.playlistName ?? "").trim();

  if (!username || !playlistName || !songId) {
    return res.status(400).json({ error: "username, playlistName oder songId fehlt" });
  }

  const { db, playlist: pl } = findPlaylist(username, playlistName);
  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  const before = pl.songs.length;
  pl.songs = safeSongs(pl.songs).filter((s: any) => String(s?.id ?? "") !== songId);

  if (pl.songs.length === before) {
    return res.status(404).json({ error: "Song nicht gefunden" });
  }

  savePlaylists(db);
  return res.json({ ok: true });
});

app.patch("/playlist/song", (req: Request, res: Response) => {
  const username = resolveEffectiveUsername(req, req.body?.username);
  const playlistName = String(req.body?.playlistName ?? "").trim();
  const songId = String(req.body?.songId ?? "").trim();
  const patch = req.body?.patch;

  if (!username || !playlistName || !songId || !patch || typeof patch !== "object") {
    return res.status(400).json({ error: "username, playlistName, songId oder patch fehlt" });
  }

  const { db, playlist: pl } = findPlaylist(username, playlistName);
  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  const idx = safeSongs(pl.songs).findIndex((s: any) => String(s?.id ?? "") === songId);
  if (idx < 0) {
    return res.status(404).json({ error: "Song nicht gefunden" });
  }

  pl.songs[idx] = { ...pl.songs[idx], ...patch, id: songId };
  savePlaylists(db);

  return res.json({ ok: true, song: pl.songs[idx] });
});

app.post("/playlist/song/quick-add", async (req: Request, res: Response) => {
  try {
    const username = resolveEffectiveUsername(req, req.body?.username);
    const playlistName = String(req.body?.playlistName ?? "").trim();
    const query = String(req.body?.query ?? "").trim();
    const trackId = String(req.body?.trackId ?? "").trim();
    const dedupe = req.body?.dedupe !== false;

    if (!username || !playlistName) {
      return res.status(400).json({ error: "username oder playlistName fehlt" });
    }

    if (!query && !trackId) {
      return res.status(400).json({ error: "query oder trackId fehlt" });
    }

    const { db, playlist: pl } = findPlaylist(username, playlistName);
    if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

    let track: any;
    if (trackId) {
      track = await deezer.lookupTrack(trackId);
    } else {
      const candidates = await searchDeezer(query, "track", 1);
      const first = candidates[0];
      if (!first || !first.id) {
        return res.status(404).json({ error: "Kein Song gefunden" });
      }
      track = await deezer.lookupTrack(first.id);
    }

    if (!track || !track.id) {
      return res.status(404).json({ error: "Kein Song gefunden" });
    }

    const song = {
      id: String(track.id),
      name: track?.title || track?.title_short || track?.name || "",
      artist: track?.artist?.name
        ? [{ name: track.artist.name, nationality: "", age: 0, genre: [] }]
        : [],
      genre: [],
      year: track?.release_date ? Number(String(track.release_date).slice(0, 4)) : 0,
      duration: track?.duration ?? 0,
      album: track?.album?.title
        ? {
            name: track.album.title,
            artist: track?.artist?.name
              ? [{ name: track.artist.name, nationality: "", age: 0, genre: [] }]
              : [],
            genre: [],
            year: track?.release_date ? Number(String(track.release_date).slice(0, 4)) : 0,
            songs: [],
          }
        : undefined,
    };

    if (
      dedupe &&
      safeSongs(pl.songs).some(
        (s: any) =>
          String(s?.id ?? "") === song.id ||
          (String(s?.name ?? "").toLowerCase() === String(song.name).toLowerCase() && Number(s?.year ?? 0) === song.year)
      )
    ) {
      return res.json({ ok: true, skipped: true, song });
    }

    pl.songs.push(song);
    savePlaylists(db);
    return res.status(201).json({ ok: true, song });
  } catch (error: any) {
    return res.status(502).json({ error: "Quick-Add fehlgeschlagen", detail: error?.message ?? "Unbekannter Fehler" });
  }
});

/* ========================================================================== */
/*                      PLAYLIST STATUS (public/private)                      */
/* ========================================================================== */

app.patch("/playlist/status", (req: Request, res: Response) => {
  try {
    const { username, playlistName, public: isPublic } = req.body;

    if (!username || !playlistName || typeof isPublic !== "boolean") {
      return res.status(400).json({ error: "username, playlistName oder public fehlt/ungültig" });
    }

    const { db, playlist } = findPlaylist(username, playlistName);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist nicht gefunden" });
    }

    playlist.public = isPublic;
    savePlaylists(db);

    return res.json({ ok: true, playlistName, public: playlist.public });
  } catch {
    return res.status(500).json({ error: "Status konnte nicht geändert werden" });
  }
});

app.get("/playlist/status/:username/:playlistName", (req: Request, res: Response) => {
  try {
    const username = req.params.username as string;
    const playlistName = req.params.playlistName as string;

    const { playlist } = findPlaylist(username, playlistName);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist nicht gefunden" });
    }

    return res.json({ username, playlistName, public: !!playlist.public });
  } catch {
    return res.status(500).json({ error: "Status konnte nicht geladen werden" });
  }
});

app.get("/playlists/public", (_req: Request, res: Response) => {
  const db = loadPlaylists();
  const result: Array<{ username: string; name: string; songs: any[]; public: boolean }> = [];

  for (const username of Object.keys(db.playlistsByUser)) {
    const lists = db.playlistsByUser[username] ?? [];
    for (const playlist of lists) {
      if (playlist.public === true) {
        result.push({
          username,
          name: playlist.name,
          songs: safeSongs(playlist.songs),
          public: true,
        });
      }
    }
  }

  return res.json(result);
});

app.get("/playlist/public/:username/:name", (req: Request, res: Response) => {
  const username = String(req.params.username ?? "");
  const name = String(req.params.name ?? "");
  const { playlist } = findPlaylist(username, name);

  if (!playlist || playlist.public !== true) {
    return res.status(404).json({ error: "Öffentliche Playlist nicht gefunden" });
  }

  return res.json({ username, playlist });
});

/* ========================================================================== */
/*                             RECOMMENDATIONS                                */
/* ========================================================================== */

app.post("/recommendations/playlist", async (req: Request, res: Response) => {
  try {
    const username = resolveEffectiveUsername(req, req.body?.username);
    const playlistName = String(req.body?.playlistName ?? "").trim();
    const limit = Math.max(1, Math.min(30, Number(req.body?.limit ?? 10)));

    if (!username || !playlistName) {
      return res.status(400).json({ error: "username oder playlistName fehlt" });
    }

    const { playlist } = findPlaylist(username, playlistName);
    if (!playlist) return res.status(404).json({ error: "Playlist nicht gefunden" });

    const seeds = safeSongs(playlist.songs)
      .slice(0, 3)
      .map((s: any) => String(s?.name ?? "").trim())
      .filter(Boolean);

    if (seeds.length === 0) {
      return res.json({ ok: true, source: "playlist", recommendations: [] });
    }

    const existing = new Set(safeSongs(playlist.songs).map((s: any) => String(s?.id ?? "")).filter(Boolean));
    const out: any[] = [];
    const seen = new Set<string>();

    for (const seed of seeds) {
      const hits = await searchDeezer(seed, "track", limit);
      for (const hit of hits) {
        if (!hit.id || existing.has(hit.id) || seen.has(hit.id)) continue;
        seen.add(hit.id);
        out.push(hit);
        if (out.length >= limit) break;
      }
      if (out.length >= limit) break;
    }

    return res.json({ ok: true, source: "playlist", recommendations: out });
  } catch (error: any) {
    return res.status(502).json({ error: "Empfehlungen fehlgeschlagen", detail: error?.message ?? "Unbekannter Fehler" });
  }
});

app.get("/recommendations/user/:username", async (req: Request, res: Response) => {
  try {
    const username = String(req.params.username ?? "").trim();
    const limit = Math.max(1, Math.min(30, Number(req.query.limit ?? 10)));

    const users = loadUsers();
    const user = users.users.find((u) => u.username === username);
    if (!user) return res.status(404).json({ error: "User nicht gefunden" });

    const playlists = loadPlaylists().playlistsByUser[username] ?? [];
    const favoriteSeed = user.favorites[0]?.name ? String(user.favorites[0].name) : "";
    const playlistSeed = playlists[0]?.songs?.[0]?.name ? String(playlists[0].songs[0].name) : "";
    const seed = favoriteSeed || playlistSeed;

    if (!seed) {
      return res.json({ ok: true, source: "user", recommendations: [] });
    }

    const recommendations = await searchDeezer(seed, "track", limit);
    return res.json({ ok: true, source: "user", recommendations });
  } catch (error: any) {
    return res.status(502).json({ error: "User-Empfehlungen fehlgeschlagen", detail: error?.message ?? "Unbekannter Fehler" });
  }
});

/* ========================================================================== */
/*                     SEND / RECEIVE PLAYLIST BETWEEN USERS                  */
/* ========================================================================== */

app.post("/sendPlaylist", (req: Request, res: Response) => {
  try {
    const { fromUser, toUser, playlistName } = req.body;

    if (!fromUser || !toUser || !playlistName) {
      return res.status(400).json({ error: "fromUser, toUser oder playlistName fehlt" });
    }

    const db = loadPlaylists();
    const fromArr = db.playlistsByUser[fromUser] ?? [];
    const toArr = db.playlistsByUser[toUser] ?? [];

    const source = fromArr.find((p: any) => p.name === playlistName);
    if (!source) {
      return res.status(404).json({ error: "Quell-Playlist nicht gefunden" });
    }

    const targetName = toArr.some((p: any) => p.name === source.name)
      ? `${source.name} (from ${fromUser})`
      : source.name;

    const transferred = {
      name: targetName,
      songs: safeSongs(source.songs).map((s: any) => ({ ...s })),
      public: typeof source.public === "boolean" ? source.public : false,
      receivedFrom: fromUser,
      receivedAt: new Date().toISOString()
    };

    db.playlistsByUser[toUser] = [...toArr, transferred];
    savePlaylists(db);

    return res.json({
      ok: true,
      message: `Playlist '${source.name}' wurde an '${toUser}' gesendet.`,
      receivedAs: targetName
    });
  } catch {
    return res.status(500).json({ error: "Playlist konnte nicht gesendet werden" });
  }
});

app.get("/playlist/received/:username", (req: Request, res: Response) => {
  try {
    const username = req.params.username as string;
    const db = loadPlaylists();
    const all = db.playlistsByUser[username] ?? [];

    const received = all.filter((p: any) => typeof p.receivedFrom === "string");
    return res.json(received);
  } catch {
    return res.status(500).json({ error: "Empfangene Playlists konnten nicht geladen werden" });
  }
});

/* ========================================================================== */
/*                        GET ALL USER DATA (ADMIN/DEBUG)                     */
/* ========================================================================== */

app.get("/alluserdata", (_req: Request, res: Response) => {
  const users = loadUsers();
  const playlists = loadPlaylists();
  res.json({ users, playlists });
});

/* ========================================================================== */
/*                               OPS / HEALTH                                 */
/* ========================================================================== */

app.get("/health", (_req: Request, res: Response) => {
  return res.json({ ok: true, uptimeSec: Math.floor((Date.now() - serverStartedAt) / 1000), now: new Date().toISOString() });
});

app.get("/ready", (_req: Request, res: Response) => {
  try {
    loadUsers();
    loadPlaylists();
    return res.json({ ready: true });
  } catch {
    return res.status(500).json({ ready: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft unter http://localhost:${PORT}`);
});
