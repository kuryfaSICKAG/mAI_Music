import { DeezerAPI } from "./deezer.ts";
import type { Album, Artist, Genre, Song } from "../../models/personalModels.ts";

function buildArtistFromTrack(track: any): Artist[] {
  if (track?.artist?.name) {
    return [{ name: track.artist.name, nationality: "", age: 0, genre: [] }];
  }
  if (track?.artist_name) {
    return [{ name: track.artist_name, nationality: "", age: 0, genre: [] }];
  }
  return [];
}

function buildAlbumFromAlbum(album: any): Album | undefined {
  if (!album) {
    return undefined;
  }

  const albumArtistName = album?.artist?.name || album?.artist_name || "";
  const albumArtist: Artist[] = albumArtistName
    ? [{ name: albumArtistName, nationality: "", age: 0, genre: [] }]
    : [];

  return {
    name: album?.title || album?.name || "",
    artist: albumArtist,
    genre: [],
    year: album?.release_date
      ? Number(String(album.release_date).slice(0, 4))
      : 0,
    songs: [],
  };
}

async function buildSongFromTitle(
  api: DeezerAPI,
  title: string
): Promise<Song | null> {
  const tracks = await api.searchTrack(title);
  if (!tracks.data || tracks.data.length === 0) {
    return null;
  }

  const track = await api.lookupTrack(String(tracks.data[0].id));
  const album = track?.album?.id
    ? await api.lookupAlbum(String(track.album.id))
    : undefined;

  const builtAlbum = buildAlbumFromAlbum(album);
  return {
    name: track?.title || track?.title_short || track?.name || title,
    artist: buildArtistFromTrack(track),
    genre: [] as Genre[],
    year: track?.release_date
      ? Number(String(track.release_date).slice(0, 4))
      : album?.release_date
      ? Number(String(album.release_date).slice(0, 4))
      : 0,
    duration: track?.duration ?? 0,
    album: builtAlbum,
  } as const;
}

export async function buildPersonalModel(trackTitle: string) {
  const api = new DeezerAPI();

  // Search track by title only
  const tracks = await api.searchTrack(trackTitle);
  if (tracks.data && tracks.data.length > 0) {
    console.log("Tracks found:");
    tracks.data.forEach((track: any, idx: number) => {
      console.log(`Track #${idx + 1}:`);
      console.log(`  Title: ${track.title || track.name || track.title_short}`);
      if (track.artist && track.artist.name) {
        console.log(`  Artist: ${track.artist.name}`);
      } else if (track.artist) {
        console.log(`  Artist: ${track.artist}`);
      } else if (track.artist_name) {
        console.log(`  Artist: ${track.artist_name}`);
      }
      if (track.album && track.album.title) {
        console.log(`  Album: ${track.album.title}`);
      } else if (track.album) {
        console.log(`  Album: ${track.album}`);
      } else if (track.album_title) {
        console.log(`  Album: ${track.album_title}`);
      }
      if (track.duration) {
        console.log(`  Duration: ${track.duration} seconds`);
      }
      if (track.id) {
        console.log(`  ID: ${track.id}`);
      }
      console.log('---');
    });
  } else {
    console.log("No tracks found.");
  }
  //console.log(tracks.data);
  /*
  // Search artist
  const artists = await api.searchArtist("Coldplay");
  console.log("Artists:", artists.data);

  // Search album
  const albums = await api.searchAlbum("Parachutes");
  console.log("Albums:", albums.data);

  // Lookup a track by ID
  if (tracks.data.length > 0) {
    const track = await api.lookupTrack(tracks.data[0].id);
    console.log("Track details:", track);
  }
    */
}       // to try out: npx ts-node apiServices\deezerAPI\buildPersonalModel.ts

//buildPersonalModel("Yellow");