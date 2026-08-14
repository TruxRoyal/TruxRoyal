// Generates arcade contribution SVGs using the pacman-contribution-graph
// library directly (not the abozanona/pacman-contribution-graph Action),
// to avoid the Action's built-in telemetry calls to a third-party leaderboard.
import { ArcadeRenderer } from 'pacman-contribution-graph';
import { mkdirSync, writeFileSync } from 'fs';

const githubToken = process.env.GITHUB_TOKEN;
const GAME_TIMEOUT_MS = 90_000;

// Temporary diagnostics: log every HTTP request the library makes so we can
// tell whether a stall happens during the GitHub API fetch or the in-memory
// game simulation. Remove once the pacman/dguzm12 hang is understood.
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
	const label = typeof url === 'string' ? url : url?.url;
	const start = Date.now();
	console.log(`[fetch] -> ${label}`);
	try {
		const res = await nativeFetch(url, opts);
		console.log(`[fetch] <- ${label} status=${res.status} (${Date.now() - start}ms)`);
		return res;
	} catch (err) {
		console.log(`[fetch] xx ${label} error=${err.message} (${Date.now() - start}ms)`);
		throw err;
	}
};

const targets = [
	{ username: 'TruxRoyal', game: 'puzzle-bobble', playerStyle: 'opportunistic' },
	{ username: 'dguzm12', game: 'pacman', playerStyle: 'aggressive' }
];

const generate = (game, username, theme, playerStyle) =>
	new Promise((resolve, reject) => {
		let svg = '';
		const renderer = new ArcadeRenderer({
			game,
			platform: 'github',
			username,
			gameTheme: theme,
			playerStyle,
			showMonthLabels: true,
			githubSettings: { accessToken: githubToken },
			svgCallback: (s) => {
				svg = s;
			},
			gameStatsCallback: () => {},
			gameOverCallback: () => resolve(svg),
			pointsIncreasedCallback: () => {}
		});
		renderer.start().catch(reject);
	});

// Some game simulations (e.g. pacman AI on sparse grids) can stall without
// ever reaching gameOverCallback, so cap how long we wait per SVG.
const withTimeout = (promise, ms) =>
	new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
		promise.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			(e) => {
				clearTimeout(timer);
				reject(e);
			}
		);
	});

mkdirSync('dist', { recursive: true });

for (const { username, game, playerStyle } of targets) {
	try {
		const light = await withTimeout(generate(game, username, 'github', playerStyle), GAME_TIMEOUT_MS);
		writeFileSync(`dist/${game}-contribution-graph.svg`, light);

		const dark = await withTimeout(generate(game, username, 'github-dark', playerStyle), GAME_TIMEOUT_MS);
		writeFileSync(`dist/${game}-contribution-graph-dark.svg`, dark);

		console.log(`Generated ${game} graph for ${username}`);
	} catch (err) {
		console.warn(`Skipping ${game} graph for ${username}: ${err.message}`);
	}
}
