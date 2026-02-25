import { type Request } from "express";
import { DeezerAPI } from "../apiServices/deezerAPI/deezer.ts";
import { loadPlaylists, loadUsers, saveUsers, type UserProfile, type UserRecord, type UsersDB } from "./Data/data.ts";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const serverStartedAt = Date.now();
export const deezer = new DeezerAPI();

export function defaultProfile(): UserProfile {
  return {
    favoriteGenres: [],
    locale: "de-DE",
    onboardingDone: false,
  };
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function toSafeUser(user: UserRecord) {
  return {
    username: user.username,
    profile: user.profile,
    favorites: user.favorites,
  };
}

export function createSession(username: string): { token: string; createdAt: string; expiresAt: string } {
  const token = createId();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  return { token, createdAt, expiresAt };
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const xToken = req.headers["x-auth-token"];
  return typeof xToken === "string" && xToken.trim() ? xToken.trim() : null;
}

export function getAuthContext(req: Request): { db: UsersDB; user: UserRecord; token: string } | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const db = loadUsers();
  const now = Date.now();
  const sessions = db.authSessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  if (sessions.length !== db.authSessions.length) {
    db.authSessions = sessions;
    saveUsers(db);
  }

  const session = sessions.find((s) => s.token === token);
  if (!session) return null;

  const user = db.users.find((u) => u.username === session.username);
  if (!user) return null;

  return { db, user, token };
}

export function resolveEffectiveUsername(req: Request, bodyUsername?: string): string | null {
  const auth = getAuthContext(req);
  if (auth) return auth.user.username;
  if (typeof bodyUsername === "string" && bodyUsername.trim()) return bodyUsername.trim();
  return null;
}

export function safeSongs(songs: any): any[] {
  return Array.isArray(songs) ? songs : [];
}

export function findPlaylist(username: string, playlistName: string) {
  const db = loadPlaylists();
  const userPlaylists = db.playlistsByUser[username] ?? [];
  const playlist = userPlaylists.find((p: any) => p.name === playlistName);
  return { db, userPlaylists, playlist };
}
