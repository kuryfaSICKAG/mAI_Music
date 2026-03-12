import { DeezerAPI } from "../apiServices/deezerAPI/deezer.ts";
import { ask, askInt } from "./prompt.ts";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

// store ids (string or number) to avoid type mismatches
export const searchedSongs: Array<string | number> = [];

export function getSearchedSongs(): Array<string | number> {
  return searchedSongs;
}

export function clearSearchedSongs(): void {
  searchedSongs.length = 0;
}

// gibt Array mit allen songg ids zurück
export async function searchSong(
  track: string,
): Promise<Array<string | number>> {
  const api = new DeezerAPI();
  try {
    const tracks = await api.searchTrack(track);
    if (tracks.data && tracks.data.length > 0) {
      console.log("Tracks found:");
      clearSearchedSongs();
      tracks.data.slice(0, 25).forEach((t: any, idx: number) => {
        console.log(`Track #${idx + 1}:`);
        console.log(`  Title: ${t.title || t.name || t.title_short}`);
        if (t.artist && t.artist.name) {
          console.log(`  Artist: ${t.artist.name}`);
        } else if (t.artist) {
          console.log(`  Artist: ${t.artist}`);
        } else if (t.artist_name) {
          console.log(`  Artist: ${t.artist_name}`);
        }
        if (t.album && t.album.title) {
          console.log(`  Album: ${t.album.title}`);
        } else if (t.album) {
          console.log(`  Album: ${t.album}`);
        } else if (t.album_title) {
          console.log(`  Album: ${t.album_title}`);
        }
        if (t.duration) {
          console.log(`  Duration: ${t.duration} seconds`);
        }
        if (t.id) {
          console.log(`  ID: ${t.id}`);
          searchedSongs.push(t.id);
        }
        console.log("---");
      });
      return searchedSongs;
    } else {
      console.log("No tracks found.");
      return [];
    }
  } catch (err: any) {
    console.error("searchSong error:", err?.message || err);
    return [];
  }
}

export async function searchSongInv(
  track: string,
): Promise<Array<string | number>> {
  const api = new DeezerAPI();
  try {
    const tracks = await api.searchTrack(track);
    if (tracks.data && tracks.data.length > 0) {
      clearSearchedSongs();
      tracks.data.slice(0, 25).forEach((t: any) => {
        if (t.id) {
          searchedSongs.push(t.id);
        }
      });
      return searchedSongs;
    } else {
      return [];
    }
  } catch (err: any) {
    console.error("searchSongInv error:", err?.message || err);
    return [];
  }
}

export async function outputTrackFromID(songID: string) {
  const api = new DeezerAPI();
  try {
    const data = await api.lookupTrack(songID);
    if (!data) return "Unknown Title";
    // Deezer track objects usually expose `title` (or `name` / `title_short`)
    const title =
      data.title ||
      data.name ||
      data.title_short ||
      (data.track && (data.track.title || data.track.name));
    if (data.artist && data.artist.name) {
      console.log(`  Artist: ${data.artist.name}`);
    } else if (data.artist) {
      console.log(`  Artist: ${data.artist}`);
    } else if (data.artist_name) {
      console.log(`  Artist: ${data.artist_name}`);
    }
    if (data.album && data.album.title) {
      console.log(`  Album: ${data.album.title}`);
    } else if (data.album) {
      console.log(`  Album: ${data.album}`);
    } else if (data.album_title) {
      console.log(`  Album: ${data.album_title}`);
    }
    if (data.duration) {
      console.log(`  Duration: ${data.duration} seconds`);
    }
    if (data.id) {
      console.log(`  ID: ${data.id}`);
      searchedSongs.push(data.id);
    }
    console.log("---");
  } catch (err: any) {
    console.error("getTrackFromID error:", err?.message || err);
  }
}

export async function getTrackNameFromID(songID: string): Promise<string> {
  const api = new DeezerAPI();
  try {
    const data = await api.lookupTrack(songID);
    if (!data) return "Unknown Title";
    // Deezer track objects usually expose `title` (or `name` / `title_short`)
    const title =
      data.title ||
      data.name ||
      data.title_short ||
      (data.track && (data.track.title || data.track.name));
    return title || "Unknown Title";
  } catch (err: any) {
    console.error("getTrackNameFromID error:", err?.message || err);
    return "Unknown Title";
  }
}

export async function getTrackArtistFromID(songID: string): Promise<string> {
  const api = new DeezerAPI();
  try {
    const data = await api.lookupTrack(songID);
    if (!data) return "Unknown Title";
    // Deezer track objects usually expose `title` (or `name` / `title_short`)
    const artist = data.artist.name || data.artist || data.artist_name;
    return artist || "Unknown Artist";
  } catch (err: any) {
    console.error("getTrackArtistFromID error:", err?.message || err);
    return "Unknown Title";
  }
}

export async function getTrackDurationFromID(songID: string): Promise<string> {
  const api = new DeezerAPI();
  try {
    const data = await api.lookupTrack(songID);
    if (!data) return "Unknown Duration";
    // Deezer track objects usually expose `title` (or `name` / `title_short`)
    const title = data.duration;
    return title || "Unknown Duration";
  } catch (err: any) {
    console.error("getTrackDurationFromID error:", err?.message || err);
    return "Unknown Title";
  }
}

