// Returns an array of all user objects from the user data file
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 👉 Typen aus personalModels importieren
import type {
  DB as PlaylistsDB,
  Playlist as PMPlaylist,
  Status,
} from "../../models/personalModels.ts";

// ESM Ersatz für __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dateien im selben Ordner wie data.ts
const userFile = path.join(__dirname, "user_Data.json");
const playlistFile = path.join(__dirname, "playlist_data.json");

// Datei/Ordner sicherstellen
function ensureFile(filePath: string, defaultData: any) {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      JSON.stringify(defaultData ?? {}, null, 4),
      "utf8",
    );
  }
}

// JSON Loader
export function loadJSON<T = any>(filePath: string, fallback: T = {} as T): T {
  ensureFile(filePath, fallback);

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw || !raw.trim()) {
      saveJSON(filePath, fallback);
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(
      `Warnung: ${path.basename(filePath)} war beschädigt oder leer. Datei wird zurückgesetzt.`,
      error,
    );
    saveJSON(filePath, fallback);
    return fallback;
  }
}

// JSON Saver
export function saveJSON(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
}

// ==================== USERS ====================
export type UserProfile = {
  favoriteGenres: string[];
  locale: string;
  onboardingDone: boolean;
};

export type UserRecord = {
  username: string;
  password: string;
  profile: UserProfile;
  favorites: any[];
};

export type AuthSession = {
  token: string;
  username: string;
  createdAt: string;
  expiresAt: string;
};

export type UsersDB = {
  users: UserRecord[];
  authSessions: AuthSession[];
};

const defaultProfile: UserProfile = {
  favoriteGenres: [],
  locale: "de-DE",
  onboardingDone: false,
};

function normalizeUser(user: any): UserRecord {
  return {
    username: typeof user?.username === "string" ? user.username : "",
    password: typeof user?.password === "string" ? user.password : "",
    profile: {
      favoriteGenres: Array.isArray(user?.profile?.favoriteGenres)
        ? user.profile.favoriteGenres.filter((g: any) => typeof g === "string")
        : defaultProfile.favoriteGenres,
      locale:
        typeof user?.profile?.locale === "string"
          ? user.profile.locale
          : defaultProfile.locale,
      onboardingDone:
        typeof user?.profile?.onboardingDone === "boolean"
          ? user.profile.onboardingDone
          : defaultProfile.onboardingDone,
    },
    favorites: Array.isArray(user?.favorites) ? user.favorites : [],
  };
}

function normalizeSession(session: any): AuthSession | null {
  if (
    typeof session?.token !== "string" ||
    typeof session?.username !== "string" ||
    typeof session?.createdAt !== "string" ||
    typeof session?.expiresAt !== "string"
  ) {
    return null;
  }

  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  return {
    token: session.token,
    username: session.username,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
}

export function loadUsers(): UsersDB {
  ensureFile(userFile, { users: [], authSessions: [] });

  const db = loadJSON<UsersDB>(userFile, {
    users: [],
    authSessions: [],
  });

  const users = Array.isArray(db?.users)
    ? db.users.map(normalizeUser).filter((u) => u.username)
    : [];

  const authSessions = Array.isArray(db?.authSessions)
    ? db.authSessions.map(normalizeSession).filter((s): s is AuthSession => !!s)
    : [];

  const normalized: UsersDB = { users, authSessions };
  saveUsers(normalized);
  return normalized;
}

export function saveUsers(data: UsersDB) {
  saveJSON(userFile, data);
}

// ==================== PLAYLISTS (playlistsByUser) ====================

// Lokale Typen ENTFERNT – wir nutzen die aus personalModels.
// Zusätzlich normalisieren wir beim Laden auf `status`.

// Hilfsfunktion: robustes Normalisieren einer Playlist (inkl. Migration von `public` -> `status`)
function normalizePlaylist(p: any): PMPlaylist {
  const name = typeof p?.name === "string" ? p.name : "Unbenannt";

  const songs: string[] = Array.isArray(p?.songs)
    ? p.songs
        .map((song: any) => {
          if (typeof song === "string" || typeof song === "number")
            return String(song);
          if (song && typeof song === "object" && song.id != null)
            return String(song.id);
          return "";
        })
        .filter((id: string) => id.length > 0)
    : [];

  const status: Status =
    p?.status === "public" || p?.status === "private"
      ? p.status
      : p?.public === true
        ? "public"
        : "private";

  const normalized: PMPlaylist = { name, songs, status };
  return normalized;
}

export function loadPlaylists(): PlaylistsDB {
  ensureFile(playlistFile, { playlistsByUser: {} });

  const raw = loadJSON<any>(playlistFile, { playlistsByUser: {} });

  const playlistsByUser: Record<string, PMPlaylist[]> = {};
  if (
    raw &&
    typeof raw === "object" &&
    typeof raw.playlistsByUser === "object"
  ) {
    for (const user of Object.keys(raw.playlistsByUser)) {
      const userPlaylists = Array.isArray(raw.playlistsByUser[user])
        ? (raw.playlistsByUser[user] as any[]).map(normalizePlaylist)
        : [];
      playlistsByUser[user] = userPlaylists;
    }
  }

  const db: PlaylistsDB = { playlistsByUser };
  // Rückschreiben, um altes Schema (mit `public`) zu bereinigen
  savePlaylists(db);
  return db;
}

export function savePlaylists(db: PlaylistsDB) {
  saveJSON(playlistFile, db);
}

export function getAllUsers(): any[] {
  const usersData = loadUsers();
  return Array.isArray(usersData.users) ? usersData.users : [];
}
