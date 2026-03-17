import { Router, type Request, type Response } from "express";
import { loadPlaylists, savePlaylists } from "../Data/data.ts";
import {
  deezer,
  findPlaylist,
  resolveEffectiveUsername,
  saveSongs,
} from "../serverContext.ts";
import { searchDeezer } from "../services/deezerSearch.ts";
import {
  createAIPlaylist,
  AIPlaylistFromPlaylist,
  addAISongsToPlaylist,
  addAIToSamePlaylistFromPlaylistAnalysis,
} from "../../services/service.ts";
import type { Status } from "../../models/personalModels.ts";
import {
  getPlaylistStatusServer,
  setPlaylistStatusServer,
  togglePlaylistStatusServer,
} from "../serverContext.ts";

const playlistsRouter = Router();

function resolveUserFromReq(req: Request): string | null {
  const bodyUser = (req.body?.username as string) || "";
  const queryUser = (req.query?.username as string) || "";
  // nutzt deine bestehende Logik und fällt auf Body/Query zurück
  return resolveEffectiveUsername(req, bodyUser || queryUser);
}

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
  const { username, name } = req.body;
  const isPublic: boolean | undefined = req.body?.public;
  const rawStatus: Status | undefined = req.body?.status;
  if (!username || !name)
    return res.status(400).json({ error: "username oder name fehlt" });

  const status: Status =
    rawStatus === "public" || rawStatus === "private"
      ? rawStatus
      : isPublic === true
        ? "public"
        : "private";

  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];
  if (arr.some((p: any) => p.name === name)) {
    return res
      .status(409)
      .json({ error: `Playlist "${name}" existiert bereits.` });
  }

  const playlist = { name, songs: [], status } as {
    name: string;
    songs: string[];
    status: Status;
  };
  db.playlistsByUser[username] = [...arr, playlist];

  savePlaylists(db);
  return res.status(201).json(playlist);
});

playlistsRouter.delete("/playlist/delete", (req: Request, res: Response) => {
  const { username, name } = req.body;
  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];
  const next = arr.filter((p: any) => p.name !== name);
  if (next.length === arr.length)
    return res.status(404).json({ error: "Playlist nicht gefunden" });
  db.playlistsByUser[username] = next;
  savePlaylists(db);
  return res.json({ ok: true });
});

playlistsRouter.patch("/playlist/rename", (req: Request, res: Response) => {
  const { username, oldName, newName } = req.body;
  const db = loadPlaylists();
  const arr = db.playlistsByUser[username] ?? [];
  if (arr.some((p: any) => p.name === newName)) {
    return res
      .status(409)
      .json({ error: `Playlist "${newName}" existiert bereits.` });
  }
  const pl = arr.find((p: any) => p.name === oldName);
  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });
  pl.name = newName;
  savePlaylists(db);
  return res.json({ ok: true });
});

playlistsRouter.post("/playlist/song/add", (req: Request, res: Response) => {
  const { username, playlistName, dedupe = true } = req.body;
  const rawSongId = req.body?.songId ?? req.body?.song;
  const songId =
    typeof rawSongId === "string" || typeof rawSongId === "number"
      ? String(rawSongId).trim()
      : rawSongId && typeof rawSongId === "object" && rawSongId.id != null
        ? String(rawSongId.id).trim()
        : "";

  const { db, playlist: pl } = findPlaylist(username, playlistName);
  if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });
  if (!songId) return res.status(400).json({ error: "songId fehlt" });

  if (dedupe && saveSongs(pl.songs).includes(songId)) {
    return res.json({ ok: true, skipped: true });
  }

  pl.songs.push(songId);
  savePlaylists(db);
  return res.json({ ok: true });
});

playlistsRouter.delete(
  "/playlist/song/remove",
  (req: Request, res: Response) => {
    const { username, playlistName, index } = req.body;
    const { db, playlist: pl } = findPlaylist(username, playlistName);
    if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });
    if (index < 0 || index >= pl.songs.length) {
      return res.status(400).json({ error: "Ungültiger Index" });
    }
    pl.songs.splice(index, 1);
    savePlaylists(db);
    return res.json({ ok: true });
  },
);

