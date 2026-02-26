import { DeezerAPI } from "../apiServices/deezerAPI/deezer.ts";
import { questionInt, question } from "readline-sync";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// store ids (string or number) to avoid type mismatches
export const searchedSongs: Array<string | number> = [];

export function getSearchedSongs(): Array<string | number> {
    return searchedSongs;
}

export function clearSearchedSongs(): void {
    searchedSongs.length = 0;
}

// gibt Array mit allen songg ids zurück
export async function searchSong(track: string): Promise<Array<string | number>> {
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
                console.log('---');
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

export async function getTrackFromID(songID:string) : Promise<string>{
    const api = new DeezerAPI();
    try{
        const data = await api.lookupTrack(songID);
        if(!data) return "Unknown Title";
        // Deezer track objects usually expose `title` (or `name` / `title_short`)
        const title = data.title || data.name || data.title_short || (data.track && (data.track.title || data.track.name));
        return title || "Unknown Title";
    } catch (err: any) {
        console.error("getTrackFromID error:", err?.message || err);
        return "Unknown Title";
    }
}

export async function addToPlaylist(songID: string, playlistName: string, userName: string): Promise<"added" | "exists" | "error"> {
    //dateipfad wählen
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const filePath = path.resolve(currentDir, "..", "Server", "Data", "playlist_data.json");
    //Json lesen
    try {
        const raw = await fs.readFile(filePath, "utf8");
        const data: any = JSON.parse(raw || "{}");

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("addToPlaylist error: Invalid playlist_data.json structure.");
            return "error";
        }
        //check ob user existiert
        const userPlaylists = data.playlistsByUser?.[userName];
        if (!Array.isArray(userPlaylists)) {
            console.error(`addToPlaylist error: User \"${userName}\" not found.`);
            return "error";
        }
        //check ob playlist existiert(nicht case sensitive)
        const targetPlaylistName = playlistName.trim().toLowerCase();
        const playlist = userPlaylists.find((p: any) => String(p?.name ?? "").trim().toLowerCase() === targetPlaylistName);
        if (!playlist) {
            console.error(`addToPlaylist error: Playlist \"${playlistName}\" for user \"${userName}\" not found.`);
            return "error";
        }
        //check ob song schon in der Playlist vorhanden ist
        if (!Array.isArray(playlist.songs)) playlist.songs = [];
        const normalizedSongId = String(songID);
        const alreadyExists = playlist.songs.some((existingId: any) => String(existingId) === normalizedSongId);
        if (alreadyExists) {
            console.log(`addToPlaylist: Song ${normalizedSongId} ist bereits in \"${playlist.name}\" für User \"${userName}\".`);
            return "exists";
        }
        //song hinzufügen
        playlist.songs.push(normalizedSongId);

        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
        console.log(`addToPlaylist: Song ${normalizedSongId} in \"${playlist.name}\" für User \"${userName}\" gespeichert (${filePath}).`);
        return "added";
    } catch (err: any) {
        console.error("addToPlaylist error:", err?.message || err);
        return "error";
    }
}


await searchSong("I could be yoshi");
const j = question("\n>>> Möchtest du einen Song Hinzufügen? (y/n)");
switch(j){
    case "y": {
        const k = questionInt("\n>>> Bitte gib die Nummer des Songs ein, den du hinzufügen möchtest: ");
        if(k<=0) break;
        const song = searchedSongs[k-1];
        if (song == null) {
            console.log("Ungültige Song-Nummer.");
            break;
        }
        const songId = String(song);
        const title = await getTrackFromID(songId);
        const result = await addToPlaylist(songId, "kekw", "test");
        if (result === "added") {
            console.log(`Du hast den Song "${title}" mit der ID ${songId} hinzugefügt!`);
        } else if (result === "exists") {
            console.log(`Der Song "${title}" mit der ID ${songId} ist bereits in der Playlist.`);
        } else {
            console.log("Song konnte nicht gespeichert werden (User/Playlist prüfen).");
        }
        break;
    }
    case "n":
        console.log("Okay, kein Problem!");
        break;
    default:
        console.log("Ungültige Eingabe. Bitte versuche es erneut.");
}


// export function newPlaylist(name: string){

// }

// export function createAIPlaylist(name: string, mood: string){



// }