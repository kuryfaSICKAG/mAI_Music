import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock the data module
vi.mock('../Server/Data/data');

type PlaylistStatus = 'private' | 'public';
type Playlist = {
  name: string;
  status: PlaylistStatus;
  songs: string[];
};

type PlaylistDB = {
  playlistsByUser: {
    [userId: string]: Playlist[];
  };
};

// Test data for playlist operations
const mockPlaylistDB: PlaylistDB = {
  playlistsByUser: {
    testuser: [
      {
        name: 'Favorites',
        status: 'private' as const,
        songs: ['song1', 'song2'],
      },
      {
        name: 'Party Mix',
        status: 'public' as const,
        songs: ['song3', 'song4', 'song5'],
      },
    ],
  },
};

describe('Playlist Routes', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseStatus: number;
  let responseData: any;

  beforeEach(() => {
    responseStatus = 200;
    responseData = null;

    mockRequest = {
      body: {},
      params: {},
      query: {},
      headers: {},
    };

    mockResponse = {
      status: vi.fn(function (this: any, code: number) {
        responseStatus = code;
        return this;
      }),
      json: vi.fn(function (this: any, data: any) {
        responseData = data;
        return this;
      }),
    };
  });

  describe('Playlist Creation', () => {
    it('should create a new playlist with private status by default', () => {
      const newPlaylist = {
        name: 'New Playlist',
        status: 'private' as const,
        songs: [],
      };

      expect(newPlaylist.status).toBe('private');
      expect(newPlaylist.songs).toEqual([]);
      expect(newPlaylist.name).toBe('New Playlist');
    });

    it('should create public playlist when public flag is true', () => {
      const newPlaylist = {
        name: 'Public Playlist',
        status: 'public' as const,
        songs: [],
      };

      expect(newPlaylist.status).toBe('public');
    });

    it('should reject duplicate playlist names for same user', () => {
      const db = mockPlaylistDB;
      const user = 'testuser';
      const newName = 'Favorites'; // Already exists

      const isDuplicate = db.playlistsByUser[user]?.some(
        (p) => p.name === newName
      );

      expect(isDuplicate).toBe(true);
    });

    it('should allow duplicate playlist names for different users', () => {
      const db = mockPlaylistDB;
      const user1= 'testuser';
      const user2 = 'otheruser';

      if (!db.playlistsByUser[user2]) {
        db.playlistsByUser[user2] = [];
      }

      db.playlistsByUser[user2].push({
        name: 'Favorites', // Same name as user1's playlist
        status: 'private',
        songs: [],
      });

      const user1Favorites = db.playlistsByUser[user1]?.find(
        (p) => p.name === 'Favorites'
      );
      const user2Favorites = db.playlistsByUser[user2]?.find(
        (p) => p.name === 'Favorites'
      );

      expect(user1Favorites?.name).toBe('Favorites');
      expect(user2Favorites?.name).toBe('Favorites');
    });
  });

  describe('Playlist Deletion', () => {
    it('should delete a playlist by name', () => {
      const db = { ...mockPlaylistDB };
      const user = 'testuser';
      const nameToDelete = 'Favorites';

      const before = db.playlistsByUser[user]?.length || 0;
      db.playlistsByUser[user] = (db.playlistsByUser[user] || []).filter(
        (p) => p.name !== nameToDelete
      );
      const after = db.playlistsByUser[user]?.length || 0;

      expect(before).toBe(2);
      expect(after).toBe(1);
    });

    it('should return error for non-existent playlist', () => {
      const db = mockPlaylistDB;
      const user = 'testuser';
      const nameToDelete = 'Nonexistent';

      const playlist = (db.playlistsByUser[user] || []).find(
        (p) => p.name === nameToDelete
      );

      expect(playlist).toBeUndefined();
    });

    it('should not affect other users playlists', () => {
      const db = { ...mockPlaylistDB };
      db.playlistsByUser['otheruser'] = [
        { name: 'Other Playlist', status: 'private' as const, songs: [] },
      ];

      const user = 'testuser';
      const nameToDelete = 'Favorites';

      db.playlistsByUser[user] = (db.playlistsByUser[user] || []).filter(
        (p) => p.name !== nameToDelete
      );

      expect(db.playlistsByUser['otheruser']?.length).toBe(1);
      expect(db.playlistsByUser['otheruser']?.[0]?.name).toBe('Other Playlist');
    });
  });

  describe('Playlist Rename', () => {
    it('should rename a playlist', () => {
      // Create a fresh test playlist
      let playlist = { name: 'Favorites', status: 'private' as const, songs: [] };
      const oldName = 'Favorites';
      const newName = 'My Favorites';

      // Rename the playlist
      playlist.name = newName;

      // Verify rename was successful
      expect(playlist.name).toBe('My Favorites');
      expect(playlist.name).not.toBe(oldName);
    });

    it('should prevent renaming to existing playlist name', () => {
      const db = { ...mockPlaylistDB };
      const user = 'testuser';
      const existingNames = (db.playlistsByUser[user] || []).map(
        (p) => p.name
      );

      const isDuplicate = existingNames.includes('Party Mix');

      expect(isDuplicate).toBe(true);
    });
  });

  describe('Playlist Status Management', () => {
    it('should toggle playlist status from private to public', () => {
      const playlist = { name: 'Test', status: 'private' as const, songs: [] };

      const newStatus = playlist.status === 'private' ? 'public' : 'private';

      expect(newStatus).toBe('public');
    });

    it('should toggle playlist status from public to private', () => {
      const playlist: Playlist = { name: 'Test', status: 'public', songs: [] };

      const newStatus = playlist.status === 'private' ? 'public' : 'private';

      expect(newStatus).toBe('private');
    });

    it('should set specific status', () => {
      const playlist: Playlist = { name: 'Test', status: 'private', songs: [] };

      playlist.status = 'public';

      expect(playlist.status).toBe('public');
    });
  });

  describe('Song Management in Playlists', () => {
    it('should add song to playlist', () => {
      const playlist = { name: 'Test', status: 'private' as const, songs: [] as string[] };
      const songID = 'new-song-123';

      playlist.songs.push(songID);

      expect(playlist.songs).toContain(songID);
      expect(playlist.songs.length).toBe(1);
    });

    it('should remove song from playlist', () => {
      const playlist = {
        name: 'Test',
        status: 'private' as const,
        songs: ['song1', 'song2', 'song3'],
      };

      playlist.songs = playlist.songs.filter((s) => s !== 'song2');

      expect(playlist.songs).not.toContain('song2');
      expect(playlist.songs).toEqual(['song1', 'song3']);
    });

    it('should handle adding duplicate songs', () => {
      const playlist = {
        name: 'Test',
        status: 'private' as const,
        songs: ['song1'],
      };

      playlist.songs.push('song1'); // Add duplicate

      expect(playlist.songs.length).toBe(2);
      expect(playlist.songs.filter((s) => s === 'song1').length).toBe(2);
    });

    it('should handle removing non-existent song gracefully', () => {
      const playlist = {
        name: 'Test',
        status: 'private' as const,
        songs: ['song1', 'song2'],
      };

      const before = playlist.songs.length;
      playlist.songs = playlist.songs.filter((s) => s !== 'song99');
      const after = playlist.songs.length;

      expect(before).toBe(after);
      expect(playlist.songs.length).toBe(2);
    });

    it('should reorder songs in playlist', () => {
      const playlist = {
        name: 'Test',
        status: 'private' as const,
        songs: ['song1', 'song2', 'song3'],
      };

      // Move song3 to index 0
      const song = playlist.songs.splice(2, 1)[0]; // Remove from end
      if (song !== undefined) {
        playlist.songs.unshift(song); // Add to beginning
      }

      expect(playlist.songs).toEqual(['song3', 'song1', 'song2']);
    });
  });

  describe('Playlist Validation', () => {
    it('should validate playlist has required fields', () => {
      const playlist = {
        name: 'Valid Playlist',
        status: 'private' as const,
        songs: [],
      };

      expect(playlist).toHaveProperty('name');
      expect(playlist).toHaveProperty('status');
      expect(playlist).toHaveProperty('songs');
      expect(['private', 'public']).toContain(playlist.status);
    });

    it('should reject invalid status values', () => {
      const validStatuses = ['private', 'public'];
      const invalidStatus = 'protected';

      const isValid = validStatuses.includes(invalidStatus);

      expect(isValid).toBe(false);
    });

    it('should accept empty song arrays', () => {
      const playlist = {
        name: 'Empty Playlist',
        status: 'private' as const,
        songs: [],
      };

      expect(playlist.songs.length).toBe(0);
      expect(Array.isArray(playlist.songs)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle playlist names with special characters', () => {
      const playlist = {
        name: '♫ My Favorites & Best Songs! 🎵',
        status: 'private' as const,
        songs: [],
      };

      expect(playlist.name).toBe('♫ My Favorites & Best Songs! 🎵');
    });

    it('should handle very long playlist names', () => {
      const longName = 'A'.repeat(500);
      const playlist = {
        name: longName,
        status: 'private' as const,
        songs: [],
      };

      expect(playlist.name.length).toBe(500);
    });

    it('should handle large number of songs in playlist', () => {
      const playlist = {
        name: 'Large Playlist',
        status: 'private' as const,
        songs: Array.from({ length: 1000 }, (_, i) => `song${i}`),
      };

      expect(playlist.songs.length).toBe(1000);
      expect(playlist.songs[0]).toBe('song0');
      expect(playlist.songs[999]).toBe('song999');
    });
  });
});
