// Client/Backend/onlineServices.ts
// Online-Funktionen fürs Verschicken und Empfangen von Playlists (minimal, ohne TS-Interfaces)

import { getServerUrl } from "./connection.ts";

/** URL sicher zusammenbauen (verhindert doppelte Slashes) */
function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Hilfsfunktion: Antwort als Text holen (falls kein JSON) */
async function safeText(res: Response) {
  try { return await res.text(); } catch { return ""; }
}

/** Hilfsfunktion: Antwort als JSON holen, sonst Fallback */
async function safeJson<T = any>(res: Response, fallback: T): Promise<T> {
  try { return await res.json() as T; } catch { return fallback; }
}

/* -----------------------------
   PLAYLIST SENDEN
----------------------------- */
export async function sendPlaylist(
  fromUser: string,
  toUser: string,
  playlistName: string
): Promise<{ ok: boolean; message?: string; error?: string }> {

  const base = getServerUrl();
  if (!base) {
    return { ok: false, error: "Keine Verbindung zum Server. Bitte zuerst connectToServer() ausführen." };
  }

  const url = joinUrl(base, "/sendPlaylist");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUser, toUser, playlistName }),
    });

    if (!res.ok) {
      const text = await safeText(res);
      return { ok: false, error: `HTTP ${res.status}: ${text || "Unbekannter Fehler"}` };
    }

    const data = await safeJson(res, {} as any);
    return { ok: true, message: data?.message ?? "Playlist erfolgreich verschickt!" };

  } catch (err: any) {
    // z.B. ECONNRESET, ENOTFOUND, ECONNREFUSED ...
    return { ok: false, error: `Netzwerkfehler: ${err?.message ?? String(err)}` };
  }
}

/* -----------------------------
   EMPFANGENE PLAYLISTS ABRUFEN
----------------------------- */
export async function getReceivedPlaylists(
  username: string
): Promise<{ ok: boolean; playlists?: any[]; error?: string }> {

  const base = getServerUrl();
  if (!base) {
    return { ok: false, error: "Keine Verbindung zum Server. Bitte zuerst connectToServer() ausführen." };
  }

  const url = joinUrl(base, `/playlist/received/${encodeURIComponent(username)}`);

  try {
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      const text = await safeText(res);
      return { ok: false, error: `HTTP ${res.status}: ${text || "Unbekannter Fehler"}` };
    }

    const playlists = await safeJson(res, [] as any[]);
    return { ok: true, playlists };

  } catch (err: any) {
    return { ok: false, error: `Netzwerkfehler: ${err?.message ?? String(err)}` };
  }
}