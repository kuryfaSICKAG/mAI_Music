import { DeezerAPI } from "../apiServices/deezerAPI/deezer.ts";
import { ask } from "./prompt.ts";
import {
  getPlaylists,
  createPlaylist,
  addSong,
} from "../Client/Backend/playlist.ts";
import dotenv from "dotenv";
import {
  type MatchedSong,
  type PlaylistGenerationConstraints,
  buildArtistDrivenPlaylist,
  extractArtistNamesFromRequest,
  generatePlaylistProfileFromSongs,
  generateSongsFromPrompt,
} from "./aiPlaylistGeneration.ts";

dotenv.config();

type AIExecutionOptions = {
  skipConfirmation?: boolean;
};

export async function createAIPlaylist(
  username: string,
  playlistName: string,
  mood: string,
  constraints?: PlaylistGenerationConstraints,
  options?: AIExecutionOptions,
): Promise<boolean> {
  try {
    const requestedArtists = extractArtistNamesFromRequest(mood);
    let foundSongs: MatchedSong[] = [];

    if (requestedArtists.length > 0) {
      console.log(
        `\n🎵 Generiere Playlist "${playlistName}" direkt aus Deezer-Top-Tracks fuer: ${requestedArtists.join(", ")}...`,
      );
      foundSongs = await buildArtistDrivenPlaylist(mood);
    } else {
      console.log(
        `\n🎵 Generiere Playlist "${playlistName}" aus Anfrage: "${mood}"...`,
      );
      foundSongs = await generateSongsFromPrompt(mood, constraints);
    }

    if (foundSongs.length === 0) {
      console.error("❌ Keine Songs in Deezer gefunden.");
      return false;
    }

    console.log(
      `\n📋 Playlist "${playlistName}" würde folgende ${foundSongs.length} Songs enthalten:\n`,
    );
    foundSongs.forEach((song, idx) => {
      console.log(`${idx + 1}. ${song.title} - ${song.artist}`);
    });

    if (options?.skipConfirmation !== true) {
      console.log("\n");
      const confirm = await ask(
        `Soll die Playlist "${playlistName}" zum Account "${username}" hinzugefügt werden? (y/n): `,
      );

      if (confirm.toLowerCase() !== "y") {
        console.log("Playlist wurde nicht erstellt.");
        return false;
      }
    }

    console.log("\n💾 Erstelle Playlist und füge Songs hinzu...");

    const createResult = await createPlaylist(username, playlistName);
    if (createResult === "exists") {
      console.error(
        `Playlist "${playlistName}" existiert bereits für User "${username}".`,
      );
      return false;
    }
    if (createResult === "error") {
      console.error(`Playlist "${playlistName}" konnte nicht erstellt werden.`);
      return false;
    }

    for (const song of foundSongs) {
      await addSong(username, playlistName, String(song.id));
    }

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
  options?: AIExecutionOptions,
): Promise<boolean> {
  try {
    const userPlaylists = await getPlaylists(username);

    const basePlaylist = userPlaylists.find(
      (pl) =>
        pl.name.trim().toLowerCase() === basePlaylistName.trim().toLowerCase(),
    );

    if (!basePlaylist) {
      console.error(
        `Basis-Playlist "${basePlaylistName}" wurde nicht gefunden.`,
      );
      return false;
    }

    const songIds: string[] = Array.from(
      new Set(
        basePlaylist.songs
          .map((id: any) => String(id).trim())
          .filter((id: string) => id.length > 0),
      ),
    );

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

    const profile = await generatePlaylistProfileFromSongs(sourceSongs);
    if (!profile?.prompt) {
      console.error("KI konnte keinen Prompt aus der Basis-Playlist erzeugen.");
      return false;
    }

    console.log(`\n📝 Generierter Prompt: ${profile.prompt}`);
    return createAIPlaylist(
      username,
      newPlaylistName,
      profile.prompt,
      {
        languageHint: profile.languageHint,
        referenceArtists: profile.referenceArtists,
        referenceSongs: sourceSongs,
      },
      options,
    );
  } catch (err: any) {
    console.error("Fehler in AIPlaylistFromPlaylist:", err?.message || err);
    return false;
  }
}

export async function addAIToSamePlaylistFromPlaylistAnalysis(
  username: string,
  playlistName: string,
  options?: AIExecutionOptions,
): Promise<boolean> {
  try {
    const userPlaylists = await getPlaylists(username);

    const basePlaylist = userPlaylists.find(
      (pl) =>
        pl.name.trim().toLowerCase() === playlistName.trim().toLowerCase(),
    );

    if (!basePlaylist) {
      console.error(`Playlist "${playlistName}" wurde nicht gefunden.`);
      return false;
    }

    const songIds: string[] = Array.from(
      new Set(
        basePlaylist.songs
          .map((id: any) => String(id).trim())
          .filter((id: string) => id.length > 0),
      ),
    );

    if (songIds.length === 0) {
      console.error(`Playlist "${playlistName}" enthaelt keine Songs.`);
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
        // einzelne fehlerhafte IDs ueberspringen
      }
    }

    if (sourceSongs.length === 0) {
      console.error("Die Songs der Playlist konnten nicht aufgeloest werden.");
      return false;
    }

    console.log(
      `\n🧠 Analysiere Playlist "${playlistName}" und erweitere sie mit passenden Songs...`,
    );

    const profile = await generatePlaylistProfileFromSongs(sourceSongs);
    if (!profile?.prompt) {
      console.error("KI konnte keinen Prompt aus der Playlist erzeugen.");
      return false;
    }

    console.log(`\n📝 Generierter Prompt: ${profile.prompt}`);
    return addAISongsToPlaylist(
      username,
      playlistName,
      profile.prompt,
      {
        languageHint: profile.languageHint,
        referenceArtists: profile.referenceArtists,
        referenceSongs: sourceSongs,
      },
      options,
    );
  } catch (err: any) {
    console.error(
      "Fehler in addAIToSamePlaylistFromPlaylistAnalysis:",
      err?.message || err,
    );
    return false;
  }
}

