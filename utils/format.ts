import type { Song, Playlist } from "../models/personalModels.ts";

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
        const artist = song.artist
        .map(a => a.name)          // Artist[] -> string[]
        .map(toTitleCase)          // jeden Namen normalisieren
        .join(", ");               // mehrere Artists hübsch zusammenfügen
        const title = toTitleCase(song.name);
        const mmss = toMmSs(song.duration);
        lines.push(`-> ${title} by ${artist} (${mmss} min)`);
    });
  });

  return lines.join("\n");
}
