import { Router, type Request, type Response } from "express";
import { loadPlaylists, savePlaylists } from "../Data/data.ts";
import { saveSongs } from "../serverContext.ts";
import type { Playlist } from "../../models/personalModels.ts";

const onlineRouter = Router();

onlineRouter.post("/sendPlaylist", (req: Request, res: Response) => {
  try {
    const { fromUser, toUser, playlistName } = req.body;

    if (!fromUser || !toUser || !playlistName) {
      return res
        .status(400)
        .json({ error: "fromUser, toUser oder playlistName fehlt" });
    }

    const db = loadPlaylists();
    const fromArr = db.playlistsByUser[fromUser] ?? [];
    const toArr = db.playlistsByUser[toUser] ?? [];

    const source = fromArr.find((p: any) => p.name === playlistName);
    if (!source) {
      return res.status(404).json({ error: "Quell-Playlist nicht gefunden" });
    }

    // Bricht ab, wenn beim Ziel bereits eine Playlist mit gleichem Namen existiert.
    if (toArr.some((p: any) => p.name === playlistName)) {
      return res.status(409).json({
        ok: false,
        error: `Playlist '${playlistName}' existiert bei '${toUser}' bereits.`,
      });
    }

    const targetName = playlistName; // Uebernimmt den Namen unveraendert ohne automatisches Umbenennen.

    // Empfangene Playlists werden aus Datenschutzgruenden standardmaessig als `private` gespeichert.
    const transferred: Playlist = {
      name: targetName,
      songs: saveSongs(source.songs),
      status: "private",
    };

    db.playlistsByUser[toUser] = [...toArr, transferred];
    savePlaylists(db);

    return res.json({
      ok: true,
      message: `Playlist '${source.name}' wurde an '${toUser}' gesendet.`,
    });
  } catch {
    return res
      .status(500)
      .json({ error: "Playlist konnte nicht gesendet werden" });
  }
});

onlineRouter.get(
  "/playlist/received/:username",
  (req: Request, res: Response) => {
    try {
      const username = req.params.username as string;
      const db = loadPlaylists();
      const all = db.playlistsByUser[username] ?? [];

      // Da in der Datenstruktur kein separates Eingangsfeld existiert,
      // liefert diese Route derzeit alle Playlists des Benutzers zurueck.
      return res.json(all);
    } catch {
      return res
        .status(500)
        .json({ error: "Empfangene Playlists konnten nicht geladen werden" });
    }
  },
);

export { onlineRouter };
