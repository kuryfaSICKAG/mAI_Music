export interface Song {
    name: String,
    artist: Artist,
    genre: Genre,
    year: number,
    duration: number,
    album: Album,
}

export interface Album {
    name: String,
    artist: Artist,
    genre: Genre,
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
    name: String,
    nationality: String,
    age: number,
    genre: Genre
}

