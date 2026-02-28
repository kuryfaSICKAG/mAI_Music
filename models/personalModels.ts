export interface DB {
  playlistsByUser: Record<string, Playlist[]>;
}

export type Status = "private" | "public";

export interface Playlist {
  status: Status;
  name: string;
  songs: SongID[];
}

export type SongID = string;

export interface Song {
  id: SongID,
  name: string,
  artist: Artist[],
  genre: Genre[],
  year: number,
  duration: number | string,
  album?: Album | undefined,
}

export interface Album {
    name: string,
    artist: Artist[],
    genre: Genre[],
    year: number,
  songs: SongID[],
} 

export type Genre =
  | "pop"
  | "rock"
  | "metal"
  | "rap"
  | "techno"
  | "classical"
  | "jazz"
  | "hiphop"
  | "country"
  | "reggae"
  | "disco"
  | "funk"
  | "rnb"
  | "soul"
  | "indie";

export interface Artist {
    name: string,
    nationality: string,
    age: number,
    genre: Genre[]
}

