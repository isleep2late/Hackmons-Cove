/**
 * Gate: the server-side replay uploader and this repo's replay store agree on the wire.
 *
 * The sim's server/replay-upload.ts POSTs replays to the front server's `act=uploadreplay`
 * route (deploy/phnn-client-server.js). Nothing else checks that those two halves match, and
 * they live in different halves of this monorepo, so a change to either can quietly break
 * "Upload and share replay" without any test noticing.
 *
 * This boots the real front server on a scratch port with a scratch replay directory and
 * drives the real (compiled) uploader against it. No stubs on either side.
 *
 * It needs the sibling sim built (`node build` in ../pokemon-showdown). If the sibling is
 * there but unbuilt this test fails rather than skipping - a gate that quietly turns itself
 * off is not a gate.
 */

const assert = require('assert').strict;
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { after, before, describe, it } = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const simRoot = path.resolve(repoRoot, '../pokemon-showdown');
const uploaderPath = path.join(simRoot, 'dist/server/replay-upload.js');
const frontServer = path.join(repoRoot, 'deploy/phnn-client-server.js');

const simPresent = fs.existsSync(simRoot);

/** Asks the OS for an unused TCP port and gives it back. */
function freePort() {
	const net = require('net');
	return new Promise((resolve, reject) => {
		const probe = net.createServer();
		probe.on('error', reject);
		probe.listen(0, '127.0.0.1', () => {
			const { port } = probe.address();
			probe.close(() => resolve(port));
		});
	});
}

describe('replay store upload', { skip: simPresent ? false : 'no sibling pokemon-showdown checkout' }, () => {
	let child;
	let baseUrl;
	let actionUrl;
	let replayDir;
	let uploader;

	before(async () => {
		assert(
			fs.existsSync(uploaderPath),
			`${path.relative(repoRoot, uploaderPath)} is missing - run \`node build\` in pokemon-showdown first`
		);
		uploader = require(uploaderPath);

		replayDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phnn-replay-gate-'));
		// The front server needs a concrete port (it prints PHNN_CLIENT_PORT verbatim, so
		// letting it bind :0 leaves us with no way to find out what it got). Borrow one from
		// the OS and hand it straight over, so a running beta/prod front server can't collide.
		const port = await freePort();
		child = spawn(process.execPath, [frontServer], {
			env: {
				...process.env,
				PHNN_CLIENT_PORT: String(port),
				PHNN_GAME_PORT: String(await freePort()),
				PHNN_REPLAYS_DIR: replayDir,
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		baseUrl = `http://127.0.0.1:${port}`;
		actionUrl = `${baseUrl}/action.php`;

		await new Promise((resolve, reject) => {
			let out = '';
			const timer = setTimeout(() => reject(new Error(`front server never came up; got: ${out}`)), 30000);
			child.stdout.on('data', chunk => {
				out += chunk;
				if (out.includes(`client server on http://localhost:${port}`)) {
					clearTimeout(timer);
					resolve();
				}
			});
			child.on('error', err => { clearTimeout(timer); reject(err); });
			child.on('exit', code => { clearTimeout(timer); reject(new Error(`front server exited with ${code}: ${out}`)); });
		});
	});

	after(() => {
		if (child) child.kill('SIGTERM');
		if (replayDir) fs.rmSync(replayDir, { recursive: true, force: true });
	});

	const battleLog = [
		'|player|p1|Champion|1|',
		'|player|p2|Runner Up|2|',
		'|tier|[Gen 9] Balanced Hackmons',
		'|turn|1',
		'|win|Champion',
	].join('\n');

	let publicId;

	it('saves a replay the store accepts, writes, and serves back', async () => {
		publicId = `gen9balancedhackmons-${Date.now()}`;
		const result = await uploader.uploadReplayToStore({
			url: actionUrl,
			id: publicId,
			log: battleLog,
			serverid: 'play-hackmons-com',
		});

		assert(!result.error, `upload was rejected: ${result.error}`);
		assert.equal(result.fullid, publicId);
		assert(
			fs.existsSync(path.join(replayDir, `${result.fullid}.log`)),
			'the store answered success but wrote no log file'
		);
		const served = await (await fetch(`${baseUrl}/replays/${result.fullid}.log`)).text();
		assert(served.includes('|win|Champion'), `the store served back something else: ${served.slice(0, 120)}`);
	});

	it('keeps a password-protected replay out of the public listing', async () => {
		const privateId = `gen9balancedhackmons-${Date.now() + 1}`;
		const result = await uploader.uploadReplayToStore({
			url: actionUrl,
			id: privateId,
			log: battleLog,
			password: 'abc123',
		});

		assert(!result.error, `upload was rejected: ${result.error}`);
		// A password is the only thing this store has that means "not public", which is why
		// GameRoom#uploadReplay forces one for every non-public `hidden` level.
		assert.equal(result.fullid, `${privateId}-abc123pw`);

		const listing = await (await fetch(`${baseUrl}/replays/search`)).text();
		assert(!listing.includes(privateId), 'a password-protected replay showed up in the public listing');
		assert(listing.includes(publicId), 'the public replay is missing from the public listing');
	});

	it('turns every store rejection into a sentence a player can act on', async () => {
		const noId = await uploader.uploadReplayToStore({ url: actionUrl, id: '', log: battleLog });
		assert(noId.error, 'an empty battle id was accepted');
		assert(/replay server will accept/.test(noId.error), noId.error);

		const tooBig = await uploader.uploadReplayToStore({
			url: actionUrl,
			id: `gen9balancedhackmons-${Date.now() + 2}`,
			log: 'x'.repeat(2 * 1024 * 1024),
		});
		assert(tooBig.error, 'a 2MB log was accepted by a store that caps at 1MB');
		assert(/too big for the replay server/.test(tooBig.error), tooBig.error);

		const unreachable = await uploader.uploadReplayToStore({
			url: 'http://127.0.0.1:1/action.php',
			id: `gen9balancedhackmons-${Date.now() + 3}`,
			log: battleLog,
		});
		assert(unreachable.error, 'an unreachable store was treated as a success');
		assert(/Couldn't reach the replay server/.test(unreachable.error), unreachable.error);
	});

	it('never hands back a raw JSON error body', () => {
		// The exact body from the bug report: `]` guard plus an actionerror payload.
		const message = uploader.describeReplayUploadFailure(']{"actionerror":"No longer exists; use addreplay."}');
		assert(!message.includes('{"'), `raw JSON reached the message: ${message}`);
		assert(!message.includes(']{'), `the JSON-hijacking guard reached the message: ${message}`);
		assert(message.includes('No longer exists; use addreplay.'), `the reason was dropped: ${message}`);

		// JSON with no human-readable field at all - what the login server answers an
		// unregistered server. There is nothing to quote, so it must be described, not dumped.
		for (const body of ['{"errorip":"203.0.113.7"}', '{"weird":1}', '[{"nope":true}]', '{not json']) {
			const described = uploader.describeReplayUploadFailure(body);
			assert(!described.includes('{'), `raw JSON reached the message for ${body}: ${described}`);
			assert(/administrator/.test(described), `no next step offered for ${body}: ${described}`);
		}

		// An HTML error page must not become a wall of markup either.
		const html = uploader.describeReplayUploadFailure(`<html><body><h1>502 Bad Gateway</h1></body></html>`);
		assert(!html.includes('<'), `raw HTML reached the message: ${html}`);
		assert(html.length < 220, `message was not capped: ${html.length} chars`);
	});
});
