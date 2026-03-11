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

  // --- Artist search ---
  searchArtist(name: string) {
    return this.get<{ data: any[] }>(
      `search/artist?q=${encodeURIComponent(name)}`
    );
  }

  // --- Album search ---
  searchAlbum(name: string) {
    return this.get<{ data: any[] }>(
      `search/album?q=${encodeURIComponent(name)}`
    );
  }

  lookupAlbum(id: string) {
    return this.get<any>(`album/${encodeURIComponent(id)}`);
  }

  // --- Track search ---
  searchTrack(title: string) {
    // Deezer supports track-only search!
    return this.get<{ data: any[] }>(
      `search?q=track:"${encodeURIComponent(title)}"`
    );
  }

  lookupTrack(id: string) {
    return this.get<any>(`track/${encodeURIComponent(id)}`);
  }
}