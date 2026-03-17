export class DeezerAPI {
  private baseUrl = "https://api.deezer.com";

  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${endpoint}`);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  // Sucht nach Kuenstlern anhand eines Namens.
  searchArtist(name: string) {
    return this.get<{ data: any[] }>(
      `search/artist?q=${encodeURIComponent(name)}`
    );
  }

  getArtistTopTracks(artistId: string, limit = 10) {
    return this.get<{ data: any[] }>(
      `artist/${encodeURIComponent(artistId)}/top?limit=${encodeURIComponent(String(limit))}`
    );
  }

  // Sucht nach Alben anhand eines Namens.
  searchAlbum(name: string) {
    return this.get<{ data: any[] }>(
      `search/album?q=${encodeURIComponent(name)}`
    );
  }

  lookupAlbum(id: string) {
    return this.get<any>(`album/${encodeURIComponent(id)}`);
  }

  // Sucht nach Tracks anhand des Titels.
  searchTrack(title: string) {
    // Nutzt eine track-spezifische Deezer-Suche fuer praezisere Treffer.
    return this.get<{ data: any[] }>(
      `search?q=track:"${encodeURIComponent(title)}"`
    );
  }

  /** Fuehrt eine praezise Suche mit Titel und Interpret fuer stabilere Treffer durch. */
  searchTrackPrecise(title: string, artist: string) {
    const query = `artist:"${artist}" track:"${title}"`;
    return this.get<{ data: any[] }>(
      `search?q=${encodeURIComponent(query)}`
    );
  }

  /** Fuehrt eine allgemeine Freitextsuche ohne Feldqualifikatoren aus. */
  searchPlain(query: string) {
    return this.get<{ data: any[] }>(
      `search?q=${encodeURIComponent(query)}`
    );
  }

  lookupTrack(id: string) {
    return this.get<any>(`track/${encodeURIComponent(id)}`);
  }
}