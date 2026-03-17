// Verbindungsmodul fuer den Serverzugriff inkl. Validierung und optionaler Authentifizierung.

import { authenticate } from "../Frontend/authenticate.ts";

/**
 * Interner Zustand: aktuelle Server-URL.
 */
let SERVER_URL: string | null = null;

export function getServerUrl(): string | null {
  return SERVER_URL;
}

export function setServerUrl(url: string) {
  SERVER_URL = url;
}

/**
 * Robuster Ersatz fuer `fetch()` mit einmaligem Retry bei Verbindungsabbruechen.
 * Dadurch werden kurzzeitig inaktive Keep-Alive-Verbindungen transparent abgefangen.
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err: any) {
    if (
      err?.cause?.code === "ECONNRESET" ||
      err?.cause?.code === "ECONNREFUSED"
    ) {
      // Bei abgebrochener oder inaktiver Verbindung wird genau ein Wiederholungsversuch ausgefuehrt.
      return fetch(url, options);
    }
    throw err;
  }
}

/**
 * Prueft Host/IP (IPv4, IPv6, Hostname) auf gueltiges Format.
 */
function isValidHost(host: string): boolean {
  // Einfache Plausibilitaetspruefung fuer Hostname oder IP-Adresse (IPv4/IPv6).
  const isIPv4 =
    /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/.test(
      host,
    );
  const isIPv6 = /^[0-9a-fA-F:]+$/.test(host) && host.includes(":"); // Vereinfachte Heuristik fuer IPv6.
  const isHostname =
    /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$/.test(
      host,
    );

  return isIPv4 || isIPv6 || isHostname;
}

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Baut aus Host und Port eine gueltige Basis-URL (inklusive IPv6-Unterstuetzung).
 */
function buildBaseUrl(
  host: string,
  port: number,
  protocol: "http" | "https" = "http",
): string {
  // IPv6-Adressen muessen in URLs in eckige Klammern gesetzt werden.
  const bracketed =
    host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return `${protocol}://${bracketed}:${port}`;
}

/**
 * Fuehrt einen Ping mit Timeout auf den Server aus.
 * Erwartet eine erfolgreiche Antwort auf `GET /`.
 */
async function pingServer(baseUrl: string, timeoutMs = 3000): Promise<void> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/`, { signal: controller.signal });
    await res.body?.cancel(); // Gibt den nicht benoetigten Response-Body frei.
    if (!res.ok) {
      throw new Error(`Ping fehlgeschlagen: HTTP ${res.status}`);
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Zeitüberschreitung beim Verbindungsversuch (Timeout).");
    }
    throw new Error(`Server nicht erreichbar: ${err?.message ?? String(err)}`);
  } finally {
    clearTimeout(t);
  }
}

/**
 * Oeffentliche API:
 * - validiert Host und Port,
 * - erstellt die Basis-URL,
 * - prueft die Erreichbarkeit des Servers,
 * - speichert bei Erfolg die Server-URL,
 * - startet optional die Authentifizierung.
 */
export async function connectToServer(
  host: string,
  port: number,
  options?: {
    protocol?: "http" | "https";
    timeoutMs?: number;
    autoAuthenticate?: boolean;
    onError?: (msg: string) => void; // Callback fuer UI-Fehlermeldungen.
    onSuccess?: (url: string) => void; // Callback fuer UI-Erfolgsmeldungen.
  },
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const protocol = options?.protocol ?? "http";
  const timeoutMs = options?.timeoutMs ?? 3000;

  // Fuehrt fruehe Eingabepruefungen aus, bevor Netzwerkaufrufe gestartet werden.
  if (!isValidHost(host)) {
    const msg = "Ungültiger Host/Hostname/IP.";
    options?.onError?.(msg);
    return { ok: false, error: msg };
  }
  if (!isValidPort(port)) {
    const msg = "Ungültiger Port (erlaubt: 1–65535).";
    options?.onError?.(msg);
    return { ok: false, error: msg };
  }

  const baseUrl = buildBaseUrl(host, port, protocol);

  try {
    await pingServer(baseUrl, timeoutMs);
    setServerUrl(baseUrl);
    options?.onSuccess?.(baseUrl);

    if (options?.autoAuthenticate) {
      // Wartet auf Abschluss der Authentifizierung, damit Folgeablaeufe konsistent bleiben.
      await authenticate();
    }

    return { ok: true, url: baseUrl };
  } catch (e: any) {
    const msg = e?.message ?? "Unbekannter Fehler beim Verbindungsaufbau.";
    options?.onError?.(msg);
    return { ok: false, error: msg };
  }
}
