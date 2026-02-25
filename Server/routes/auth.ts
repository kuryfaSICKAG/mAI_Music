import { Router, type Request, type Response } from "express";
import { loadUsers, saveUsers } from "../Data/data.ts";
import { createSession, defaultProfile, getAuthContext, getTokenFromRequest, toSafeUser } from "../serverContext.ts";

const authRouter = Router();

authRouter.post("/auth/create", (req: Request, res: Response) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ error: "username oder password fehlt" });
  }

  const data = loadUsers();
  const exists = data.users.some((u: any) => u.username === username);

  if (exists) {
    return res.status(400).json({ error: "Benutzer existiert bereits!" });
  }

  data.users.push({ username, password, profile: defaultProfile(), favorites: [] });
  const session = createSession(username);
  data.authSessions.push({ ...session, username });
  saveUsers(data);

  return res.json({ message: "User erstellt", username, token: session.token, expiresAt: session.expiresAt });
});

authRouter.post("/auth/login", (req: Request, res: Response) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ error: "username oder password fehlt" });
  }

  const data = loadUsers();
  const user = data.users.find((u: any) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Benutzername oder Passwort falsch!" });
  }

  const session = createSession(username);
  data.authSessions = data.authSessions.filter((s) => s.username !== username);
  data.authSessions.push({ ...session, username });
  saveUsers(data);

  return res.json({ message: "Login erfolgreich", username, token: session.token, expiresAt: session.expiresAt });
});

authRouter.post("/auth/logout", (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Kein Auth-Token" });

  const db = loadUsers();
  const before = db.authSessions.length;
  db.authSessions = db.authSessions.filter((s) => s.token !== token);
  saveUsers(db);

  if (before === db.authSessions.length) {
    return res.status(404).json({ error: "Session nicht gefunden" });
  }

  return res.json({ ok: true });
});

authRouter.post("/auth/refresh", (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Kein Auth-Token" });

  const db = loadUsers();
  const oldSession = db.authSessions.find((s) => s.token === token);
  if (!oldSession) {
    return res.status(401).json({ error: "Ungültige Session" });
  }

  if (new Date(oldSession.expiresAt).getTime() <= Date.now()) {
    db.authSessions = db.authSessions.filter((s) => s.token !== token);
    saveUsers(db);
    return res.status(401).json({ error: "Session abgelaufen" });
  }

  const next = createSession(oldSession.username);
  db.authSessions = db.authSessions.filter((s) => s.token !== token);
  db.authSessions.push({ ...next, username: oldSession.username });
  saveUsers(db);

  return res.json({ ok: true, token: next.token, expiresAt: next.expiresAt });
});

authRouter.get("/auth/me", (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Nicht authentifiziert" });

  return res.json({ ok: true, user: toSafeUser(auth.user) });
});

export { authRouter };
