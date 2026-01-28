import { Song, Album, Artist, Genre } from '../models/personalModels';

export interface SpotifyConfig {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
}

export interface SpotifySearchResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    duration_ms: number;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
    explicit: boolean;
    popularity: number;
    preview_url: string | null;
    external_urls: {
        spotify: string;
    };
}

export interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followers: {
        total: number;
    };
    external_urls: {
        spotify: string;
    };
    images: Array<{
        url: string;
        height: number;
        width: number;
    }>;
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    release_date: string;
    total_tracks: number;
    artists: SpotifyArtist[];
    album_type: string;
    external_urls: {
        spotify: string;
    };
    images: Array<{
        url: string;
        height: number;
        width: number;
    }>;
}
