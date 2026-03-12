// Backend/format.ts
import chalk from "chalk";
import type { Playlist } from "../../models/personalModels.ts";
import {
  getTrackArtistFromID,
  getTrackDurationFromID,
  getTrackNameFromID,
} from "../../services/service.ts";

function toMinutesSeconds(rawDuration: string): string {
  const seconds = Number(rawDuration);
  if (!Number.isFinite(seconds) || seconds < 0) return "?:??";

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/** Formatiert Playlists als schöne Liste mit Icons & Status */
export function formatPlaylists(playlists: Playlist[]): string {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    return chalk.gray("Keine Playlists gefunden.");
  }

  return playlists
    .map((pl, idx) => {
      const isPublic = (pl as any).status === "public";
      const icon = isPublic
        ? chalk.green("🔓 Public")
        : chalk.yellow("🔒 Private");

      return `${chalk.cyan(idx + 1 + ".")}  ${chalk.bold(pl.name)}  ${icon}`;
    })
    .join("\n");
}

export async function formatSongs(playlist: Playlist): Promise<string> {

    const songs = await Promise.all(
      playlist.songs.map(async (id) => {
        const title = await getTrackNameFromID(id);
        const artist = await getTrackArtistFromID(id);
        const durationRaw = await getTrackDurationFromID(id);
        const duration = toMinutesSeconds(durationRaw);
        return {
          id,
          label: `${title} — ${artist} (${duration})`,
        };
      }),
    );

    return songs
      .map((song, idx) => `${chalk.cyan(idx + 1 + ".")}  ${chalk.bold(song.label)}`)
      .join("\n");
}