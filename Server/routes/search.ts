import { Router, type Request, type Response } from "express";
import { searchDeezer, type SearchType } from "../services/deezerSearch.ts";

const searchRouter = Router();

function isSearchType(value: string): value is SearchType {
  return value === "track" || value === "artist" || value === "album" || value === "all";
}

searchRouter.get("/search", async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q ?? req.query.query ?? "").trim();
    const rawType = String(req.query.type ?? "all").toLowerCase();
    const rawLimit = req.query.limit;
    const limit = rawLimit !== undefined ? Number(rawLimit) : undefined;

    if (!query) {
      return res.status(400).json({ error: "query fehlt" });
    }

    if (!isSearchType(rawType)) {
      return res.status(400).json({ error: "type ungültig (track|artist|album|all)" });
    }

    const items = await searchDeezer(query, rawType, limit);

    return res.json({
      source: "deezer",
      query,
      type: rawType,
      count: items.length,
      items,
    });
  } catch (error: any) {
    return res.status(502).json({
      error: "Song-Suche fehlgeschlagen",
      detail: error?.message ?? "Unbekannter Deezer-Fehler",
    });
  }
});

export { searchRouter };
