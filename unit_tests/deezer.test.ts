import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeezerAPI } from "../apiServices/deezerAPI/deezer.ts";

// Mockt `fetch`, damit keine echten HTTP-Anfragen ausgefuehrt werden.
global.fetch = vi.fn();

describe("Deezer API", () => {
  let api: DeezerAPI;
  let fetchMock: any;

  beforeEach(() => {
    api = new DeezerAPI();
    fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();
  });

  describe("searchTrack", () => {
    it("should search for tracks and return data", async () => {
      const mockResponse = {
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [
              {
                id: "123",
                title: "Test Song",
                artist: { name: "Test Artist" },
                duration: 200,
              },
            ],
          }),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = await api.searchTrack("test song");

      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0].title).toBe("Test Song");
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle empty search results", async () => {
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify({ data: [] }),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = await api.searchTrack("nonexistent song");

      expect(result.data).toEqual([]);
    });

    it("should encode special characters in search query", async () => {
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify({ data: [] }),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      await api.searchTrack("Song & Artist @ 2024");

      const callUrl = fetchMock.mock.calls[0][0];
      // Prueft, dass Sonderzeichen in der URL korrekt kodiert werden.
      expect(callUrl).toContain("search");
      expect(callUrl).toContain("%");
      expect(callUrl).toContain("api.deezer.com");
    });

    it("should throw error on API failure", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      await expect(api.searchTrack("test")).rejects.toThrow();
    });
  });

  describe("lookupTrack", () => {
    it("should fetch track details by ID", async () => {
      const mockResponse = {
        ok: true,
        text: async () =>
          JSON.stringify({
            id: "123",
            title: "Test Song",
            artist: { name: "Test Artist" },
            duration: 200,
            album: { title: "Test Album" },
          }),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = await api.lookupTrack("123");

      expect(result.id).toBe("123");
      expect(result.title).toBe("Test Song");
      expect(result.duration).toBe(200);
    });

    it("should return empty object for empty response", async () => {
      const mockResponse = {
        ok: true,
        text: async () => "",
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = await api.lookupTrack("999");

      expect(result).toEqual({});
    });

    it("should handle missing track properties gracefully", async () => {
      const mockResponse = {
        ok: true,
        text: async () =>
          JSON.stringify({
            id: "456",
            // Simuliert eine unvollstaendige API-Antwort ohne optionale Felder.
          }),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = await api.lookupTrack("456");

      expect(result.id).toBe("456");
      expect(result.title).toBeUndefined();
    });
  });

  describe("searchArtist", () => {
    it("should search for artists", async () => {
      const mockResponse = {
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [
              {
                id: "artist1",
                name: "Test Artist",
              },
            ],
          }),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = await api.searchArtist("test artist");

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe("searchAlbum", () => {
    it("should search for albums", async () => {
      const mockResponse = {
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [
              {
                id: "album1",
                title: "Test Album",
              },
            ],
          }),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = await api.searchAlbum("test album");

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe("lookupAlbum", () => {
    it("should fetch album details by ID", async () => {
      const mockResponse = {
        ok: true,
        text: async () =>
          JSON.stringify({
            id: "album1",
            title: "Test Album",
            artist: { name: "Test Artist" },
          }),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = await api.lookupAlbum("album1");

      expect(result.id).toBe("album1");
      expect(result.title).toBe("Test Album");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(api.searchTrack("test")).rejects.toThrow();
    });

    it("should handle malformed JSON response", async () => {
      const mockResponse = {
        ok: true,
        text: async () => "invalid json {",
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      await expect(api.searchTrack("test")).rejects.toThrow();
    });

    it("should handle HTTP 404 errors", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      await expect(api.lookupTrack("nonexistent")).rejects.toThrow(
        "API request failed with status 404",
      );
    });

    it("should handle HTTP 429 rate limit errors", async () => {
      const mockResponse = {
        ok: false,
        status: 429,
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      await expect(api.searchTrack("test")).rejects.toThrow(
        "API request failed with status 429",
      );
    });
  });

  describe("URL Encoding", () => {
    it("should properly encode track IDs with special characters", async () => {
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify({}),
      };

      fetchMock.mockResolvedValueOnce(mockResponse);

      await api.lookupTrack("track/123");

      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain("track%2F123");
    });
  });
});
