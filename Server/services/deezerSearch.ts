import { DeezerAPI } from "../../apiServices/deezerAPI/deezer.ts";

export type SearchType = "track" | "artist" | "album" | "all";

export type SearchItem = {
  source: "deezer";
  type: "track" | "artist" | "album";
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
};

const api = new DeezerAPI();

function normalizeTrack(item: any): SearchItem {
  return {
    source: "deezer",
    type: "track",
    id: String(item?.id ?? ""),
    title: item?.title ?? item?.title_short ?? item?.name ?? "",
    artist: item?.artist?.name ?? item?.artist_name ?? "",
    album: item?.album?.title ?? item?.album_title ?? "",
    duration: Number(item?.duration ?? 0),
  };
}

function normalizeArtist(item: any): SearchItem {
  return {
    source: "deezer",
    type: "artist",
    id: String(item?.id ?? ""),
    title: item?.name ?? "",
    artist: item?.name ?? "",
    album: "",
    duration: 0,
  };
}

function normalizeAlbum(item: any): SearchItem {
  return {
    source: "deezer",
    type: "album",
    id: String(item?.id ?? ""),
    title: item?.title ?? item?.name ?? "",
    artist: item?.artist?.name ?? item?.artist_name ?? "",
    album: item?.title ?? item?.name ?? "",
    duration: 0,
  };
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 10;
  return Math.max(1, Math.min(50, Number(limit)));
}

export async function searchDeezer(
  query: string,
  type: SearchType = "all",
  limit?: number
): Promise<SearchItem[]> {
  const q = query.trim();
  const maxItems = clampLimit(limit);

  if (!q) return [];

  if (type === "track") {
    const tracks = await api.searchTrack(q);
    return (tracks.data ?? []).slice(0, maxItems).map(normalizeTrack);
  }

  if (type === "artist") {
    const artists = await api.searchArtist(q);
    return (artists.data ?? []).slice(0, maxItems).map(normalizeArtist);
  }

  if (type === "album") {
    const albums = await api.searchAlbum(q);
    return (albums.data ?? []).slice(0, maxItems).map(normalizeAlbum);
  }

  const [tracks, artists, albums] = await Promise.all([
    api.searchTrack(q),
    api.searchArtist(q),
    api.searchAlbum(q),
  ]);

  const merged = [
    ...(tracks.data ?? []).slice(0, maxItems).map(normalizeTrack),
    ...(artists.data ?? []).slice(0, maxItems).map(normalizeArtist),
    ...(albums.data ?? []).slice(0, maxItems).map(normalizeAlbum),
  ];

  return merged;
}
