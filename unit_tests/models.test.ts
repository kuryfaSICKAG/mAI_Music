import { describe, it, expect } from 'vitest';
import type {
  DB,
  Playlist,
  Song,
  Album,
  Artist,
  Genre,
  Status,
  SongID,
} from '../models/personalModels.ts';

describe('Personal Models', () => {
  describe('Playlist Model', () => {
    it('should create valid playlist with required fields', () => {
      const playlist: Playlist = {
        name: 'My Favorites',
        status: 'private',
        songs: ['song1', 'song2'],
      };

      expect(playlist.name).toBe('My Favorites');
      expect(playlist.status).toBe('private');
      expect(playlist.songs).toEqual(['song1', 'song2']);
    });

    it('should accept both private and public status', () => {
      const privatePlaylist: Playlist = {
        name: 'Private',
        status: 'private',
        songs: [],
      };

      const publicPlaylist: Playlist = {
        name: 'Public',
        status: 'public',
        songs: [],
      };

      expect(privatePlaylist.status).toBe('private');
      expect(publicPlaylist.status).toBe('public');
    });

    it('should allow empty song arrays', () => {
      const emptyPlaylist: Playlist = {
        name: 'Empty',
        status: 'private',
        songs: [],
      };

      expect(emptyPlaylist.songs.length).toBe(0);
    });
  });

  describe('Song Model', () => {
    it('should create valid song with required fields', () => {
      const song: Song = {
        id: 'song-123',
        name: 'Test Track',
        artist: [{ name: 'Artist', nationality: 'USA', age: 30, genre: ['rock'] }],
        genre: ['rock'],
        year: 2023,
        duration: 180,
      };

      expect(song.id).toBe('song-123');
      expect(song.name).toBe('Test Track');
      expect(song.year).toBe(2023);
      expect(song.duration).toBe(180);
    });

    it('should accept duration as string or number', () => {
      const songWithNumber: Song = {
        id: 'song-1',
        name: 'Track 1',
        artist: [],
        genre: ['pop'],
        year: 2023,
        duration: 200,
      };

      const songWithString: Song = {
        id: 'song-2',
        name: 'Track 2',
        artist: [],
        genre: ['pop'],
        year: 2023,
        duration: '200',
      };

      expect(typeof songWithNumber.duration).toBe('number');
      expect(typeof songWithString.duration).toBe('string');
    });

    it('should have optional album field', () => {
      const songWithAlbum: Song = {
        id: 'song-123',
        name: 'Track',
        artist: [],
        genre: ['rock'],
        year: 2023,
        duration: 200,
        album: {
          name: 'Test Album',
          artist: [],
          genre: ['rock'],
          year: 2023,
          songs: ['song-123', 'song-124'],
        },
      };

      expect(songWithAlbum.album?.name).toBe('Test Album');
    });

    it('should handle multiple genres per song', () => {
      const song: Song = {
        id: 'song-123',
        name: 'Genre Mix',
        artist: [],
        genre: ['rock', 'pop', 'jazz'],
        year: 2023,
        duration: 200,
      };

      expect(song.genre.length).toBe(3);
      expect(song.genre).toContain('rock');
      expect(song.genre).toContain('pop');
      expect(song.genre).toContain('jazz');
    });
  });

  describe('Album Model', () => {
    it('should create valid album', () => {
      const album: Album = {
        name: 'Test Album',
        artist: [{ name: 'Artist', nationality: 'Germany', age: 35, genre: ['rock'] }],
        genre: ['rock'],
        year: 2023,
        songs: ['song-1', 'song-2', 'song-3'],
      };

      expect(album.name).toBe('Test Album');
      expect(album.year).toBe(2023);
      expect(album.songs.length).toBe(3);
    });

    it('should have references to songs', () => {
      const album: Album = {
        name: 'Album',
        artist: [],
        genre: ['pop'],
        year: 2023,
        songs: ['song-101', 'song-102'],
      };

      expect(album.songs).toContain('song-101');
      expect(album.songs).toContain('song-102');
    });
  });

  describe('Artist Model', () => {
    it('should create valid artist', () => {
      const artist: Artist = {
        name: 'John Doe',
        nationality: 'USA',
        age: 28,
        genre: ['rock', 'indie'],
      };

      expect(artist.name).toBe('John Doe');
      expect(artist.nationality).toBe('USA');
      expect(artist.age).toBe(28);
      expect(artist.genre.length).toBe(2);
    });

    it('should allow multiple genres for artist', () => {
      const artist: Artist = {
        name: 'Multi-Genre Artist',
        nationality: 'UK',
        age: 45,
        genre: ['rock', 'pop', 'jazz', 'classical'],
      };

      expect(artist.genre.length).toBe(4);
    });
  });

  describe('Genre Type', () => {
    it('should accept valid genre values', () => {
      const validGenres: Genre[] = [
        'pop',
        'rock',
        'metal',
        'rap',
        'techno',
        'classical',
        'jazz',
        'hiphop',
        'country',
        'reggae',
        'disco',
        'funk',
        'rnb',
        'soul',
        'indie',
      ];

      validGenres.forEach((genre) => {
        expect(['pop', 'rock', 'metal', 'rap', 'techno', 'classical', 'jazz', 'hiphop', 'country', 'reggae', 'disco', 'funk', 'rnb', 'soul', 'indie']).toContain(genre);
      });
    });
  });

  describe('Status Type', () => {
    it('should accept private and public status', () => {
      const statuses: Status[] = ['private', 'public'];

      expect(statuses).toContain('private');
      expect(statuses).toContain('public');
    });

    it('should have exactly two valid status values', () => {
      const validStatuses = ['private', 'public'];
      expect(validStatuses.length).toBe(2);
    });
  });

  describe('SongID Type', () => {
    it('should accept string song IDs', () => {
      const songId: SongID = 'song-123-abc';
      expect(typeof songId).toBe('string');
    });

    it('should use song IDs in arrays', () => {
      const songIds: SongID[] = ['song-1', 'song-2', 'song-3'];
      expect(songIds.length).toBe(3);
      expect(songIds[0]).toBe('song-1');
    });
  });

  describe('DB Model', () => {
    it('should create valid DB structure', () => {
      const db: DB = {
        playlistsByUser: {
          user1: [
            {
              name: 'Playlist 1',
              status: 'private',
              songs: ['song-1'],
            },
          ],
          user2: [
            {
              name: 'Playlist 2',
              status: 'public',
              songs: ['song-2', 'song-3'],
            },
          ],
        },
      };

      expect(db.playlistsByUser['user1']).toBeDefined();
      expect(db.playlistsByUser['user2']).toBeDefined();
      expect(db.playlistsByUser['user1']?.[0]?.name).toBe('Playlist 1');
    });

    it('should handle empty database', () => {
      const emptyDB: DB = {
        playlistsByUser: {},
      };

      expect(Object.keys(emptyDB.playlistsByUser).length).toBe(0);
    });

    it('should allow multiple playlists per user', () => {
      const db: DB = {
        playlistsByUser: {
          user1: [
            { name: 'Playlist 1', status: 'private', songs: [] },
            { name: 'Playlist 2', status: 'public', songs: [] },
            { name: 'Playlist 3', status: 'private', songs: [] },
          ],
        },
      };

      expect(db.playlistsByUser['user1']?.length).toBe(3);
    });
  });

  describe('Model Relationships', () => {
    it('should link songs to playlists', () => {
      const playlist: Playlist = {
        name: 'My Mix',
        status: 'public',
        songs: ['song-001', 'song-002', 'song-003'],
      };

      const song: Song = {
        id: 'song-001',
        name: 'Track A',
        artist: [],
        genre: ['pop'],
        year: 2023,
        duration: 180,
      };

      expect(playlist.songs).toContain(song.id);
    });

    it('should link artists to songs', () => {
      const artist: Artist = {
        name: 'Famous Artist',
        nationality: 'France',
        age: 40,
        genre: ['jazz'],
      };

      const song: Song = {
        id: 'song-123',
        name: 'Jazz Track',
        artist: [artist],
        genre: ['jazz'],
        year: 2023,
        duration: 240,
      };

      expect(song.artist[0]?.name).toBe('Famous Artist');
    });

    it('should link songs to albums', () => {
      const album: Album = {
        name: 'Greatest Hits',
        artist: [],
        genre: ['rock'],
        year: 2023,
        songs: ['song-100', 'song-101', 'song-102'],
      };

      const song: Song = {
        id: 'song-100',
        name: 'Hit Song',
        artist: [],
        genre: ['rock'],
        year: 2023,
        duration: 200,
        album,
      };

      expect(song.album?.songs).toContain(song.id);
    });
  });

  describe('Model Validation', () => {
    it('should require song name', () => {
      const songData = {
        id: 'song-1',
        // name is missing
        artist: [],
        genre: ['pop'],
        year: 2023,
        duration: 180,
      };

      expect(songData).not.toHaveProperty('name');
    });

    it('should allow undefined album on song', () => {
      const song: Omit<Song, 'album'> & { album?: Album } = {
        id: 'song-123',
        name: 'Track',
        artist: [],
        genre: ['pop'],
        year: 2023,
        duration: 180,
        // album is optional
      };

      expect(song.album).toBeUndefined();
    });
  });
});
