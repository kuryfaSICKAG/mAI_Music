import { Router, type Request, type Response } from "express";
import { loadPlaylists, savePlaylists } from "../Data/data.ts";
import { saveSongs } from "../serverContext.ts";
import type { Playlist, Status } from "../../models/personalModels.ts";

const onlineRouter = Router();

onlineRouter.post("/sendPlaylist", (req: Request, res: Response) => {
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

    // Status sauber ableiten (Migration: altes public:boolean -> status)
    const status: Status =
      source?.status === "public" || source?.status === "private"
        ? source.status
        : (source as any)?.public === true
        ? "public"
        : "private";

    // Nur gültiges Playlist-Objekt speichern (keine Zusatzfelder wie receivedFrom/receivedAt!)
    const transferred: Playlist = {
      name: targetName,
      songs: saveSongs(source.songs),
      status,
    };

    db.playlistsByUser[toUser] = [...toArr, transferred];
    savePlaylists(db);

    return res.json({
      ok: true,
      message: `Playlist '${source.name}' wurde an '${toUser}' gesendet.`,
      receivedAs: targetName,
    });
  } catch {
    return res.status(500).json({ error: "Playlist konnte nicht gesendet werden" });
  }
});

onlineRouter.get("/playlist/received/:username", (req: Request, res: Response) => {
  try {
    const username = req.params.username as string;
    const db = loadPlaylists();
    const all = db.playlistsByUser[username] ?? [];

    // Hinweis: Da in der DB keine Extra-Felder gespeichert werden,
    // liefert diese Route aktuell einfach alle Playlists des Users.
    // Für echten „Posteingang“ bitte separaten Store nutzen (kann ich dir bauen).
    return res.json(all);
  } catch {
    return res.status(500).json({ error: "Empfangene Playlists konnten nicht geladen werden" });
  }
});

export { onlineRouter };