import express from "express";
import { searchRouter } from "./routes/search.ts";
import { rootRouter } from "./routes/root.ts";
import { usersRouter } from "./routes/users.ts";
import { authRouter } from "./routes/auth.ts";
import { playlistsRouter } from "./routes/playlists.ts";
import { onlineRouter } from "./routes/online.ts";

const app = express();
const PORT = 8080;

app.use(express.json());

app.use(express.json());
app.use(rootRouter);
app.use(searchRouter);
app.use(usersRouter);
app.use(authRouter);
app.use(playlistsRouter);
app.use(onlineRouter);

app.listen(PORT, () => {
  console.log(`Server läuft unter http://localhost:${PORT}`);
});