export async function addAISongsToPlaylist(
  username: string,
  targetPlaylistName: string,
  mood: string,
  constraints?: PlaylistGenerationConstraints,
  options?: AIExecutionOptions,
): Promise<boolean> {
  try {
    const requestedArtists = extractArtistNamesFromRequest(mood);
    let foundSongs: MatchedSong[] = [];

    if (requestedArtists.length > 0) {
      console.log(
        `\n🎵 Generiere Songs zum Hinzufuegen aus Deezer-Top-Tracks fuer: ${requestedArtists.join(", ")}...`,
      );
      foundSongs = await buildArtistDrivenPlaylist(mood);
    } else {
      console.log(
        `\n🎵 Generiere Songs zum Hinzufuegen aus Anfrage: "${mood}"...`,
      );
      foundSongs = await generateSongsFromPrompt(mood, constraints);
    }

    if (foundSongs.length === 0) {
      console.error("❌ Keine Songs in Deezer gefunden.");
      return false;
    }

    const userPlaylists = await getPlaylists(username);

    const targetPlaylist = userPlaylists.find(
      (pl) =>
        pl.name.trim().toLowerCase() ===
        targetPlaylistName.trim().toLowerCase(),
    );

    if (!targetPlaylist) {
      console.error(`Playlist "${targetPlaylistName}" wurde nicht gefunden.`);
      return false;
    }

    const existingSongIds = new Set(
      targetPlaylist.songs.map((songId: any) => String(songId).trim()),
    );
    const songsToAdd = foundSongs.filter(
      (song) => !existingSongIds.has(String(song.id)),
    );

    if (songsToAdd.length === 0) {
      console.log(
        `\nℹ️ Alle gefundenen Songs sind bereits in der Playlist "${targetPlaylistName}" enthalten.`,
      );
      return false;
    }

    console.log(
      `\n📋 Folgende ${songsToAdd.length} neuen Songs werden zu "${targetPlaylistName}" hinzugefuegt:\n`,
    );
    songsToAdd.forEach((song, idx) => {
      console.log(`${idx + 1}. ${song.title} - ${song.artist}`);
    });

    const skippedCount = foundSongs.length - songsToAdd.length;
    if (skippedCount > 0) {
      console.log(
        `\nℹ️ ${skippedCount} Song(s) wurden uebersprungen, weil sie bereits vorhanden sind.`,
      );
    }

    if (options?.skipConfirmation !== true) {
      console.log("\n");
      const confirm = await ask(
        `Soll(en) ${songsToAdd.length} Song(s) zur Playlist "${targetPlaylistName}" hinzugefuegt werden? (y/n): `,
      );

      if (confirm.toLowerCase() !== "y") {
        console.log("Songs wurden nicht hinzugefuegt.");
        return false;
      }
    }

    for (const song of songsToAdd) {
      await addSong(username, targetPlaylistName, String(song.id));
    }

    console.log(
      `✅ ${songsToAdd.length} Song(s) wurden zu "${targetPlaylistName}" hinzugefuegt!`,
    );
    return true;
  } catch (err: any) {
    console.error("❌ Fehler in addAISongsToPlaylist:", err?.message || err);
    return false;
  }
}
