import { Router, type Request, type Response } from "express";
import { loadUsers, saveUsers } from "../Data/data.ts";
import { getAuthContext } from "../serverContext.ts";

const profileRouter = Router();

profileRouter.get("/profile/me", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  return res.json({ username: auth.user.username, profile: auth.user.profile });
});

profileRouter.patch("/profile/me", (req: Request, res: Response) => {
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

profileRouter.get("/profile/:username", (req: Request, res: Response) => {
  const username = String(req.params.username ?? "");
  const db = loadUsers();
  const user = db.users.find((u) => u.username === username);

  if (!user) {
    return res.status(404).json({ error: "User nicht gefunden" });
  }

  return res.json({ username: user.username, profile: user.profile });
});

export { profileRouter };
