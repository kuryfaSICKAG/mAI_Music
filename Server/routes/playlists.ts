import { Router, type Request, type Response } from "express";
import { loadPlaylists, savePlaylists } from "../Data/data.ts";
import { deezer, findPlaylist, resolveEffectiveUsername, safeSongs, createId } from "../serverContext.ts";
import { searchDeezer } from "../services/deezerSearch.ts";

const playlistsRouter = Router();

playlistsRouter.post("/playlist/init", (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username fehlt" });

  const db = loadPlaylists();
  if (!db.playlistsByUser[username]) db.playlistsByUser[username] = [];

  savePlaylists(db);
  return res.json({ ok: true });
});

playlistsRouter.get("/playlists", (_req: Request, res: Response) => {
  const playlists = loadPlaylists();
  return res.json(playlists);
});

playlistsRouter.get("/playlist/:username", (req: Request, res: Response) => {
  const username = req.params.username as string;
  const db = loadPlaylists();
  const lists = db.playlistsByUser?.[username] ?? [];
  return res.json(lists);
});

playlistsRouter.post("/playlist/create", (req: Request, res: Response) => {
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
  return res.status(201).json(playlist);
});

playlistsRouter.delete("/playlist/delete", (req: Request, res: Response) => {
  const { username, name } = req.body;

  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];
  const next = arr.filter((p: any) => p.name !== name);

  if (next.length === arr.length) {
    return res.status(404).json({ error: "Playlist nicht gefunden" });
  }

  db.playlistsByUser[username] = next;
  savePlaylists(db);

  return res.json({ ok: true });
});

playlistsRouter.patch("/playlist/rename", (req: Request, res: Response) => {
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

  return res.json({ ok: true });
});

playlistsRouter.post("/playlist/song/add", (req: Request, res: Response) => {
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

  return res.json({ ok: true });
});

playlistsRouter.delete("/playlist/song/remove", (req: Request, res: Response) => {
  const { username, playlistName, index } = req.body;

  const { db, playlist: pl } = findPlaylist(username, playlistName);
  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });

  if (index < 0 || index >= pl.songs.length) {
    return res.status(400).json({ error: "Ungültiger Index" });
  }

  pl.songs.splice(index, 1);
  savePlaylists(db);

  return res.json({ ok: true });
});

playlistsRouter.delete("/playlist/song/:songId", (req: Request, res: Response) => {
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

playlistsRouter.patch("/playlist/song", (req: Request, res: Response) => {
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

playlistsRouter.post("/playlist/song/quick-add", async (req: Request, res: Response) => {
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

playlistsRouter.patch("/playlist/status", (req: Request, res: Response) => {
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

playlistsRouter.get("/playlist/status/:username/:playlistName", (req: Request, res: Response) => {
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

playlistsRouter.get("/playlists/public", (_req: Request, res: Response) => {
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

playlistsRouter.get("/playlist/public/:username/:name", (req: Request, res: Response) => {
  const username = String(req.params.username ?? "");
  const name = String(req.params.name ?? "");
  const { playlist } = findPlaylist(username, name);

  if (!playlist || playlist.public !== true) {
    return res.status(404).json({ error: "Öffentliche Playlist nicht gefunden" });
  }

  return res.json({ username, playlist });
});

export { playlistsRouter };
