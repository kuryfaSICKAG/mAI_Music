// Authentifizierungsmodul: kapselt ausschliesslich Serveranfragen fuer Login und Registrierung.

import { getServerUrl } from "./connection.ts";

/**
 * Parst JSON robust und liefert bei ungueltigem Inhalt `null`.
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
 * Registriert einen neuen Benutzer.
 * Rueckgabe: `{ ok: true, username }` bei Erfolg, sonst `{ ok: false, error }`.
 */
export async function createUser(
  username: string,
  password: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const base = getServerUrl();
  if (!base) return { ok: false, error: "Keine Server-Verbindung." };

  try {
    const res = await fetch(`${base}/auth/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? `Fehler: HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      username: data?.username ?? username,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Netzwerkfehler beim Registrieren.",
    };
  }
}

/**
 * Prueft Benutzername und Passwort beim Login.
 * Rueckgabe: `{ ok: true, username }` bei Erfolg, sonst `{ ok: false, error }`.
 */
export async function validateUser(
  username: string,
  password: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const base = getServerUrl();
  if (!base) return { ok: false, error: "Keine Server-Verbindung." };

  try {
    const res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? "Benutzername oder Passwort falsch.",
      };
    }

    return {
      ok: true,
      username: data?.username ?? username,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Netzwerkfehler beim Login." };
  }
}

export async function checkForUser(
  username: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const base = getServerUrl();
  if (!base) return { ok: false, error: "Keine Server-Verbindung." };

  try {
    const res = await fetch(`${base}/auth/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? "User existiert nicht.",
      };
    }

    return {
      ok: true,
      username: data?.username ?? username,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Netzwerkfehler Usercheckup." };
  }
}
