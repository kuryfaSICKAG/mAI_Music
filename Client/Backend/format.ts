import type { Song, Playlist } from "../../models/personalModels.ts";

/** Wandelt Sekunden nach mm:ss um */
function toMmSs(duration: number | string): string {
  if (typeof duration === "string") {
    // falls schon "mm:ss" übergeben wurde
    return duration;
  }
  const m = Math.floor(duration / 60);
  const s = duration % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Optional: Titel case-normalisieren (Fate of Ophelia) */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Formatiert Playlists als lesbaren String */
export function formatPlaylists(playlists: Playlist[]): string {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    return "Keine Playlists gefunden.";
  }

  const lines: string[] = [];

  playlists.forEach((pl, idx) => {
    lines.push(`|${idx + 1}. ${pl.name}`);
    pl.songs?.forEach(song => {
        const artist = Array.isArray(song?.artist)
        ? song.artist
            .map(a => a?.name)
            .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
            .map(toTitleCase)
            .join(", ")
        : "Unknown Artist";
        const title = typeof song?.name === "string" && song.name.trim().length > 0
          ? toTitleCase(song.name)
          : "Unknown Title";
        const mmss = typeof song?.duration === "number" || typeof song?.duration === "string"
          ? toMmSs(song.duration)
          : "00:00";
        lines.push(`-> ${title} by ${artist} (${mmss} min)`);
    });
  });

  return lines.join("\n");
}
