import { Router, type Request, type Response } from "express";
import { loadPlaylists, loadUsers } from "../Data/data.ts";
import { serverStartedAt } from "../serverContext.ts";

const opsRouter = Router();

opsRouter.get("/alluserdata", (_req: Request, res: Response) => {
  const users = loadUsers();
  const playlists = loadPlaylists();
  return res.json({ users, playlists });
});

opsRouter.get("/health", (_req: Request, res: Response) => {
  return res.json({ ok: true, uptimeSec: Math.floor((Date.now() - serverStartedAt) / 1000), now: new Date().toISOString() });
});

opsRouter.get("/ready", (_req: Request, res: Response) => {
  try {
    loadUsers();
    loadPlaylists();
    return res.json({ ready: true });
  } catch {
    return res.status(500).json({ ready: false });
  }
});

export { opsRouter };
