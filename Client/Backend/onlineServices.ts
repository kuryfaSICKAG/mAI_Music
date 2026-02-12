// Client/Backend/onlineServices.ts
// Funktionen für Online-Features (Playlists verschicken etc.)
// Nutzt automatisch die vom User gewählte Server-URL aus connection.ts

import { getServerUrl } from "./connection.ts";

export async function sendPlaylist(fromUser: string, toUser: string, playlistName: string) {
    const baseUrl = getServerUrl();

    if (!baseUrl) {
        console.error("# Kein Server verbunden! (SERVER_URL ist null)");
        return {
            ok: false,
            error: "Keine Verbindung zum Server. Bitte zuerst connectToServer() ausführen."
        };
    }

    const url = `${baseUrl}/sendPlaylist`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                fromUser,
                toUser,
                playlistName
            }),
        });

        if (!res.ok) {
            let text = await res.text().catch(() => "");
            console.error("# Serverfehler:", text);
            return {
                ok: false,
                error: `HTTP ${res.status}: ${text || "Unbekannter Fehler"}`
            };
        }

        const data = await res.json().catch(() => ({}));

        return {
            ok: true,
            message: data.message ?? "Playlist erfolgreich verschickt!"
        };

    } catch (err: any) {
        return {
            ok: false,
            error: `Netzwerkfehler: ${err?.message ?? String(err)}`
        };
    }
}