export async function addToPlaylist(
  songID: string,
  playlistName: string,
  userName: string,
): Promise<"added" | "exists" | "error"> {
  //dateipfad wählen
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const filePath = path.resolve(
    currentDir,
    "..",
    "Server",
    "Data",
    "playlist_data.json",
  );
  //Json lesen
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data: any = JSON.parse(raw || "{}");

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      console.error(
        "addToPlaylist error: Invalid playlist_data.json structure.",
      );
      return "error";
    }
    //check ob user existiert
    const userPlaylists = data.playlistsByUser?.[userName];
    if (!Array.isArray(userPlaylists)) {
      return "error";
    }
    //check ob playlist existiert(nicht case sensitive)
    const targetPlaylistName = playlistName.trim().toLowerCase();
    const playlist = userPlaylists.find(
      (p: any) =>
        String(p?.name ?? "")
          .trim()
          .toLowerCase() === targetPlaylistName,
    );
    if (!playlist) {
      return "error";
    }
    //check ob song schon in der Playlist vorhanden ist
    if (!Array.isArray(playlist.songs)) playlist.songs = [];
    const normalizedSongId = String(songID);
    const alreadyExists = playlist.songs.some(
      (existingId: any) => String(existingId) === normalizedSongId,
    );
    if (alreadyExists) {
      return "exists";
    }
    //song hinzufügen
    playlist.songs.push(normalizedSongId);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    return "added";
  } catch (err: any) {
    return "error";
  }
}

// export function newPlaylist(name: string){

// }

export async function createAIPlaylist(
  username: string,
  playlistName: string,
  mood: string,
): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "Fehler: OPENAI_API_KEY ist nicht in der .env Datei gesetzt.",
    );
    return false;
  }

  const client = new OpenAI({ apiKey });

  try {
    // Step 1: AI generiert Songnamen basierend auf mood
    console.log(
      `\n🎵 Generiere Playlist "${playlistName}" mit Stimmung: "${mood}"...`,
    );

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "Du bist ein Musik-Assistant. Gib nur eine nummerierte Songliste zurueck, eine Zeile pro Song, im Format: Songtitel - Kuenstler.",
        },
        {
          role: "user",
          content: `Generiere 10-15 aktuelle und beliebte Lieder fuer folgende Stimmung/Genre: "${mood}". Gib ausschliesslich eine nummerierte Liste aus.`,
        },
      ],
    });

    const responseText = completion.choices?.[0]?.message?.content ?? "";

    // Parse die Songliste
    const songLines = responseText.split("\n").filter((line) => line.trim());
    const songSuggestions: string[] = [];

    songLines.forEach((line) => {
      const cleaned = line.replace(/^\d+\.\s*/, "").trim();
      if (cleaned) songSuggestions.push(cleaned);
    });

    const uniqueSongSuggestions = Array.from(new Set(songSuggestions));

    if (uniqueSongSuggestions.length === 0) {
      console.error("❌ Keine Songs von der KI generiert.");
      return false;
    }

    // Step 2: Suche die Songs in Deezer
    console.log(
      `\n🔍 Suche ${uniqueSongSuggestions.length} Songs in Deezer...`,
    );

    const foundSongs: Array<{
      id: string | number;
      title: string;
      artist: string;
    }> = [];
    const seenSongIds = new Set<string>();

    for (const suggestion of uniqueSongSuggestions) {
      try {
        const tracks = await searchSongInv(suggestion);
        if (tracks.length > 0) {
          const firstTrackId = tracks[0];
          if (firstTrackId == null) {
            continue;
          }
          const normalizedTrackId = String(firstTrackId);
          if (seenSongIds.has(normalizedTrackId)) {
            continue;
          }
          const title = await getTrackNameFromID(String(firstTrackId));
          const api = new DeezerAPI();
          const trackData = await api.lookupTrack(String(firstTrackId));
          const artist = trackData?.artist?.name || "Unknown Artist";
          seenSongIds.add(normalizedTrackId);

          foundSongs.push({
            id: firstTrackId,
            title: title,
            artist: artist,
          });
        }
      } catch (err) {
        console.log(`  ⚠️ Konnte nicht finden: ${suggestion}`);
      }
    }

    if (foundSongs.length === 0) {
      console.error("❌ Keine Songs in Deezer gefunden.");
      return false;
    }

    // Step 3: Zeige die Songs an
    console.log(
      `\n📋 Playlist "${playlistName}" würde folgende ${foundSongs.length} Songs enthalten:\n`,
    );
    foundSongs.forEach((song, idx) => {
      console.log(`${idx + 1}. ${song.title} - ${song.artist}`);
    });

    // Step 4: Frage ob Playlist erstellt werden soll
    console.log(`\n`);
    const confirm = await ask(
      `Soll die Playlist "${playlistName}" zum Account "${username}" hinzugefügt werden? (y/n): `,
    );

    if (confirm.toLowerCase() !== "y") {
      console.log("Playlist wurde nicht erstellt.");
      return false;
    }

    // Step 5: Erstelle Playlist und füge Songs hinzu
    console.log(`\n💾 Erstelle Playlist und füge Songs hinzu...`);

    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const filePath = path.resolve(
      currentDir,
      "..",
      "Server",
      "Data",
      "playlist_data.json",
    );

    // Playlist in die JSON Datei erstellen
    const raw = await fs.readFile(filePath, "utf8");
    const data: any = JSON.parse(raw || "{}");

    if (!data.playlistsByUser) data.playlistsByUser = {};
    if (!data.playlistsByUser[username]) data.playlistsByUser[username] = [];

    // Check ob Playlist bereits existiert
    const playlistExists = data.playlistsByUser[username].some(
      (p: any) =>
        String(p?.name ?? "")
          .trim()
          .toLowerCase() === playlistName.trim().toLowerCase(),
    );

    if (playlistExists) {
      console.error(
        `Playlist "${playlistName}" existiert bereits für User "${username}".`,
      );
      return false;
    }

    // Erstelle neue Playlist
    const newPlaylist = {
      name: playlistName,
      songs: foundSongs.map((s) => String(s.id)),
      public: false,
    };

    data.playlistsByUser[username].push(newPlaylist);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");

    console.log(
      `✅ Playlist "${playlistName}" mit ${foundSongs.length} Songs erstellt und gespeichert!`,
    );
    return true;
  } catch (err: any) {
    console.error("❌ Fehler in createAIPlaylist:", err?.message || err);
    return false;
  }
}

