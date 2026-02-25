import { Router, type Request, type Response } from "express";
import { loadPlaylists, savePlaylists } from "../Data/data.ts";
import { safeSongs } from "../serverContext.ts";

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

    const transferred = {
      name: targetName,
      songs: safeSongs(source.songs).map((s: any) => ({ ...s })),
      public: typeof source.public === "boolean" ? source.public : false,
      receivedFrom: fromUser,
      receivedAt: new Date().toISOString(),
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

    const received = all.filter((p: any) => typeof p.receivedFrom === "string");
    return res.json(received);
  } catch {
    return res.status(500).json({ error: "Empfangene Playlists konnten nicht geladen werden" });
  }
});

export { onlineRouter };
