import { Router, type Request, type Response } from "express";
import { loadPlaylists, loadUsers } from "../Data/data.ts";
import {
  deezer,
  findPlaylist,
  resolveEffectiveUsername,
  saveSongs,
} from "../serverContext.ts";
import { searchDeezer } from "../services/deezerSearch.ts";

const recommendationsRouter = Router();

recommendationsRouter.post(
  "/recommendations/playlist",
  async (req: Request, res: Response) => {
    try {
      const username = resolveEffectiveUsername(req, req.body?.username);
      const playlistName = String(req.body?.playlistName ?? "").trim();
      const limit = Math.max(1, Math.min(30, Number(req.body?.limit ?? 10)));

      if (!username || !playlistName) {
        return res
          .status(400)
          .json({ error: "username oder playlistName fehlt" });
      }

      const { playlist } = findPlaylist(username, playlistName);
      if (!playlist)
        return res.status(404).json({ error: "Playlist nicht gefunden" });

      const seedIds = saveSongs(playlist.songs).slice(0, 3);
      const resolvedSeeds = await Promise.all(
        seedIds.map(async (id) => {
          const track = await deezer.lookupTrack(id);
          return String(
            track?.title || track?.title_short || track?.name || "",
          ).trim();
        }),
      );
      const seeds = resolvedSeeds.filter(Boolean);

      if (seeds.length === 0) {
        return res.json({ ok: true, source: "playlist", recommendations: [] });
      }

      const existing = new Set(saveSongs(playlist.songs));
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
      return res
        .status(502)
        .json({
          error: "Empfehlungen fehlgeschlagen",
          detail: error?.message ?? "Unbekannter Fehler",
        });
    }
  },
);

recommendationsRouter.get(
  "/recommendations/user/:username",
  async (req: Request, res: Response) => {
    try {
      const username = String(req.params.username ?? "").trim();
      const limit = Math.max(1, Math.min(30, Number(req.query.limit ?? 10)));

      const users = loadUsers();
      const user = users.users.find((u) => u.username === username);
      if (!user) return res.status(404).json({ error: "User nicht gefunden" });

      const playlists = loadPlaylists().playlistsByUser[username] ?? [];
      const favoriteSeed = user.favorites[0]?.name
        ? String(user.favorites[0].name)
        : "";
      const playlistSeedId = playlists[0]?.songs?.[0]
        ? String(playlists[0].songs[0])
        : "";
      let playlistSeed = "";
      if (playlistSeedId) {
        const track = await deezer.lookupTrack(playlistSeedId);
        playlistSeed = String(
          track?.title || track?.title_short || track?.name || "",
        ).trim();
      }
      const seed = favoriteSeed || playlistSeed;

      if (!seed) {
        return res.json({ ok: true, source: "user", recommendations: [] });
      }

      const recommendations = await searchDeezer(seed, "track", limit);
      return res.json({ ok: true, source: "user", recommendations });
    } catch (error: any) {
      return res
        .status(502)
        .json({
          error: "User-Empfehlungen fehlgeschlagen",
          detail: error?.message ?? "Unbekannter Fehler",
        });
    }
  },
);

export { recommendationsRouter };