playlistsRouter.delete(
  "/playlist/song/:songId",
  (req: Request, res: Response) => {
    const songId = String(req.params.songId ?? "").trim();
    const username = resolveEffectiveUsername(req, req.body?.username);
    const playlistName = String(req.body?.playlistName ?? "").trim();
    if (!username || !playlistName || !songId) {
      return res
        .status(400)
        .json({ error: "username, playlistName oder songId fehlt" });
    }
    const { db, playlist: pl } = findPlaylist(username, playlistName);
    if (!pl) return res.status(404).json({ error: "Playlist nicht gefunden" });
    const before = pl.songs.length;
    pl.songs = saveSongs(pl.songs).filter((id: string) => id !== songId);
    if (pl.songs.length === before) {
      return res.status(404).json({ error: "Song nicht gefunden" });
    }
    savePlaylists(db);
    return res.json({ ok: true });
  },
);

playlistsRouter.patch("/playlist/song", (_req: Request, res: Response) => {
  return res.status(410).json({
    error: "Song-Patch nicht mehr verfügbar. Playlists speichern nur Song-IDs.",
  });
});

playlistsRouter.post(
  "/playlist/song/quick-add",
  async (req: Request, res: Response) => {
    try {
      const username = resolveEffectiveUsername(req, req.body?.username);
      const playlistName = String(req.body?.playlistName ?? "").trim();
      const query = String(req.body?.query ?? "").trim();
      const trackId = String(req.body?.trackId ?? "").trim();
      const dedupe = req.body?.dedupe !== false;
      if (!username || !playlistName)
        return res
          .status(400)
          .json({ error: "username oder playlistName fehlt" });
      if (!query && !trackId)
        return res.status(400).json({ error: "query oder trackId fehlt" });

      const { db, playlist: pl } = findPlaylist(username, playlistName);
      if (!pl)
        return res.status(404).json({ error: "Playlist nicht gefunden" });

      let track: any;
      if (trackId) {
        track = await deezer.lookupTrack(trackId);
      } else {
        const candidates = await searchDeezer(query, "track", 1);
        const first = candidates[0];
        if (!first || !first.id)
          return res.status(404).json({ error: "Kein Song gefunden" });
        track = await deezer.lookupTrack(first.id);
      }
      if (!track || !track.id)
        return res.status(404).json({ error: "Kein Song gefunden" });

      const songId = String(track.id);
      if (dedupe && saveSongs(pl.songs).includes(songId)) {
        return res.json({ ok: true, skipped: true, songId });
      }

      pl.songs.push(songId);
      savePlaylists(db);
      return res.status(201).json({
        ok: true,
        songId,
        song: {
          id: songId,
          name: track?.title || track?.title_short || track?.name || "",
          artist: track?.artist?.name ?? "",
          album: track?.album?.title ?? "",
          duration: Number(track?.duration ?? 0),
        },
      });
    } catch (error: any) {
      return res.status(502).json({
        error: "Quick-Add fehlgeschlagen",
        detail: error?.message ?? "Unbekannter Fehler",
      });
    }
  },
);

playlistsRouter.get("/song/:songId", async (req: Request, res: Response) => {
  try {
    const songId = String(req.params.songId ?? "").trim();
    if (!songId) return res.status(400).json({ error: "songId fehlt" });

    const track = await deezer.lookupTrack(songId);
    if (!track || !track.id)
      return res.status(404).json({ error: "Song nicht gefunden" });

    return res.json({
      id: String(track.id),
      title: track?.title || track?.title_short || track?.name || "",
      artist: track?.artist?.name ?? "",
      album: track?.album?.title ?? "",
      duration: Number(track?.duration ?? 0),
    });
  } catch (error: any) {
    return res.status(502).json({
      error: "Song konnte nicht geladen werden",
      detail: error?.message ?? "Unbekannter Fehler",
    });
  }
});

playlistsRouter.get(
  "/playlist/:playlistName/status",
  (req: Request, res: Response) => {
    const username = resolveUserFromReq(req);
    if (!username) return res.status(401).json({ error: "Unauthorized" });
    const playlistName = String(req.params.playlistName ?? "").trim();
    if (!playlistName)
      return res.status(400).json({ error: "playlistName fehlt" });
    const status = getPlaylistStatusServer(username, playlistName);
    if (!status)
      return res.status(404).json({ error: "Playlist nicht gefunden" });
    return res.json({ status });
  },
);

