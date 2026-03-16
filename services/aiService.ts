import { DeezerAPI } from "../apiServices/deezerAPI/deezer.ts";
import { ask } from "./prompt.ts";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

type MatchedSong = {
	id: string;
	title: string;
	artist: string;
};

type PlaylistGenerationConstraints = {
	languageHint?: string;
	referenceArtists?: string[];
	referenceSongs?: string[];
};

type PlaylistProfile = {
	prompt: string;
	languageHint: string;
	referenceArtists: string[];
};

function normalizeForMatch(s: string): string {
	return s
		.toLowerCase()
		.replace(/\(.*?\)/g, "")
		.replace(/[''`]/g, "'")
		.replace(/[^a-z0-9\s']/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function jaccardSimilarity(a: string, b: string): number {
	const na = normalizeForMatch(a);
	const nb = normalizeForMatch(b);
	if (na === nb) return 1.0;
	const setA = new Set(na.split(" ").filter(Boolean));
	const setB = new Set(nb.split(" ").filter(Boolean));
	const intersection = [...setA].filter((word) => setB.has(word)).length;
	const union = new Set([...setA, ...setB]).size;
	return union === 0 ? 0 : intersection / union;
}

function normalizeAISongLine(line: string): string | null {
	const cleaned = line
		.replace(/^\d+[.)-]?\s*/, "")
		.replace(/^[-*]\s*/, "")
		.trim();

	if (!cleaned || !cleaned.includes(" - ")) {
		return null;
	}

	const parts = cleaned.split(" - ").map((part) => part.trim());
	if (parts.length < 2) {
		return null;
	}

	const rawFirstPart = parts[0] ?? "";
	const rawSecondPart = parts[1] ?? "";
	const firstPart = rawFirstPart.replace(/^"|"$/g, "").trim();
	const secondPart = parts.slice(1).join(" - ").replace(/^"|"$/g, "").trim();

	const looksLikeQuotedTitle = /^".*"$/.test(rawSecondPart.trim());
	const looksLikeArtistFirst =
		looksLikeQuotedTitle ||
		/,|\s(ft\.|feat\.|featuring|x|&|and)\s/i.test(firstPart);

	if (looksLikeArtistFirst) {
		return `${secondPart} - ${firstPart}`;
	}

	return `${firstPart} - ${secondPart}`;
}

function extractArtistNamesFromRequest(request: string): string[] {
	const artistIntent = /(?:top\s+songs?|songs?|tracks?|hits?)\s+von\s+(.+)$/i;
	const match = request.match(artistIntent);
	if (!match?.[1]) {
		return [];
	}

	const artistSection = match[1]
		.replace(/[.!?].*$/, "")
		.replace(/\b(fuer|für|mit|ohne|im stil von|based on|like)\b.*$/i, "")
		.trim();

	return Array.from(
		new Set(
			artistSection
				.split(/\s*(?:,| und | & )\s*/i)
				.map((artist) => artist.replace(/^['"]|['"]$/g, "").trim())
				.filter((artist) => artist.length > 1),
		),
	);
}

async function findBestArtistMatch(name: string): Promise<any | null> {
	const api = new DeezerAPI();
	const normalizedName = normalizeForMatch(name);

	try {
		const res = await api.searchArtist(name);
		const candidates = res.data?.slice(0, 10) ?? [];
		if (candidates.length === 0) {
			return null;
		}

		let bestArtist: any = null;
		let bestScore = -1;

		for (const artist of candidates) {
			const candidateName = String(artist?.name ?? "");
			const normalizedCandidate = normalizeForMatch(candidateName);
			const exactMatch = normalizedCandidate === normalizedName ? 0.6 : 0;
			const containsMatch =
				normalizedCandidate.includes(normalizedName) ||
				normalizedName.includes(normalizedCandidate)
					? 0.25
					: 0;
			const score =
				exactMatch + containsMatch + jaccardSimilarity(candidateName, name);

			if (score > bestScore) {
				bestScore = score;
				bestArtist = artist;
			}
		}

		return bestScore >= 0.55 ? bestArtist : null;
	} catch {
		return null;
	}
}

async function buildArtistDrivenPlaylist(request: string): Promise<MatchedSong[]> {
	const artistNames = extractArtistNamesFromRequest(request);
	if (artistNames.length === 0) {
		return [];
	}

	const api = new DeezerAPI();
	const perArtistLimit = Math.max(4, Math.ceil(12 / artistNames.length));
	const artistTrackBuckets: MatchedSong[][] = [];

	for (const artistName of artistNames) {
		const artist = await findBestArtistMatch(artistName);
		if (!artist?.id) {
			console.log(`  ⚠️ Artist nicht gefunden: ${artistName}`);
			continue;
		}

		try {
			const topTracks = await api.getArtistTopTracks(
				String(artist.id),
				perArtistLimit * 2,
			);
			const normalizedArtistName = normalizeForMatch(
				String(artist.name ?? artistName),
			);

			const bucket = (topTracks.data ?? [])
				.filter((track: any) => {
					const trackArtist = normalizeForMatch(
						String(track?.artist?.name ?? ""),
					);
					return (
						trackArtist === normalizedArtistName ||
						trackArtist.includes(normalizedArtistName) ||
						normalizedArtistName.includes(trackArtist)
					);
				})
				.slice(0, perArtistLimit)
				.map((track: any) => ({
					id: String(track.id),
					title: String(track.title || track.title_short || "Unknown"),
					artist: String(track.artist?.name || artist.name || artistName),
				}));

			if (bucket.length > 0) {
				artistTrackBuckets.push(bucket);
			}
		} catch {
			console.log(
				`  ⚠️ Top-Tracks konnten nicht geladen werden für: ${artistName}`,
			);
		}
	}

	const foundSongs: MatchedSong[] = [];
	const seenSongIds = new Set<string>();
	let addedInRound = true;

	while (foundSongs.length < 12 && addedInRound) {
		addedInRound = false;
		for (const bucket of artistTrackBuckets) {
			const nextTrack = bucket.shift();
			if (!nextTrack || seenSongIds.has(nextTrack.id)) {
				continue;
			}
			seenSongIds.add(nextTrack.id);
			foundSongs.push(nextTrack);
			addedInRound = true;
			if (foundSongs.length >= 12) {
				break;
			}
		}
	}

	return foundSongs;
}

async function findBestDeezerMatch(suggestion: string): Promise<MatchedSong | null> {
	const dashIdx = suggestion.lastIndexOf(" - ");
	const searchTitle =
		dashIdx !== -1 ? suggestion.slice(0, dashIdx).trim() : suggestion.trim();
	const rawArtist = dashIdx !== -1 ? suggestion.slice(dashIdx + 3).trim() : "";
	const searchArtist = rawArtist
		.replace(/\s*(ft\.|feat\.|featuring).*$/i, "")
		.trim();

	const api = new DeezerAPI();
	const seen = new Set<string>();
	const candidates: any[] = [];
	const addCandidates = (data: any[]) => {
		for (const track of data) {
			const key = String(track.id);
			if (!seen.has(key)) {
				seen.add(key);
				candidates.push(track);
			}
		}
	};

	if (searchArtist) {
		try {
			const res = await api.searchTrackPrecise(searchTitle, searchArtist);
			if (res.data?.length > 0) addCandidates(res.data.slice(0, 15));
		} catch {
			// continue with fallback search
		}
	}

	if (candidates.length < 5) {
		try {
			const query = searchArtist
				? `${searchTitle} ${searchArtist}`
				: searchTitle;
			const res = await api.searchPlain(query);
			if (res.data?.length > 0) addCandidates(res.data.slice(0, 15));
		} catch {
			// continue with title-only fallback
		}
	}

	if (candidates.length === 0) {
		try {
			const res = await api.searchTrack(searchTitle);
			if (res.data?.length > 0) addCandidates(res.data.slice(0, 15));
		} catch {
			return null;
		}
	}

	if (candidates.length === 0) {
		return null;
	}

	const normTitle = normalizeForMatch(searchTitle);
	const normArtist = normalizeForMatch(searchArtist);
	let bestScore = -1;
	let bestTrack: any = null;

	for (const track of candidates) {
		const trackTitle = String(track.title || track.title_short || "");
		const trackArtist = String(track.artist?.name || "");
		const normTrackTitle = normalizeForMatch(trackTitle);
		const normTrackArtist = normalizeForMatch(trackArtist);
		const titleJaccard = jaccardSimilarity(trackTitle, searchTitle);
		const artistJaccard = searchArtist
			? jaccardSimilarity(trackArtist, searchArtist)
			: 1.0;
		const titleContains =
			normTrackTitle.includes(normTitle) || normTitle.includes(normTrackTitle)
				? 0.2
				: 0.0;
		const artistContains =
			searchArtist &&
			(normTrackArtist.includes(normArtist) ||
				normArtist.includes(normTrackArtist))
				? 0.1
				: 0.0;
		const combinedScore =
			titleJaccard * 0.5 +
			artistJaccard * 0.3 +
			titleContains +
			artistContains;

		if (combinedScore > bestScore) {
			bestScore = combinedScore;
			bestTrack = track;
		}
	}

	if (!bestTrack || bestScore < 0.25) {
		return null;
	}

	return {
		id: String(bestTrack.id),
		title: String(bestTrack.title || bestTrack.title_short || "Unknown"),
		artist: String(bestTrack.artist?.name || "Unknown Artist"),
	};
}

function getPlaylistDataPath(): string {
	const currentFile = fileURLToPath(import.meta.url);
	const currentDir = path.dirname(currentFile);
	return path.resolve(currentDir, "..", "Server", "Data", "playlist_data.json");
}

async function generateSongsFromPrompt(
	request: string,
	constraints?: PlaylistGenerationConstraints,
): Promise<MatchedSong[]> {
	const apiKey = process.env.OPENAI_API_KEY;

	if (!apiKey) {
		console.error("Fehler: OPENAI_API_KEY ist nicht in der .env Datei gesetzt.");
		return [];
	}

	const client = new OpenAI({ apiKey });
	const referenceArtists = constraints?.referenceArtists?.slice(0, 5) ?? [];
	const referenceSongs = constraints?.referenceSongs?.slice(0, 8) ?? [];
	const languageHint = constraints?.languageHint?.trim() ?? "";
	const completion = await client.chat.completions.create({
		model: "gpt-4o-mini",
		temperature: 0.2,
		max_tokens: 700,
		messages: [
			{
				role: "system",
				content:
					"Du bist ein Musik-Assistant. Interpretiere die Nutzereingabe praezise. Wenn konkrete Artists genannt werden, liefere nur Songs dieser Artists. Wenn nach Top Songs eines Artists gefragt wird, liefere bekannte Tracks genau dieser Artists. Wenn nach Stimmung, Genre oder Aktivitaet gefragt wird, liefere passende Songs. Wenn Referenzkuenstler oder Referenzsongs gegeben sind, orientiere dich eng daran und vermeide stilistisch unpassende Mainstream-Ausreisser. Achte auf die gewuenschte Sprache. Gib ausschliesslich eine nummerierte Liste zurueck, genau eine Zeile pro Song, exakt im Format: Songtitel - Kuenstler. Niemals das Format umdrehen. Keine Anfuehrungszeichen. Keine Erklaerungen. Keine Einleitung. Keine zusaetzlichen Saetze.",
			},
			{
				role: "user",
				content:
					`Erstelle eine Playlist auf Basis dieser Anfrage: "${request}". ` +
					"Wenn Artists genannt werden, verwende nur Songs dieser Artists. " +
					"Bevorzuge offiziell bekannte Tracks und gib 10-15 Eintraege aus. " +
					(languageHint
						? `Bevorzugte Songsprache: ${languageHint}. `
						: "") +
					(referenceArtists.length > 0
						? `Wichtige Referenzkuenstler: ${referenceArtists.join(", ")}. `
						: "") +
					(referenceSongs.length > 0
						? `Beispielsongs fuer den Stil:\n${referenceSongs.join("\n")}\n`
						: "") +
					"Vermeide stilistisch unpassende Songs und offensichtliche Genre-Ausreisser. " +
					"Antwortformat strikt: Songtitel - Kuenstler.",
			},
		],
	});

	const responseText = completion.choices?.[0]?.message?.content ?? "";
	const songLines = responseText.split("\n").filter((line) => line.trim());
	const songSuggestions = Array.from(
		new Set(
			songLines
				.map((line) => normalizeAISongLine(line))
				.filter((line): line is string => Boolean(line)),
		),
	);

	if (songSuggestions.length === 0) {
		console.error("❌ Keine Songs von der KI generiert.");
		return [];
	}

	console.log(`\n🔍 Suche ${songSuggestions.length} Songs in Deezer...`);

	const foundSongs: MatchedSong[] = [];
	const seenSongIds = new Set<string>();

	for (const suggestion of songSuggestions) {
		try {
			const match = await findBestDeezerMatch(suggestion);
			if (!match) {
				console.log(`  ⚠️ Kein passender Song gefunden für: ${suggestion}`);
				continue;
			}
			if (seenSongIds.has(match.id)) {
				continue;
			}
			seenSongIds.add(match.id);
			foundSongs.push(match);
		} catch {
			console.log(`  ⚠️ Konnte nicht finden: ${suggestion}`);
		}
	}

	return foundSongs;
}

function getTopArtistsFromSourceSongs(
	sourceSongs: string[],
	limit = 5,
): Array<{ artist: string; count: number }> {
	const artistCounts = new Map<string, number>();

	for (const song of sourceSongs) {
		const dashIndex = song.lastIndexOf(" - ");
		if (dashIndex === -1) {
			continue;
		}
		const artist = song.slice(dashIndex + 3).trim();
		if (!artist) {
			continue;
		}
		artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
	}

	return Array.from(artistCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([artist, count]) => ({ artist, count }));
}

function extractJsonObject(text: string): string | null {
	const startIndex = text.indexOf("{");
	const endIndex = text.lastIndexOf("}");
	if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
		return null;
	}
	return text.slice(startIndex, endIndex + 1);
}

async function generatePlaylistProfileFromSongs(
	sourceSongs: string[],
): Promise<PlaylistProfile | null> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		console.error("Fehler: OPENAI_API_KEY ist nicht in der .env Datei gesetzt.");
		return null;
	}

	const client = new OpenAI({ apiKey });
	const topArtists = getTopArtistsFromSourceSongs(sourceSongs);
	const artistSummary = topArtists
		.map(({ artist, count }) => `${artist} (${count})`)
		.join(", ");
	const completion = await client.chat.completions.create({
		model: "gpt-4o-mini",
		temperature: 0.2,
		max_tokens: 220,
		messages: [
			{
				role: "system",
				content:
					"Du analysierst Songlisten und erstellst ein kompaktes JSON-Profil fuer aehnliche Songempfehlungen. Antworte nur mit gueltigem JSON, ohne Markdown. Schema: {\"prompt\": string, \"languageHint\": \"deutsch\" | \"englisch\" | \"gemischt\", \"referenceArtists\": string[]}. Der Prompt muss kurz, einfach, alltagssprachlich und nicht hochgestochen sein, maximal 18 Woerter. Achte auf wiederkehrende Kuenstler, Sprache und Stil. Wenn die Playlist ueberwiegend deutschsprachig ist, setze languageHint auf deutsch. Wenn sie ueberwiegend englischsprachig ist, setze languageHint auf englisch. Fuehre bis zu 4 wichtige Referenzkuenstler auf.",
			},
			{
				role: "user",
				content:
					"Analysiere diese Playlist-Songs. " +
					"Der Prompt soll direkt, simpel und stilnah sein. " +
					"Nutze keine poetischen oder generischen Formulierungen. " +
					`Haeufige Kuenstler: ${artistSummary || "keine klaren Wiederholungen"}.\n\n` +
					`Songs:\n${sourceSongs.join("\n")}`,
			},
		],
	});

	const rawResponse = String(completion.choices?.[0]?.message?.content ?? "").trim();
	const jsonText = extractJsonObject(rawResponse) ?? rawResponse;

	try {
		const parsed = JSON.parse(jsonText) as Partial<PlaylistProfile>;
		const prompt = String(parsed.prompt ?? "").trim();
		const languageHint = String(parsed.languageHint ?? "gemischt").trim();
		const referenceArtists = Array.isArray(parsed.referenceArtists)
			? parsed.referenceArtists
					.map((artist) => String(artist).trim())
					.filter((artist) => artist.length > 0)
			: [];

		if (!prompt) {
			return null;
		}

		return {
			prompt,
			languageHint,
			referenceArtists:
				referenceArtists.length > 0
					? referenceArtists.slice(0, 4)
					: topArtists.map(({ artist }) => artist).slice(0, 4),
		};
	} catch {
		return {
			prompt: rawResponse,
			languageHint: "gemischt",
			referenceArtists: topArtists.map(({ artist }) => artist).slice(0, 4),
		};
	}
}

export async function createAIPlaylist(
	username: string,
	playlistName: string,
	mood: string,
	constraints?: PlaylistGenerationConstraints,
): Promise<boolean> {
	try {
		const requestedArtists = extractArtistNamesFromRequest(mood);
		let foundSongs: MatchedSong[] = [];

		if (requestedArtists.length > 0) {
			console.log(
				`\n🎵 Generiere Playlist "${playlistName}" direkt aus Deezer-Top-Tracks fuer: ${requestedArtists.join(", ")}...`,
			);
			foundSongs = await buildArtistDrivenPlaylist(mood);
		} else {
			console.log(
				`\n🎵 Generiere Playlist "${playlistName}" aus Anfrage: "${mood}"...`,
			);
			foundSongs = await generateSongsFromPrompt(mood, constraints);
		}

		if (foundSongs.length === 0) {
			console.error("❌ Keine Songs in Deezer gefunden.");
			return false;
		}

		console.log(
			`\n📋 Playlist "${playlistName}" würde folgende ${foundSongs.length} Songs enthalten:\n`,
		);
		foundSongs.forEach((song, idx) => {
			console.log(`${idx + 1}. ${song.title} - ${song.artist}`);
		});

		console.log("\n");
		const confirm = await ask(
			`Soll die Playlist "${playlistName}" zum Account "${username}" hinzugefügt werden? (y/n): `,
		);

		if (confirm.toLowerCase() !== "y") {
			console.log("Playlist wurde nicht erstellt.");
			return false;
		}

		console.log("\n💾 Erstelle Playlist und füge Songs hinzu...");

		const filePath = getPlaylistDataPath();
		const raw = await fs.readFile(filePath, "utf8");
		const data: any = JSON.parse(raw || "{}");

		if (!data.playlistsByUser) data.playlistsByUser = {};
		if (!data.playlistsByUser[username]) data.playlistsByUser[username] = [];

		const playlistExists = data.playlistsByUser[username].some(
			(playlist: any) =>
				String(playlist?.name ?? "")
					.trim()
					.toLowerCase() === playlistName.trim().toLowerCase(),
		);

		if (playlistExists) {
			console.error(
				`Playlist "${playlistName}" existiert bereits für User "${username}".`,
			);
			return false;
		}

		data.playlistsByUser[username].push({
			name: playlistName,
			songs: foundSongs.map((song) => String(song.id)),
			public: false,
		});

		await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
		console.log(
			`✅ Playlist "${playlistName}" mit ${foundSongs.length} Songs erstellt und gespeichert!`,
		);
		return true;
	} catch (err: any) {
		console.error("❌ Fehler in createAIPlaylist:", err?.message || err);
		return false;
	}
}

export async function AIPlaylistFromPlaylist(
	username: string,
	newPlaylistName: string,
	basePlaylistName: string,
): Promise<boolean> {
	try {
		const filePath = getPlaylistDataPath();
		const raw = await fs.readFile(filePath, "utf8");
		const data: any = JSON.parse(raw || "{}");
		const userPlaylists = data?.playlistsByUser?.[username];

		if (!Array.isArray(userPlaylists)) {
			console.error(`User "${username}" wurde nicht gefunden.`);
			return false;
		}

		const basePlaylist = userPlaylists.find(
			(playlist: any) =>
				String(playlist?.name ?? "")
					.trim()
					.toLowerCase() === basePlaylistName.trim().toLowerCase(),
		);

		if (!basePlaylist) {
			console.error(
				`Basis-Playlist "${basePlaylistName}" wurde nicht gefunden.`,
			);
			return false;
		}

		const songIds: string[] = Array.isArray(basePlaylist.songs)
			? Array.from(
					new Set(
						basePlaylist.songs
							.map((id: any) => String(id).trim())
							.filter((id: string) => id.length > 0),
					),
				)
			: [];

		if (songIds.length === 0) {
			console.error(
				`Basis-Playlist "${basePlaylistName}" enthält keine Songs.`,
			);
			return false;
		}

		const deezerApi = new DeezerAPI();
		const sourceSongs: string[] = [];

		for (const songId of songIds.slice(0, 25)) {
			try {
				const track = await deezerApi.lookupTrack(songId);
				const title = track?.title || track?.title_short || track?.name;
				const artist = track?.artist?.name || track?.artist_name;
				if (title && artist) {
					sourceSongs.push(`${title} - ${artist}`);
				}
			} catch {
				// einzelne fehlerhafte IDs überspringen
			}
		}

		if (sourceSongs.length === 0) {
			console.error("Die Songs der Basis-Playlist konnten nicht aufgelöst werden.");
			return false;
		}

		console.log(
			`\n🧠 Analysiere Playlist "${basePlaylistName}" und erstelle einen Musik-Prompt...`,
		);

		const profile = await generatePlaylistProfileFromSongs(sourceSongs);
		if (!profile?.prompt) {
			console.error("KI konnte keinen Prompt aus der Basis-Playlist erzeugen.");
			return false;
		}

		console.log(`\n📝 Generierter Prompt: ${profile.prompt}`);
		return createAIPlaylist(username, newPlaylistName, profile.prompt, {
			languageHint: profile.languageHint,
			referenceArtists: profile.referenceArtists,
			referenceSongs: sourceSongs,
		});
	} catch (err: any) {
		console.error("Fehler in AIPlaylistFromPlaylist:", err?.message || err);
		return false;
	}
}

export async function addAIToSamePlaylistFromPlaylistAnalysis(
	username: string,
	playlistName: string,
): Promise<boolean> {
	try {
		const filePath = getPlaylistDataPath();
		const raw = await fs.readFile(filePath, "utf8");
		const data: any = JSON.parse(raw || "{}");
		const userPlaylists = data?.playlistsByUser?.[username];

		if (!Array.isArray(userPlaylists)) {
			console.error(`User "${username}" wurde nicht gefunden.`);
			return false;
		}

		const basePlaylist = userPlaylists.find(
			(playlist: any) =>
				String(playlist?.name ?? "")
					.trim()
					.toLowerCase() === playlistName.trim().toLowerCase(),
		);

		if (!basePlaylist) {
			console.error(`Playlist "${playlistName}" wurde nicht gefunden.`);
			return false;
		}

		const songIds: string[] = Array.isArray(basePlaylist.songs)
			? Array.from(
					new Set(
						basePlaylist.songs
							.map((id: any) => String(id).trim())
							.filter((id: string) => id.length > 0),
					),
				)
			: [];

		if (songIds.length === 0) {
			console.error(`Playlist "${playlistName}" enthaelt keine Songs.`);
			return false;
		}

		const deezerApi = new DeezerAPI();
		const sourceSongs: string[] = [];

		for (const songId of songIds.slice(0, 25)) {
			try {
				const track = await deezerApi.lookupTrack(songId);
				const title = track?.title || track?.title_short || track?.name;
				const artist = track?.artist?.name || track?.artist_name;
				if (title && artist) {
					sourceSongs.push(`${title} - ${artist}`);
				}
			} catch {
				// einzelne fehlerhafte IDs ueberspringen
			}
		}

		if (sourceSongs.length === 0) {
			console.error("Die Songs der Playlist konnten nicht aufgeloest werden.");
			return false;
		}

		console.log(
			`\n🧠 Analysiere Playlist "${playlistName}" und erweitere sie mit passenden Songs...`,
		);

		const profile = await generatePlaylistProfileFromSongs(sourceSongs);
		if (!profile?.prompt) {
			console.error("KI konnte keinen Prompt aus der Playlist erzeugen.");
			return false;
		}

		console.log(`\n📝 Generierter Prompt: ${profile.prompt}`);
		return addAISongsToPlaylist(username, playlistName, profile.prompt, {
			languageHint: profile.languageHint,
			referenceArtists: profile.referenceArtists,
			referenceSongs: sourceSongs,
		});
	} catch (err: any) {
		console.error(
			"Fehler in addAIToSamePlaylistFromPlaylistAnalysis:",
			err?.message || err,
		);
		return false;
	}
}

export async function addAISongsToPlaylist(
	username: string,
	targetPlaylistName: string,
	mood: string,
	constraints?: PlaylistGenerationConstraints,
): Promise<boolean> {
	try {
		const requestedArtists = extractArtistNamesFromRequest(mood);
		let foundSongs: MatchedSong[] = [];

		if (requestedArtists.length > 0) {
			console.log(
				`\n🎵 Generiere Songs zum Hinzufuegen aus Deezer-Top-Tracks fuer: ${requestedArtists.join(", ")}...`,
			);
			foundSongs = await buildArtistDrivenPlaylist(mood);
		} else {
			console.log(
				`\n🎵 Generiere Songs zum Hinzufuegen aus Anfrage: "${mood}"...`,
			);
			foundSongs = await generateSongsFromPrompt(mood, constraints);
		}

		if (foundSongs.length === 0) {
			console.error("❌ Keine Songs in Deezer gefunden.");
			return false;
		}

		const filePath = getPlaylistDataPath();
		const raw = await fs.readFile(filePath, "utf8");
		const data: any = JSON.parse(raw || "{}");
		const userPlaylists = data?.playlistsByUser?.[username];

		if (!Array.isArray(userPlaylists)) {
			console.error(`User "${username}" wurde nicht gefunden.`);
			return false;
		}

		const targetPlaylist = userPlaylists.find(
			(playlist: any) =>
				String(playlist?.name ?? "")
					.trim()
					.toLowerCase() === targetPlaylistName.trim().toLowerCase(),
		);

		if (!targetPlaylist) {
			console.error(`Playlist "${targetPlaylistName}" wurde nicht gefunden.`);
			return false;
		}

		if (!Array.isArray(targetPlaylist.songs)) {
			targetPlaylist.songs = [];
		}

		const existingSongIds = new Set(
			targetPlaylist.songs.map((songId: any) => String(songId).trim()),
		);
		const songsToAdd = foundSongs.filter(
			(song) => !existingSongIds.has(String(song.id)),
		);

		if (songsToAdd.length === 0) {
			console.log(
				`\nℹ️ Alle gefundenen Songs sind bereits in der Playlist "${targetPlaylistName}" enthalten.`,
			);
			return false;
		}

		console.log(
			`\n📋 Folgende ${songsToAdd.length} neuen Songs werden zu "${targetPlaylistName}" hinzugefuegt:\n`,
		);
		songsToAdd.forEach((song, idx) => {
			console.log(`${idx + 1}. ${song.title} - ${song.artist}`);
		});

		const skippedCount = foundSongs.length - songsToAdd.length;
		if (skippedCount > 0) {
			console.log(
				`\nℹ️ ${skippedCount} Song(s) wurden uebersprungen, weil sie bereits vorhanden sind.`,
			);
		}

		console.log("\n");
		const confirm = await ask(
			`Soll(en) ${songsToAdd.length} Song(s) zur Playlist "${targetPlaylistName}" hinzugefuegt werden? (y/n): `,
		);

		if (confirm.toLowerCase() !== "y") {
			console.log("Songs wurden nicht hinzugefuegt.");
			return false;
		}

		targetPlaylist.songs.push(...songsToAdd.map((song) => String(song.id)));
		await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");

		console.log(
			`✅ ${songsToAdd.length} Song(s) wurden zu "${targetPlaylistName}" hinzugefuegt!`,
		);
		return true;
	} catch (err: any) {
		console.error("❌ Fehler in addAISongsToPlaylist:", err?.message || err);
		return false;
	}
}
