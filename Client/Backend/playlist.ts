import { getServerUrl, safeFetch } from "./connection.ts";
import type { Status, Playlist } from "../../models/personalModels.ts";

function base() {
  const url = getServerUrl();
  if (!url) throw new Error("Keine Server-Verbindung.");
  return url;
}

// Initialisiert den Benutzer im Playlist-System auf dem Server.
export async function initUser(username: string) {
  const res = await safeFetch(`${base()}/playlist/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  await res.body?.cancel(); // Der Response-Body wird nicht benoetigt und daher aktiv freigegeben.
}

// Laedt alle Playlists eines Benutzers.
export async function getPlaylists(username: string): Promise<Playlist[]> {
  const res = await safeFetch(
    `${base()}/playlist/${encodeURIComponent(username)}`,
  );
  // Der Body wird per `json()` gelesen; ein zusaetzliches `cancel()` ist dann unnoetig.
  return res.ok ? await res.json() : [];
}

// Erstellt eine neue Playlist mit optionalem Sichtbarkeitsstatus.
export async function createPlaylist(
  username: string,
  name: string,
  status: Status = "private",
): Promise<"created" | "exists" | "error"> {
  try {
    const res = await safeFetch(`${base()}/playlist/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name, status }),
    });
    if (res.status === 409) {
      await res.body?.cancel();
      return "exists";
    }
    if (!res.ok) {
      await res.body?.cancel();
      return "error";
    }
    await res.body?.cancel();
    return "created";
  } catch {
    return "error";
  }
}

// Loescht eine bestehende Playlist.
export async function deletePlaylist(username: string, name: string) {
  const res = await safeFetch(`${base()}/playlist/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, name }),
  });
  await res.body?.cancel(); // Der Response-Body wird nicht benoetigt und daher aktiv freigegeben.
}

// Benennt eine Playlist um.
export async function renamePlaylist(
  username: string,
  oldName: string,
  newName: string,
) {
  const res = await safeFetch(`${base()}/playlist/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, oldName, newName }),
  });
  await res.body?.cancel(); // Der Response-Body wird nicht benoetigt und daher aktiv freigegeben.
}

// Fuegt einen Song zur angegebenen Playlist hinzu.
export async function addSong(
  username: string,
  playlistName: string,
  songId: string,
): Promise<"added" | "exists" | "error"> {
  try {
    const res = await safeFetch(`${base()}/playlist/song/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, playlistName, songId }),
    });
    if (!res.ok) {
      await res.body?.cancel();
      return "error";
    }
    const data = await res.json();
    return data?.skipped ? "exists" : "added";
  } catch {
    return "error";
  }
}

// Entfernt einen Song anhand seines Index aus der Playlist.
export async function removeSongByIndex(
  username: string,
  playlistName: string,
  index: number,
) {
  const res = await safeFetch(`${base()}/playlist/song/remove`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, playlistName, index }),
  });
  await res.body?.cancel(); // Der Response-Body wird nicht benoetigt und daher aktiv freigegeben.
}

// Liest den aktuellen Sichtbarkeitsstatus einer Playlist.
export async function getPlaylistStatus(
  username: string,
  playlistName: string,
): Promise<Status> {
  const res = await safeFetch(
    `${base()}/playlist/${encodeURIComponent(playlistName)}/status?username=${encodeURIComponent(username)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );
  if (!res.ok)
    throw new Error(`Status konnte nicht geladen werden (${res.status})`);
  const data = await res.json(); // Der Body wird per `json()` gelesen; ein zusaetzliches `cancel()` ist dann unnoetig.
  return data.status as Status;
}

// Setzt den Sichtbarkeitsstatus einer Playlist explizit auf public/private.
export async function setPlaylistStatus(
  username: string,
  playlistName: string,
  status: Status,
): Promise<Status> {
  const res = await safeFetch(
    `${base()}/playlist/${encodeURIComponent(playlistName)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, status }),
    },
  );
  if (!res.ok)
    throw new Error(`Status konnte nicht gesetzt werden (${res.status})`);
  const data = await res.json(); // Der Body wird per `json()` gelesen; ein zusaetzliches `cancel()` ist dann unnoetig.
  return data.status as Status;
}

// Schaltet den Sichtbarkeitsstatus einer Playlist zwischen public und private um.
export async function togglePlaylistStatus(
  username: string,
  playlistName: string,
): Promise<Status> {
  const res = await safeFetch(
    `${base()}/playlist/${encodeURIComponent(playlistName)}/status/toggle`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    },
  );
  if (!res.ok)
    throw new Error(`Status konnte nicht umgeschaltet werden (${res.status})`);
  const data = await res.json(); // Der Body wird per `json()` gelesen; ein zusaetzliches `cancel()` ist dann unnoetig.
  return data.status as Status;
}
