// Client/Backend/connection.ts
// Stellt die Verbindung zum Server her, validiert sie und (optional) startet authentication()

import { authenticate } from "../Frontend/authenticate.js";

/**
 * Interner Zustand: aktuelle Server-URL (wird von setServer/getServer verwaltet)
 */
let SERVER_URL: string | null = null;

export function getServerUrl(): string | null {
  return SERVER_URL;
}

export function setServerUrl(url: string) {
  SERVER_URL = url;
}

/**
 * Plausibilitätscheck für Host/IP (IPv4, IPv6, Hostname) und Port
 */
function isValidHost(host: string): boolean {
  // sehr einfache Plausi: hostname oder IP (IPv4/IPv6)
  const isIPv4 = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/.test(host);
  const isIPv6 = /^[0-9a-fA-F:]+$/.test(host) && host.includes(":"); // grob
  const isHostname = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$/.test(host);

  return isIPv4 || isIPv6 || isHostname;
}

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Baut aus host/port eine gültige URL (unterstützt IPv6)
 */
function buildBaseUrl(host: string, port: number, protocol: "http" | "https" = "http"): string {
  // IPv6 muss in [ ] geklammert werden
  const bracketed = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return `${protocol}://${bracketed}:${port}`;
}

/**
 * Ping zum Server mit Timeout.
 * Erwartet, dass dein Server auf GET "/" antwortet.
 */
async function pingServer(baseUrl: string, timeoutMs = 3000): Promise<void> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/`, { signal: controller.signal });
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
 * Öffentliche API:
 *  - Validiert Host & Port
 *  - Baut URL
 *  - Pingt den Server
 *  - Setzt SERVER_URL bei Erfolg
 *  - (optional) ruft authenticate() auf
 */
export async function connectToServer(
  host: string,
  port: number,
  options?: {
    protocol?: "http" | "https";
    timeoutMs?: number;
    autoAuthenticate?: boolean;
    onError?: (msg: string) => void;   // für UI-Fehlerausgabe
    onSuccess?: (url: string) => void; // für UI-Erfolgsmeldung
  }
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const protocol = options?.protocol ?? "http";
  const timeoutMs = options?.timeoutMs ?? 3000;

  // Plausibilitätsprüfungen
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
      // WICHTIG: authenticate ist async → warten, damit Abläufe konsistent sind
      await authenticate();
    }

    return { ok: true, url: baseUrl };
  } catch (e: any) {
    const msg = e?.message ?? "Unbekannter Fehler beim Verbindungsaufbau.";
    options?.onError?.(msg);
    return { ok: false, error: msg };
  }
}
