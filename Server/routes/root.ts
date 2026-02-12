import { Router, type Request, type Response } from "express";

const rootRouter = Router();

rootRouter.get("/", (_req: Request, res: Response) => {
  res.send("Express + TypeScript Server läuft!");
});

export { rootRouter };
