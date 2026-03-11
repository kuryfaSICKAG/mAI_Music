// Backend/format.ts
import chalk from "chalk";
import type { Playlist } from "../../models/personalModels.ts";

/** Formatiert Playlists als schöne Liste mit Icons & Status */
export function formatPlaylists(playlists: Playlist[]): string {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    return chalk.gray("Keine Playlists gefunden.");
  }

  return playlists
    .map((pl, idx) => {
      const isPublic = (pl as any).status === "public";
      const icon = isPublic ? chalk.green("🔓 Public") : chalk.yellow("🔒 Private");

      return `${chalk.cyan(idx + 1 + ".")}  ${chalk.bold(pl.name)}  ${icon}`;
    })
    .join("\n");
}