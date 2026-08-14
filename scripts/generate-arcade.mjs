// Generates arcade contribution SVGs using the pacman-contribution-graph
// library directly (not the abozanona/pacman-contribution-graph Action),
// to avoid the Action's built-in telemetry calls to a third-party leaderboard.
import { ArcadeRenderer } from 'pacman-contribution-graph';
import { mkdirSync, writeFileSync } from 'fs';

const githubToken = process.env.GITHUB_TOKEN;

const targets = [
	{ username: 'TruxRoyal', game: 'puzzle-bobble' },
	{ username: 'dguzm12', game: 'pacman' }
];

const generate = (game, username, theme) =>
	new Promise((resolve, reject) => {
		let svg = '';
		const renderer = new ArcadeRenderer({
			game,
			platform: 'github',
			username,
			gameTheme: theme,
			playerStyle: 'opportunistic',
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

mkdirSync('dist', { recursive: true });

for (const { username, game } of targets) {
	const light = await generate(game, username, 'github');
	writeFileSync(`dist/${game}-contribution-graph.svg`, light);

	const dark = await generate(game, username, 'github-dark');
	writeFileSync(`dist/${game}-contribution-graph-dark.svg`, dark);

	console.log(`Generated ${game} graph for ${username}`);
}
