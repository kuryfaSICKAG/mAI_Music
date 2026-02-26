import type { Playlist } from "../../models/personalModels.ts";

/** Formatiert Playlists als lesbaren String */
export function formatPlaylists(playlists: Playlist[]): string {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    return "Keine Playlists gefunden.";
  }

  const lines: string[] = [];

  playlists.forEach((pl, idx) => {
    lines.push(`|${idx + 1}. ${pl.name}`);
    pl.songs?.forEach(songId => {
        lines.push(`-> Song-ID: ${songId}`);
    });
  });

  return lines.join("\n");
}