playlistsRouter.patch(
  "/playlist/:playlistName/status",
  (req: Request, res: Response) => {
    const username = resolveUserFromReq(req);
    if (!username) return res.status(401).json({ error: "Unauthorized" });
    const playlistName = String(req.params.playlistName ?? "").trim();
    if (!playlistName)
      return res.status(400).json({ error: "playlistName fehlt" });
    const { status } = req.body as { status?: Status };
    if (status !== "public" && status !== "private") {
      return res
        .status(400)
        .json({ error: "status muss 'public' oder 'private' sein" });
    }
    const ok = setPlaylistStatusServer(username, playlistName, status);
    if (!ok) return res.status(404).json({ error: "Playlist nicht gefunden" });
    return res.json({ status });
  },
);

playlistsRouter.post(
  "/playlist/:playlistName/status/toggle",
  (req: Request, res: Response) => {
    const username = resolveUserFromReq(req);
    if (!username) return res.status(401).json({ error: "Unauthorized" });
    const playlistName = String(req.params.playlistName ?? "").trim();
    if (!playlistName)
      return res.status(400).json({ error: "playlistName fehlt" });
    const next = togglePlaylistStatusServer(username, playlistName);
    if (!next)
      return res.status(404).json({ error: "Playlist nicht gefunden" });
    return res.json({ status: next });
  },
);

playlistsRouter.get("/playlists/public", (_req: Request, res: Response) => {
  const db = loadPlaylists();
  const result: Array<{
    username: string;
    name: string;
    songs: string[];
    status: Status;
  }> = [];
  for (const username of Object.keys(db.playlistsByUser)) {
    const lists = db.playlistsByUser[username] ?? [];
    for (const playlist of lists) {
      const status: Status =
        (playlist as any).status === "public" ||
        (playlist as any).status === "private"
          ? (playlist as any).status
          : (playlist as any).public === true
            ? "public"
            : "private";
      if (status === "public") {
        result.push({
          username,
          name: playlist.name,
          songs: saveSongs(playlist.songs),
          status: "public",
        });
      }
    }
  }
  return res.json(result);
});

playlistsRouter.get(
  "/playlist/public/:username/:name",
  (req: Request, res: Response) => {
    const username = String(req.params.username ?? "");
    const name = String(req.params.name ?? "");
    const { playlist } = findPlaylist(username, name);
    if (!playlist)
      return res
        .status(404)
        .json({ error: "Öffentliche Playlist nicht gefunden" });

    const status: Status =
      (playlist as any).status === "public" ||
      (playlist as any).status === "private"
        ? (playlist as any).status
        : (playlist as any).public === true
          ? "public"
          : "private";

    if (status !== "public") {
      return res
        .status(404)
        .json({ error: "Öffentliche Playlist nicht gefunden" });
    }

    return res.json({ username, playlist: { ...playlist, status } });
  },
);

playlistsRouter.post("/playlist/ai/create", async (req: Request, res: Response) => {
  try {
    const { username, playlistName, mood } = req.body;

    if (!username || !playlistName || !mood) {
      return res
        .status(400)
        .json({ error: "username, playlistName oder mood fehlt" });
    }

      const success = await createAIPlaylist(username, playlistName, mood);

      if (success) {
        // Lade die neu erstellte Playlist
        const { playlist } = findPlaylist(username, playlistName);
        return res.status(201).json({
          ok: true,
          message: `Playlist "${playlistName}" wurde erfolgreich mit KI erstellt!`,
          playlist,
        });
      } else {
        return res.status(400).json({
          ok: false,
          error: "Playlist konnte nicht analysiert oder erweitert werden.",
        });
      }

      return res.status(200).json({ ok: true });
    } catch (error: any) {
      return res.status(500).json({
        error: "AI Analyse und Ergaenzung fehlgeschlagen",
        detail: error?.message ?? "Unbekannter Fehler",
      });
    }
  },
);

playlistsRouter.post("/playlist/create-ai", async (req: Request, res: Response) => {
  try {
    const { username, playlistName, mood } = req.body;

    if (!username || !playlistName || !mood) {
      return res
        .status(400)
        .json({ error: "username, playlistName oder mood fehlt" });
    }

    const success = await createAIPlaylist(username, playlistName, mood, undefined, {
      skipConfirmation: true,
    });

    if (!success) {
      return res.status(400).json({
        ok: false,
        error: "Playlist konnte nicht erstellt werden.",
      });
    }

    const { playlist } = findPlaylist(username, playlistName);
    return res.status(201).json({
      ok: true,
      message: `Playlist "${playlistName}" wurde erfolgreich mit KI erstellt!`,
      playlist,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "AI Playlist erstellen fehlgeschlagen",
      detail: error?.message ?? "Unbekannter Fehler",
    });
  }
});

export { playlistsRouter };
