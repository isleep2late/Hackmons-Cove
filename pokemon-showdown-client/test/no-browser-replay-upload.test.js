/**
 * Gate: no client source may upload a replay from the browser.
 *
 * The login server removed `act=uploadreplay`, so a browser that POSTs a battle log to
 * action.php gets back `]{"actionerror":"No longer exists; use addreplay."}` and the replay
 * is silently lost. Saving is the server's job now - both clients send `/savereplay` and the
 * server uploads the log itself (see pokemon-showdown/server/rooms.ts, GameRoom#uploadReplay).
 *
 * Reintroduce the `$.post(app.user.getActionPHP(), { act: 'uploadreplay', ... })` call in
 * src/oldclient/client.js and this goes red.
 *
 * This also checks that the built copies under play.pokemonshowdown.com/js match, because
 * js/oldclient is a byte-for-byte copy of src/oldclient made by build-local.mjs: editing one
 * without rebuilding the other is how a fix ends up shipped only half-applied.
 */

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

/** Directories holding client code that runs in a browser. */
const SOURCE_ROOTS = [
	'play.pokemonshowdown.com/src',
	'play.pokemonshowdown.com/js',
	'replay.pokemonshowdown.com/src',
	'teams.pokemonshowdown.com/src',
];

const SKIP_DIRS = new Set(['node_modules', 'lib', 'caches', 'data']);
const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

function collectFiles(dir, out) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (err) {
		if (err.code === 'ENOENT') return out; // js/ only exists after a build
		throw err;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			collectFiles(full, out);
		} else if (CODE_EXTENSIONS.has(path.extname(entry.name)) && !entry.name.endsWith('.min.js')) {
			out.push(full);
		}
	}
	return out;
}

function clientFiles() {
	const files = [];
	for (const root of SOURCE_ROOTS) collectFiles(path.join(repoRoot, root), files);
	return files;
}

/**
 * Matches the act being set to uploadreplay in any of the forms the client could write it:
 * `act: 'uploadreplay'`, `act = "uploadreplay"`, `act=uploadreplay` in a query string.
 */
const UPLOADREPLAY_ACT = /\bact\s*[:=]\s*['"`]?uploadreplay\b/;

/**
 * Drops comments so that explaining the old bug in a docblock - which the files touched by
 * this fix do - is not itself a violation. Line-based and deliberately crude: it only has to
 * be right about whether a line can execute, and a comment cannot POST anything.
 */
function stripComments(line) {
	const trimmed = line.trim();
	if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return '';
	return line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
}

describe('replay uploading', () => {
	it('finds client source files to check', () => {
		const files = clientFiles();
		assert(files.length > 50, `only found ${files.length} client files - the scan is not looking where it thinks`);
		const oldClient = path.join(repoRoot, 'play.pokemonshowdown.com/src/oldclient/client.js');
		assert(files.includes(oldClient), 'the scan missed src/oldclient/client.js, the file that had the bug');
	});

	it('no client source posts act=uploadreplay', () => {
		const offenders = [];
		for (const file of clientFiles()) {
			const contents = fs.readFileSync(file, 'utf8');
			contents.split('\n').forEach((line, i) => {
				if (UPLOADREPLAY_ACT.test(stripComments(line))) {
					offenders.push(`${path.relative(repoRoot, file)}:${i + 1}: ${line.trim()}`);
				}
			});
		}
		assert.deepEqual(
			offenders, [],
			`the login server removed act=uploadreplay; send /savereplay and let the server upload:\n${offenders.join('\n')}`
		);
	});

	it('keeps the built oldclient copy in sync with its source', () => {
		const src = path.join(repoRoot, 'play.pokemonshowdown.com/src/oldclient');
		const built = path.join(repoRoot, 'play.pokemonshowdown.com/js/oldclient');
		if (!fs.existsSync(built)) return; // nothing built yet in this checkout

		const stale = [];
		for (const name of fs.readdirSync(src)) {
			const srcFile = path.join(src, name);
			const builtFile = path.join(built, name);
			if (!fs.statSync(srcFile).isFile()) continue;
			if (!fs.existsSync(builtFile)) {
				stale.push(`${name} (missing from js/oldclient)`);
				continue;
			}
			if (fs.readFileSync(srcFile, 'utf8') !== fs.readFileSync(builtFile, 'utf8')) {
				stale.push(`${name} (js/oldclient copy differs from src/oldclient)`);
			}
		}
		assert.deepEqual(stale, [], `run \`node build\` - js/oldclient is a copy of src/oldclient:\n${stale.join('\n')}`);
	});
});
