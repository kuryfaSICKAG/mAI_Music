// Client/Backend/authentication.ts
// ============================================================
// Dieses Modul führt ausschließlich Server-Requests aus.
// Keine UI, kein activeUser, keine zusätzlichen Features.
// ============================================================

import { getServerUrl } from "./connection.js";

/**
 * Hilfsfunktion: JSON sicher parsen
 */
async function parseJsonSafe(res: Response): Promise<any | null> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * USER REGISTRIEREN
 * ------------------------------
 * Erfolgreich:
 *   { ok: true, username: "..." }
 * Fehler:
 *   { ok: false, error: "..." }
 */
export async function createUser(
  username: string,
  password: string
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  
  const base = getServerUrl();
  if (!base) return { ok: false, error: "Keine Server-Verbindung." };

  try {
    const res = await fetch(`${base}/auth/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? `Fehler: HTTP ${res.status}`
      };
    }

    return {
      ok: true,
      username: data?.username ?? username
    };

  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Netzwerkfehler beim Registrieren." };
  }
}

/**
 * USER LOGIN
 * ------------------------------
 * Erfolgreich:
 *   { ok: true, username: "..." }
 * Fehler:
 *   { ok: false, error: "..." }
 */
export async function validateUser(
  username: string,
  password: string
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {

  const base = getServerUrl();
  if (!base) return { ok: false, error: "Keine Server-Verbindung." };

  try {
    const res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? "Benutzername oder Passwort falsch."
      };
    }

    return {
      ok: true,
      username: data?.username ?? username
    };

  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Netzwerkfehler beim Login." };
  }
}