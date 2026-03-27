import { DeezerAPI } from "../apiServices/deezerAPI/deezer.ts";

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
    return title || "Unknown Title";
  } catch (err: any) {
    console.error("getTrackFromID error:", err?.message || err);
  }
}

export async function getTrackNameFromID(songID: string): Promise<string> {
  const api = new DeezerAPI();
  try {
    const data = await api.lookupTrack(songID);
    if (!data) return "Unknown Title";
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
    if (!data) return "Unknown Artist";
    const artist =
      data.artist?.name ||
      (typeof data.artist === "string" ? data.artist : undefined) ||
      data.artist_name ||
      data.contributors?.[0]?.name ||
      data.track?.artist?.name ||
      data.track?.artist_name;
    return artist || "Unknown Artist";
  } catch (err: any) {
    console.error("getTrackArtistFromID error:", err?.message || err);
    return "Unknown Artist";
  }
}

export async function getTrackDurationFromID(songID: string): Promise<string> {
  const api = new DeezerAPI();
  try {
    const data = await api.lookupTrack(songID);
    if (!data) return "Unknown Duration";
    const duration = data.duration ?? data.track?.duration;
    return duration != null ? String(duration) : "Unknown Duration";
  } catch (err: any) {
    console.error("getTrackDurationFromID error:", err?.message || err);
    return "Unknown Duration";
  }
}

export {
  createAIPlaylist,
  AIPlaylistFromPlaylist,
  addAISongsToPlaylist,
  addAIToSamePlaylistFromPlaylistAnalysis,
} from "./aiService.ts";
