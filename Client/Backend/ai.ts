import { getServerUrl, safeFetch } from "./connection.ts";

function base() {
  const url = getServerUrl();
  if (!url) throw new Error("Keine Server-Verbindung.");
  return url;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return String(data?.error || data?.detail || `HTTP ${res.status}`);
  } catch {
    await res.body?.cancel();
    return `HTTP ${res.status}`;
  }
}

export async function createAIPlaylist(
  username: string,
  playlistName: string,
  mood: string,
): Promise<boolean> {
  const res = await safeFetch(`${base()}/playlist/ai/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, playlistName, mood }),
  });

  if (!res.ok) {
    console.error(`AI-Playlist erstellen fehlgeschlagen: ${await readErrorMessage(res)}`);
    return false;
  }

  await res.body?.cancel();
  return true;
}

export async function AIPlaylistFromPlaylist(
  username: string,
  newPlaylistName: string,
  basePlaylistName: string,
): Promise<boolean> {
  const res = await safeFetch(`${base()}/playlist/ai/from-playlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, newPlaylistName, basePlaylistName }),
  });

  if (!res.ok) {
    console.error(`AI-Playlist aus Playlist fehlgeschlagen: ${await readErrorMessage(res)}`);
    return false;
  }

  await res.body?.cancel();
  return true;
}

export async function addAISongsToPlaylist(
  username: string,
  targetPlaylistName: string,
  mood: string,
): Promise<boolean> {
  const res = await safeFetch(`${base()}/playlist/ai/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, targetPlaylistName, mood }),
  });

  if (!res.ok) {
    console.error(`AI-Songs hinzufuegen fehlgeschlagen: ${await readErrorMessage(res)}`);
    return false;
  }

  await res.body?.cancel();
  return true;
}

export async function addAIToSamePlaylistFromPlaylistAnalysis(
  username: string,
  playlistName: string,
): Promise<boolean> {
  const res = await safeFetch(`${base()}/playlist/ai/analyze-add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, playlistName }),
  });

  if (!res.ok) {
    console.error(`AI-Analyse fuer Playlist fehlgeschlagen: ${await readErrorMessage(res)}`);
    return false;
  }

  await res.body?.cancel();
  return true;
}
