import type { Playlist } from "../../models/personalModels.ts";

/** Formatiert Playlists als lesbaren String (mit Public/Private-Status) */
export function formatPlaylists(playlists: Playlist[]): string {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    return "Keine Playlists gefunden.";
  }

  const lines: string[] = [];

  playlists.forEach((pl, idx) => {
    const statusEmoji =
      (pl as any).status === "public" ? "🔓" :
      (pl as any).status === "private" ? "🔒" :
      "";

    lines.push(`${idx+1}. ${pl.name} ${statusEmoji}`);
  });

  return lines.join("\n");
}