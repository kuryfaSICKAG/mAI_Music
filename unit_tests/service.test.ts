import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchedSongs,
  getSearchedSongs,
  clearSearchedSongs,
  searchSong,
  getTrackNameFromID,
} from '../services/service.ts';
import { DeezerAPI } from '../apiServices/deezerAPI/deezer.ts';

// Mock DeezerAPI
vi.mock('../apiServices/deezerAPI/deezer');

// Mock readline-sync (if needed)
vi.mock('readline-sync', () => ({
  question: vi.fn(),
  questionInt: vi.fn(),
}));

describe('Service Module', () => {
  let deezerMock: any;

  beforeEach(() => {
    deezerMock = DeezerAPI as any;
    deezerMock.mockClear();
    clearSearchedSongs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearSearchedSongs();
  });

  describe('Song Search State Management', () => {
    it('getSearchedSongs should return empty array initially', () => {
      clearSearchedSongs();
      const songs = getSearchedSongs();

      expect(Array.isArray(songs)).toBe(true);
      expect(songs.length).toBe(0);
    });

    it('clearSearchedSongs should empty the searched songs array', () => {
      // Manually add some songs to the array
      (searchedSongs as any).push('song1', 'song2');
      expect(getSearchedSongs().length).toBe(2);

      clearSearchedSongs();
      expect(getSearchedSongs().length).toBe(0);
    });

    it('should store song IDs as strings or numbers', () => {
      const ids: (string | number)[] = ['123', 456, '789'];

      ids.forEach((id) => {
        (searchedSongs as any).push(id);
      });

      const retrieved = getSearchedSongs();
      expect(retrieved).toContain('123');
      expect(retrieved).toContain(456);
      expect(retrieved).toContain('789');
    });
  });

  describe('searchSong', () => {
    it('should search for tracks and populate searchedSongs', async () => {
      const mockTracks = {
        data: [
          {
            id: '123',
            title: 'Test Song',
            artist: { name: 'Test Artist' },
            duration: 200,
          },
          {
            id: '124',
            title: 'Another Song',
            artist: { name: 'Another Artist' },
            duration: 180,
          },
        ],
      };

      const mockInstance = {
        searchTrack: vi.fn().mockResolvedValue(mockTracks),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const result = await searchSong('test');

      expect(result).toContain('123');
      expect(result).toContain('124');
      expect(result.length).toBe(2);
    });

    it('should clear previous searches before new search', async () => {
      const mockTracks = {
        data: [
          { id: '999', title: 'Song', artist: { name: 'Artist' }, duration: 200 },
        ],
      };

      const mockInstance = {
        searchTrack: vi.fn().mockResolvedValue(mockTracks),
      };

      deezerMock.mockImplementation(() => mockInstance);

      // Simulate previous search
      (searchedSongs as any).push('old-id-1', 'old-id-2');
      expect(getSearchedSongs().length).toBe(2);

      await searchSong('new');

      // After new search, old IDs should be cleared
      const result = getSearchedSongs();
      expect(result).not.toContain('old-id-1');
      expect(result).toContain('999');
    });

    it('should handle empty search results', async () => {
      const mockTracks = { data: [] };

      const mockInstance = {
        searchTrack: vi.fn().mockResolvedValue(mockTracks),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const result = await searchSong('nonexistent');

      expect(result).toEqual([]);
    });

    it('should limit results to 25 tracks', async () => {
      const tracks = Array.from({ length: 50 }, (_, i) => ({
        id: `track-${i}`,
        title: `Track ${i}`,
        artist: { name: 'Artist' },
        duration: 200,
      }));

      const mockTracks = { data: tracks };

      const mockInstance = {
        searchTrack: vi.fn().mockResolvedValue(mockTracks),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const result = await searchSong('test');

      expect(result.length).toBeLessThanOrEqual(25);
    });

    it('should handle missing track properties', async () => {
      const mockTracks = {
        data: [
          {
            id: '123',
            title_short: 'Short Title',
            // Missing other properties
          },
          {
            id: '124',
            name: 'Alternative Title Field',
            artist_name: 'Artist Name String',
          },
        ],
      };

      const mockInstance = {
        searchTrack: vi.fn().mockResolvedValue(mockTracks),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const result = await searchSong('test');

      expect(result).toContain('123');
      expect(result).toContain('124');
    });

    it('should handle API errors gracefully', async () => {
      const mockInstance = {
        searchTrack: vi.fn().mockRejectedValue(new Error('API Error')),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const result = await searchSong('test');

      expect(result).toEqual([]);
    });
  });

  describe('getTrackNameFromID', () => {
    it('should fetch track title by ID', async () => {
      const mockTrack = {
        id: '123',
        title: 'Test Track',
        artist: { name: 'Test Artist' },
      };

      const mockInstance = {
        lookupTrack: vi.fn().mockResolvedValue(mockTrack),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const title = await getTrackNameFromID('123');

      expect(title).toBe('Test Track');
    });

    it('should use title_short as fallback', async () => {
      const mockTrack = {
        id: '123',
        title_short: 'Short Title',
      };

      const mockInstance = {
        lookupTrack: vi.fn().mockResolvedValue(mockTrack),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const title = await getTrackNameFromID('123');

      expect(title).toBe('Short Title');
    });

    it('should use name field as second fallback', async () => {
      const mockTrack = {
        id: '123',
        name: 'Name Field',
      };

      const mockInstance = {
        lookupTrack: vi.fn().mockResolvedValue(mockTrack),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const title = await getTrackNameFromID('123');

      expect(title).toBe('Name Field');
    });

    it('should check nested track object', async () => {
      const mockTrack = {
        id: '123',
        track: {
          title: 'Nested Title',
        },
      };

      const mockInstance = {
        lookupTrack: vi.fn().mockResolvedValue(mockTrack),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const title = await getTrackNameFromID('123');

      expect(title).toBe('Nested Title');
    });

    it('should return "Unknown Title" if track not found', async () => {
      const mockInstance = {
        lookupTrack: vi.fn().mockResolvedValue(null),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const title = await getTrackNameFromID('999');

      expect(title).toBe('Unknown Title');
    });

    it('should return "Unknown Title" on API error', async () => {
      const mockInstance = {
        lookupTrack: vi.fn().mockRejectedValue(new Error('API Error')),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const title = await getTrackNameFromID('123');

      expect(title).toBe('Unknown Title');
    });

    it('should handle empty track response', async () => {
      const mockInstance = {
        lookupTrack: vi.fn().mockResolvedValue({}),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const title = await getTrackNameFromID('123');

      expect(title).toBe('Unknown Title');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in search query', async () => {
      const mockTracks = {
        data: [
          { id: '123', title: 'Test & Song', artist: { name: 'Artist' }, duration: 200 },
        ],
      };

      const mockInstance = {
        searchTrack: vi.fn().mockResolvedValue(mockTracks),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const result = await searchSong('Rock & Roll @ 2024');

      expect(result).toContain('123');
    });

    it('should handle very long search results', async () => {
      const longTrackList = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        title: `Song ${i}`,
        artist: { name: 'Artist' },
        duration: 200,
      }));

      const mockTracks = { data: longTrackList };

      const mockInstance = {
        searchTrack: vi.fn().mockResolvedValue(mockTracks),
      };

      deezerMock.mockImplementation(() => mockInstance);

      const result = await searchSong('test');

      expect(result.length).toBe(25); // Limited to 25
    });
  });
});
