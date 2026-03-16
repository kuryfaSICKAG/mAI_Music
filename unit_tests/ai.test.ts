import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { OpenAI } from "openai";
import * as deezerModule from "../apiServices/deezerAPI/deezer.ts";
import * as promptModule from "../services/prompt.ts";
import {
  clearSearchedSongs,
  createAIPlaylist,
  addAISongsToPlaylist,
  addAIToSamePlaylistFromPlaylistAnalysis,
} from "../services/service.ts";

vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("openai", () => ({
  OpenAI: vi.fn(),
}));

vi.mock("../services/prompt.ts", () => ({
  ask: vi.fn(),
  askInt: vi.fn(),
}));

vi.mock("../apiServices/deezerAPI/deezer.ts", () => {
  const searchTrack = vi.fn();
  const lookupTrack = vi.fn();

  return {
    DeezerAPI: vi.fn().mockImplementation(() => ({
      searchTrack,
      lookupTrack,
    })),
    __mocks: {
      searchTrack,
      lookupTrack,
    },
  };
});

describe("AI Playlist Component", () => {
  const readFileMock = vi.mocked(fs.readFile);
  const writeFileMock = vi.mocked(fs.writeFile);
  const askMock = vi.mocked(promptModule.ask);
  const OpenAIMock = OpenAI as unknown as ReturnType<typeof vi.fn>;

  const deezerMocks = (deezerModule as any).__mocks as {
    searchTrack: ReturnType<typeof vi.fn>;
    lookupTrack: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearSearchedSongs();
    process.env.OPENAI_API_KEY = "test-key";

    readFileMock.mockResolvedValue(
      JSON.stringify({ playlistsByUser: { testuser: [] } }),
    );
    writeFileMock.mockResolvedValue(undefined as unknown as void);

    askMock.mockResolvedValue("y");

    deezerMocks.searchTrack.mockImplementation(async (query: string) => {
      if (query.includes("Song A")) {
        return { data: [{ id: "111" }] };
      }
      return { data: [{ id: "222" }] };
    });

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
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("creates playlist and writes JSON on successful flow", async () => {
    const result = await createAIPlaylist("testuser", "AI Mix", "focus");

    expect(result).toBe(true);
    expect(writeFileMock).toHaveBeenCalledTimes(1);

    const writePayload = writeFileMock.mock.calls[0]?.[1] as string;
    const parsed = JSON.parse(writePayload);

    expect(parsed.playlistsByUser.testuser).toHaveLength(1);
    expect(parsed.playlistsByUser.testuser[0].name).toBe("AI Mix");
    expect(parsed.playlistsByUser.testuser[0].songs).toEqual(["111", "222"]);
  });

  it("adds only new AI songs to an existing playlist", async () => {
    readFileMock.mockResolvedValueOnce(
      JSON.stringify({
        playlistsByUser: {
          testuser: [{ name: "Existing", songs: ["111"], status: "private" }],
        },
      }),
    );

    const result = await addAISongsToPlaylist("testuser", "Existing", "focus");

    expect(result).toBe(true);
    expect(writeFileMock).toHaveBeenCalledTimes(1);

    const writePayload = writeFileMock.mock.calls[0]?.[1] as string;
    const parsed = JSON.parse(writePayload);

    expect(parsed.playlistsByUser.testuser[0].songs).toEqual(["111", "222"]);
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

    readFileMock.mockResolvedValueOnce(
      JSON.stringify({
        playlistsByUser: {
          testuser: [{ name: "Existing", songs: ["111"], status: "private" }],
        },
      }),
    );

    const result = await addAISongsToPlaylist("testuser", "Existing", "focus");

    expect(result).toBe(false);
    expect(writeFileMock).not.toHaveBeenCalled();
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

    readFileMock.mockResolvedValueOnce(
      JSON.stringify({
        playlistsByUser: {
          testuser: [{ name: "Existing", songs: ["111"], status: "private" }],
        },
      }),
    );

    readFileMock.mockResolvedValueOnce(
      JSON.stringify({
        playlistsByUser: {
          testuser: [{ name: "Existing", songs: ["111"], status: "private" }],
        },
      }),
    );

    const result = await addAIToSamePlaylistFromPlaylistAnalysis(
      "testuser",
      "Existing",
    );

    expect(result).toBe(true);
    expect(writeFileMock).toHaveBeenCalledTimes(1);

    const writePayload = writeFileMock.mock.calls[0]?.[1] as string;
    const parsed = JSON.parse(writePayload);

    expect(parsed.playlistsByUser.testuser[0].songs).toEqual(["111", "222"]);
  });
});
