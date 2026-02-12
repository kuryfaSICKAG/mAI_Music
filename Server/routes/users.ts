import { Router, type Request, type Response } from "express";
import { loadUsers, saveUsers } from "../Data/data.ts";
import { defaultProfile } from "../serverContext.ts";

const usersRouter = Router();

usersRouter.get("/users", (_req: Request, res: Response) => {
  const users = loadUsers();
  res.json(users);
});

usersRouter.post("/users", (req: Request, res: Response) => {
  const data = loadUsers();
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ error: "username oder password fehlt" });
  }

  if (data.users.some((u) => u.username === username)) {
    return res.status(409).json({ error: "Benutzer existiert bereits!" });
  }

  data.users.push({ username, password, profile: defaultProfile(), favorites: [] });
  saveUsers(data);

  return res.json({ message: "User gespeichert", data });
});

export { usersRouter };
