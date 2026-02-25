// Returns an array of all user objects from the user data file
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM Ersatz für __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dateien im selben Ordner wie data.ts
const userFile = path.join(__dirname, "user_Data.json");
const playlistFile = path.join(__dirname, "playlist_data.json");

// Datei/Ordner sicherstellen
function ensureFile(filePath: string, defaultData: object) {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4), "utf8");
    }
}

// JSON Loader
export function loadJSON<T = any>(filePath: string): T {
    ensureFile(filePath, {});  // leeres Objekt, falls Datei fehlt
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
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
            locale: typeof user?.profile?.locale === "string" ? user.profile.locale : defaultProfile.locale,
            onboardingDone: typeof user?.profile?.onboardingDone === "boolean"
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

    const db = loadJSON<UsersDB>(userFile);

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

export type Playlist = {
    name: string;
    songs: any[];
    public: boolean;
};

export type PlaylistDB = {
    playlistsByUser: Record<string, Playlist[]>;
};


export function loadPlaylists(): PlaylistDB {
    // Sicherstellen, dass Datei existiert und richtige Struktur hat
    ensureFile(playlistFile, { playlistsByUser: {} });

    const db = loadJSON<PlaylistDB>(playlistFile);

    // Falls Struktur kaputt oder alt → reparieren
    if (!db.playlistsByUser || typeof db.playlistsByUser !== "object") {
        db.playlistsByUser = {};
        savePlaylists(db);
    }

    // Ensure all playlists have stable fields
    for (const user in db.playlistsByUser) {
        const userPlaylists = Array.isArray(db.playlistsByUser[user]) ? db.playlistsByUser[user] : [];
        db.playlistsByUser[user] = userPlaylists.map((pl: any) => ({
            ...pl,
            name: typeof pl?.name === "string" ? pl.name : "Unbenannt",
            songs: Array.isArray(pl?.songs) ? pl.songs : [],
            public: typeof pl?.public === "boolean" ? pl.public : false
        }));
    }
    savePlaylists(db);
    return db;
}

export function savePlaylists(db: PlaylistDB) {
    saveJSON(playlistFile, db);
}

export function getAllUsers(): any[] {
    const usersData = loadUsers();
    return Array.isArray(usersData.users) ? usersData.users : [];
}