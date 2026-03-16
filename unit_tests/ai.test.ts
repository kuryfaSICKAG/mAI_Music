import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAI } from "openai";
import * as deezerModule from "../apiServices/deezerAPI/deezer.ts";
import * as playlistModule from "../Client/Backend/playlist.ts";
import * as promptModule from "../services/prompt.ts";
import {
  clearSearchedSongs,
  createAIPlaylist,
  addAISongsToPlaylist,
  addAIToSamePlaylistFromPlaylistAnalysis,
} from "../services/service.ts";

vi.mock("openai", () => ({
  OpenAI: vi.fn(),
}));

vi.mock("../services/prompt.ts", () => ({
  ask: vi.fn(),
  askInt: vi.fn(),
}));

vi.mock("../Client/Backend/playlist.ts", () => ({
  getPlaylists: vi.fn(),
  createPlaylist: vi.fn(),
  addSong: vi.fn(),
}));

vi.mock("../apiServices/deezerAPI/deezer.ts", () => {
  const searchTrack = vi.fn();
  const searchTrackPrecise = vi.fn();
  const searchPlain = vi.fn();
  const lookupTrack = vi.fn();

  return {
    DeezerAPI: vi.fn().mockImplementation(() => ({
      searchTrack,
      searchTrackPrecise,
      searchPlain,
      lookupTrack,
    })),
    __mocks: {
      searchTrack,
      searchTrackPrecise,
      searchPlain,
      lookupTrack,
    },
  };
});

describe("AI Playlist Component", () => {
  const getPlaylistsMock = vi.mocked(playlistModule.getPlaylists);
  const createPlaylistMock = vi.mocked(playlistModule.createPlaylist);
  const addSongMock = vi.mocked(playlistModule.addSong);
  const askMock = vi.mocked(promptModule.ask);
  const OpenAIMock = OpenAI as unknown as ReturnType<typeof vi.fn>;

  const deezerMocks = (deezerModule as any).__mocks as {
    searchTrack: ReturnType<typeof vi.fn>;
    searchTrackPrecise: ReturnType<typeof vi.fn>;
    searchPlain: ReturnType<typeof vi.fn>;
    lookupTrack: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearSearchedSongs();
    process.env.OPENAI_API_KEY = "test-key";

    getPlaylistsMock.mockResolvedValue([] as any);
    createPlaylistMock.mockResolvedValue("created");
    addSongMock.mockResolvedValue("added");

    askMock.mockResolvedValue("y");

    const searchBySuggestion = async (query: string) => {
      if (query.includes("Song A")) {
        return { data: [{ id: "111" }] };
      }
      return { data: [{ id: "222" }] };
    };

    deezerMocks.searchTrack.mockImplementation(searchBySuggestion);
    deezerMocks.searchTrackPrecise.mockImplementation(searchBySuggestion);
    deezerMocks.searchPlain.mockImplementation(searchBySuggestion);

    deezerMocks.lookupTrack.mockImplementation(async (songId: string) => {
      if (songId === "111") {
        return { id: "111", title: "Song A", artist: { name: "Artist A" } };
      }
      return { id: "222", title: "Song B", artist: { name: "Artist B" } };
    });

    OpenAIMock.mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: "1. Song A - Artist A\n2. Song B - Artist B",
                },
              },
            ],
          }),
        },
      },
    }));
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    clearSearchedSongs();
  });

  it("returns false when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await createAIPlaylist("testuser", "AI Mix", "happy");

    expect(result).toBe(false);
    expect(OpenAIMock).not.toHaveBeenCalled();
  });

  it("returns false when user declines confirmation", async () => {
    askMock.mockResolvedValue("n");

    const result = await createAIPlaylist("testuser", "AI Mix", "chill");

    expect(result).toBe(false);
    expect(createPlaylistMock).not.toHaveBeenCalled();
    expect(addSongMock).not.toHaveBeenCalled();
  });

  it("creates playlist and adds songs on successful flow", async () => {
    const result = await createAIPlaylist("testuser", "AI Mix", "focus");

    expect(result).toBe(true);
    expect(createPlaylistMock).toHaveBeenCalledTimes(1);
    expect(createPlaylistMock).toHaveBeenCalledWith("testuser", "AI Mix");
    expect(addSongMock).toHaveBeenCalledTimes(2);
    expect(addSongMock).toHaveBeenNthCalledWith(1, "testuser", "AI Mix", "111");
    expect(addSongMock).toHaveBeenNthCalledWith(2, "testuser", "AI Mix", "222");
  });

  it("adds only new AI songs to an existing playlist", async () => {
    getPlaylistsMock.mockResolvedValueOnce([
      { name: "Existing", songs: ["111"], status: "private" },
    ] as any);

    const result = await addAISongsToPlaylist("testuser", "Existing", "focus");

    expect(result).toBe(true);
    expect(addSongMock).toHaveBeenCalledTimes(1);
    expect(addSongMock).toHaveBeenCalledWith("testuser", "Existing", "222");
  });

  it("returns false when no distinct songs can be added", async () => {
    OpenAIMock.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "1. Song A - Artist A" } }],
          }),
        },
      },
    }));

    getPlaylistsMock.mockResolvedValueOnce([
      { name: "Existing", songs: ["111"], status: "private" },
    ] as any);

    const result = await addAISongsToPlaylist("testuser", "Existing", "focus");

    expect(result).toBe(false);
    expect(addSongMock).not.toHaveBeenCalled();
  });

  it("analyzes playlist and appends AI songs to the same playlist", async () => {
    OpenAIMock.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content:
                    '{"prompt":"mehr songs wie diese","languageHint":"englisch","referenceArtists":["Artist A"]}',
                },
              },
            ],
          }),
        },
      },
    }));

    OpenAIMock.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: "1. Song B - Artist B",
                },
              },
            ],
          }),
        },
      },
    }));

    getPlaylistsMock.mockResolvedValue([
      { name: "Existing", songs: ["111"], status: "private" },
    ] as any);

    const result = await addAIToSamePlaylistFromPlaylistAnalysis(
      "testuser",
      "Existing",
    );

    expect(result).toBe(true);
    expect(addSongMock).toHaveBeenCalledTimes(1);
    expect(addSongMock).toHaveBeenCalledWith("testuser", "Existing", "222");
  });
});
