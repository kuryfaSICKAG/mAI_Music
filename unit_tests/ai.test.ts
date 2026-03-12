import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { OpenAI } from "openai";
import * as deezerModule from "../apiServices/deezerAPI/deezer.ts";
import * as promptModule from "../services/prompt.ts";
import {
  AIPlaylistFromPlaylist,
  clearSearchedSongs,
  createAIPlaylist,
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
  let createCompletionMock: ReturnType<typeof vi.fn>;

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

    createCompletionMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: "1. Song A - Artist A\n2. Song B - Artist B",
          },
        },
      ],
    });

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
          create: createCompletionMock,
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

  it("returns false when base playlist does not exist", async () => {
    readFileMock.mockResolvedValueOnce(
      JSON.stringify({ playlistsByUser: { testuser: [] } }),
    );

    const result = await AIPlaylistFromPlaylist(
      "testuser",
      "Derived Mix",
      "Unknown Base",
    );

    expect(result).toBe(false);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("creates a derived AI playlist from an existing playlist", async () => {
    readFileMock.mockResolvedValue(
      JSON.stringify({
        playlistsByUser: {
          testuser: [
            {
              name: "Base Mix",
              songs: ["base-1", "base-2"],
              public: false,
            },
          ],
        },
      }),
    );

    deezerMocks.lookupTrack.mockImplementation(async (songId: string) => {
      if (songId === "base-1") {
        return { title: "Base Song 1", artist: { name: "Base Artist 1" } };
      }
      if (songId === "base-2") {
        return { title: "Base Song 2", artist: { name: "Base Artist 2" } };
      }
      if (songId === "111") {
        return { id: "111", title: "Song A", artist: { name: "Artist A" } };
      }
      return { id: "222", title: "Song B", artist: { name: "Artist B" } };
    });

    createCompletionMock
      .mockResolvedValueOnce({
        choices: [{ message: { content: "energetic pop with catchy hooks" } }],
      })
      .mockResolvedValueOnce({
        choices: [
          { message: { content: "1. Song A - Artist A\n2. Song B - Artist B" } },
        ],
      });

    const result = await AIPlaylistFromPlaylist(
      "testuser",
      "Derived Mix",
      "Base Mix",
    );

    expect(result).toBe(true);
    expect(createCompletionMock).toHaveBeenCalledTimes(2);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });
});