export async function AIPlaylistFromPlaylist(
  username: string,
  newPlaylistName: string,
  basePlaylistName: string,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "Fehler: OPENAI_API_KEY ist nicht in der .env Datei gesetzt.",
    );
    return false;
  }

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const filePath = path.resolve(
      currentDir,
      "..",
      "Server",
      "Data",
      "playlist_data.json",
    );

    const raw = await fs.readFile(filePath, "utf8");
    const data: any = JSON.parse(raw || "{}");
    const userPlaylists = data?.playlistsByUser?.[username];

    if (!Array.isArray(userPlaylists)) {
      console.error(`User "${username}" wurde nicht gefunden.`);
      return false;
    }

    const basePlaylist = userPlaylists.find(
      (p: any) =>
        String(p?.name ?? "")
          .trim()
          .toLowerCase() === basePlaylistName.trim().toLowerCase(),
    );

    if (!basePlaylist) {
      console.error(
        `Basis-Playlist "${basePlaylistName}" wurde nicht gefunden.`,
      );
      return false;
    }

    const songIds: string[] = Array.isArray(basePlaylist.songs)
      ? Array.from(
          new Set(
            basePlaylist.songs
              .map((id: any) => String(id).trim())
              .filter((id: string) => id.length > 0),
          ),
        )
      : [];

    if (songIds.length === 0) {
      console.error(
        `Basis-Playlist "${basePlaylistName}" enthält keine Songs.`,
      );
      return false;
    }

    const deezerApi = new DeezerAPI();
    const sourceSongs: string[] = [];

    for (const songId of songIds.slice(0, 25)) {
      try {
        const track = await deezerApi.lookupTrack(songId);
        const title = track?.title || track?.title_short || track?.name;
        const artist = track?.artist?.name || track?.artist_name;
        if (title && artist) {
          sourceSongs.push(`${title} - ${artist}`);
        }
      } catch {
        // einzelne fehlerhafte IDs überspringen
      }
    }

    if (sourceSongs.length === 0) {
      console.error(
        "Die Songs der Basis-Playlist konnten nicht aufgelöst werden.",
      );
      return false;
    }

    console.log(
      `\n🧠 Analysiere Playlist "${basePlaylistName}" und erstelle einen Musik-Prompt...`,
    );

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "Du analysierst Songlisten und erstellst einen kurzen, praezisen Musik-Prompt fuer die Generierung aehnlicher Songs. Gib nur den finalen Prompt aus, ohne Erklaerung.",
        },
        {
          role: "user",
          content: `Analysiere diese Playlist-Songs und erstelle einen kompakten Simplen Prompt unter 15 Worten fuer aehnliche Song-Empfehlungen (Stimmung, Tempo, Genre, Vibe). Benutze nicht phrasen, wie "Erstelle eine Playlist" sondern beschreibe nur die Songs:\n\n${sourceSongs.join("\n")}`,
        },
      ],
    });

    const generatedPrompt = String(
      completion.choices?.[0]?.message?.content ?? "",
    ).trim();

    if (!generatedPrompt) {
      console.error("KI konnte keinen Prompt aus der Basis-Playlist erzeugen.");
      return false;
    }

    console.log(`\n📝 Generierter Prompt: ${generatedPrompt}`);
    return await createAIPlaylist(username, newPlaylistName, generatedPrompt);
  } catch (err: any) {
    console.error("Fehler in AIPlaylistFromPlaylist:", err?.message || err);
    return false;
  }
}
