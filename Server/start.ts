import express from "express";
import { searchRouter } from "./routes/search.ts";
import { rootRouter } from "./routes/root.ts";
import { usersRouter } from "./routes/users.ts";
import { authRouter } from "./routes/auth.ts";
import { profileRouter } from "./routes/profile.ts";
import { favoritesRouter } from "./routes/favorites.ts";
import { playlistsRouter } from "./routes/playlists.ts";
import { recommendationsRouter } from "./routes/recommendations.ts";
import { onlineRouter } from "./routes/online.ts";
import { opsRouter } from "./routes/ops.ts";

const app = express();
const PORT = 8080;

app.use(express.json());

app.use(rootRouter);
app.use(searchRouter);
app.use(usersRouter);
app.use(authRouter);
app.use(profileRouter);
app.use(favoritesRouter);
app.use(playlistsRouter);
app.use(recommendationsRouter);
app.use(onlineRouter);
app.use(opsRouter);

app.listen(PORT, () => {
  console.log(`Server läuft unter http://localhost:${PORT}`);
});
