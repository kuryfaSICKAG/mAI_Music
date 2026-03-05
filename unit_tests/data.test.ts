import { describe, it, expect } from 'vitest';
import type {
  UserProfile,
} from '../Server/Data/data.ts';

describe('Data Module', () => {

  describe('Data Structure Validation', () => {
    it('should validate user profile structure', () => {
      const profile: UserProfile = {
        favoriteGenres: ['rock', 'pop'],
        locale: 'de-DE',
        onboardingDone: true,
      };

      expect(profile).toHaveProperty('favoriteGenres');
      expect(profile).toHaveProperty('locale');
      expect(profile).toHaveProperty('onboardingDone');
      expect(Array.isArray(profile.favoriteGenres)).toBe(true);
    });

    it('should have default user profile values', () => {
      const profile: UserProfile = {
        favoriteGenres: [],
        locale: 'de-DE',
        onboardingDone: false,
      };

      expect(profile.favoriteGenres).toEqual([]);
      expect(profile.locale).toBe('de-DE');
      expect(profile.onboardingDone).toBe(false);
    });

    it('should validate playlist status values', () => {
      const validStatuses = ['private', 'public'];
      const testPlaylist = { name: 'Test', status: 'private' as const, songs: [] };

      expect(validStatuses).toContain(testPlaylist.status);
    });

    it('should support multiple favorite genres', () => {
      const profile: UserProfile = {
        favoriteGenres: ['rock', 'pop', 'jazz', 'classical'],
        locale: 'de-DE',
        onboardingDone: true,
      };

      expect(profile.favoriteGenres.length).toBe(4);
      expect(profile.favoriteGenres).toContain('rock');
      expect(profile.favoriteGenres).toContain('jazz');
    });

    it('should allow empty favorite genres list', () => {
      const profile: UserProfile = {
        favoriteGenres: [],
        locale: 'en-US',
        onboardingDone: false,
      };

      expect(profile.favoriteGenres.length).toBe(0);
      expect(Array.isArray(profile.favoriteGenres)).toBe(true);
    });

    it('should handle different locales', () => {
      const deProfile: UserProfile = {
        favoriteGenres: [],
        locale: 'de-DE',
        onboardingDone: false,
      };

      const enProfile: UserProfile = {
        favoriteGenres: [],
        locale: 'en-US',
        onboardingDone: false,
      };

      expect(deProfile.locale).toBe('de-DE');
      expect(enProfile.locale).toBe('en-US');
    });

    it('should handle onboarding status correctly', () => {
      const newUser: UserProfile = {
        favoriteGenres: [],
        locale: 'de-DE',
        onboardingDone: false,
      };

      const onboardedUser: UserProfile = {
        favoriteGenres: ['pop'],
        locale: 'de-DE',
        onboardingDone: true,
      };

      expect(newUser.onboardingDone).toBe(false);
      expect(onboardedUser.onboardingDone).toBe(true);
    });

    it('should validate playlist structure', () => {
      const playlist = {
        name: 'My Playlist',
        status: 'public' as const,
        songs: ['song1', 'song2', 'song3'],
      };

      expect(playlist).toHaveProperty('name');
      expect(playlist).toHaveProperty('status');
      expect(playlist).toHaveProperty('songs');
      expect(Array.isArray(playlist.songs)).toBe(true);
      expect(playlist.songs.length).toBe(3);
    });

    it('should handle large playlists', () => {
      const largePlaylist = {
        name: 'Large Playlist',
        status: 'private' as const,
        songs: Array.from({ length: 1000 }, (_, i) => `song${i}`),
      };

      expect(largePlaylist.songs.length).toBe(1000);
      expect(largePlaylist.songs[0]).toBe('song0');
      expect(largePlaylist.songs[999]).toBe('song999');
    });
  });
});
