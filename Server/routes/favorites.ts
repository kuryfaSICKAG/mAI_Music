import { Router, type Request, type Response } from "express";
import { getAuthContext } from "../serverContext.ts";
import { saveUsers } from "../Data/data.ts";

const favoritesRouter = Router();

favoritesRouter.get("/favorites", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  return res.json({ username: auth.user.username, favorites: auth.user.favorites });
});

favoritesRouter.post("/favorites/song", (req: Request, res: Response) => {
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

favoritesRouter.delete("/favorites/song", (req: Request, res: Response) => {
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

export { favoritesRouter };
