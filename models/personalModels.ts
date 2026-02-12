export interface DB {
  playlistsByUser: Record<string, Playlist[]>;
}

export interface Playlist {
  name: string;
  songs: Song[];
}

export interface Song {
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
    songs: Song[],
}

export enum Genre {
    pop,
    rock,
    metal,
    rap,
    techno,
    classical,
    jazz,
    hiphop,
    country,
    reggae,
    disco,
    funk,
    rnb,
    soul,
    indie,
}

export interface Artist {
    name: string,
    nationality: string,
    age: number,
    genre: Genre[]
}

