'use strict';

/**
 * Gate for the replay upload path.
 *
 * The bug this guards against: `/savereplay` used to answer with
 * `|queryresponse|savereplay|{...}` and leave the *browser* to POST the log to the login
 * server's `act=uploadreplay`. That action was removed upstream, so the browser got back
 * `]{"actionerror":"No longer exists; use addreplay."}` and no replay was ever saved.
 *
 * Put that back (make /savereplay send a queryresponse instead of uploading) and
 * "uploads the replay from the server" fails. Take out the failure handling in
 * GameRoom#uploadReplay and the "reports a rejection in words" tests fail.
 */

const assert = require('assert').strict;
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { makeUser } = require('../users-utils');

const packedTeam = 'Weavile||lifeorb||swordsdance,knockoff,iceshard,iciclecrash|Jolly|,252,,,4,252|||||';

/** Stands in for the fork's replay store (phnn-client-server.js `act=uploadreplay`). */
class FakeReplayStore {
	constructor() {
		this.requests = [];
		/** what to answer with; `null` means "behave like the real store and save it" */
		this.forcedResponse = null;
		this.forcedStatus = 200;
		this.server = http.createServer((req, res) => {
			let body = '';
			req.on('data', chunk => { body += chunk; });
			req.on('end', () => {
				const params = new URLSearchParams(body);
				const request = {
					act: params.get('act'),
					id: params.get('id'),
					log: params.get('log'),
					password: params.get('password'),
					token: params.get('token'),
				};
				this.requests.push(request);
				if (this.forcedResponse !== null) {
					res.writeHead(this.forcedStatus, { 'content-type': 'text/plain' });
					res.end(this.forcedResponse);
					return;
				}
				if (!request.id || !request.log) {
					res.writeHead(200, { 'content-type': 'text/plain' });
					res.end('invalid id');
					return;
				}
				const fullid = request.id + (request.password ? `-${request.password}pw` : '');
				res.writeHead(200, { 'content-type': 'text/plain' });
				res.end(`success:${fullid}`);
			});
		});
	}
	listen() {
		return new Promise(resolve => {
			this.server.listen(0, '127.0.0.1', () => {
				resolve(`http://127.0.0.1:${this.server.address().port}/action.php`);
			});
		});
	}
	close() {
		return new Promise(resolve => {
			this.server.close(() => resolve());
		});
	}
	reset() {
		this.requests = [];
		this.forcedResponse = null;
		this.forcedStatus = 200;
	}
}

describe('Replay upload', () => {
	let store;
	let storeUrl;
	let oldUploadUrl;
	let oldReplaysRoute;
	let oldTokenEnv;
	let tokenDir;
	let tokenFile;
	let token;

	before(async () => {
		store = new FakeReplayStore();
		storeUrl = await store.listen();
		oldUploadUrl = Config.replayuploadurl;
		oldReplaysRoute = Config.routes.replays;
		Config.replayuploadurl = storeUrl;
		Config.routes.replays = 'replay.example.com';
		tokenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phnn-replay-upload-token-'));
		tokenFile = path.join(tokenDir, 'replay-upload-token');
		token = crypto.randomBytes(32).toString('hex');
		fs.writeFileSync(tokenFile, `${token}\n`, { mode: 0o600 });
		oldTokenEnv = process.env.PHNN_REPLAY_TOKEN_FILE;
		process.env.PHNN_REPLAY_TOKEN_FILE = tokenFile;
	});

	after(async () => {
		Config.replayuploadurl = oldUploadUrl;
		Config.routes.replays = oldReplaysRoute;
		if (oldTokenEnv === undefined) {
			delete process.env.PHNN_REPLAY_TOKEN_FILE;
		} else {
			process.env.PHNN_REPLAY_TOKEN_FILE = oldTokenEnv;
		}
		fs.rmSync(tokenDir, { recursive: true, force: true });
		await store.close();
	});

	let room;
	let sent;

	/** Builds a finished-enough battle and records everything the server sends p1. */
	function makeBattle() {
		const p1 = makeUser();
		const p2 = makeUser();
		room = Rooms.createBattle({
			format: 'customgame',
			players: [
				{ user: p1, team: packedTeam },
				{ user: p2, team: packedTeam },
			],
			rated: false,
			tour: false,
		});
		// uploadReplay uploads `room.getLog(...)`, so the room needs something in its log or
		// the store legitimately rejects it as empty.
		room.add(`|player|p1|${p1.name}|1|`);
		room.add(`|player|p2|${p2.name}|2|`);
		room.add(`|turn|1`);
		room.update();

		sent = [];
		const connection = p1.connections[0];
		connection.send = msg => { sent.push(msg); };
		return { p1, p2, connection };
	}

	const popups = () => sent.filter(msg => msg.startsWith('|popup|')).map(msg => msg.slice(7));

	beforeEach(() => {
		store.reset();
	});

	afterEach(() => {
		for (const user of Users.users.values()) {
			user.disconnectAll();
			user.destroy();
		}
		if (room) room.destroy();
		room = null;
	});

	it('uploads the replay from the server, not from the browser', async () => {
		const { p1, connection } = makeBattle();

		await Chat.parse('/savereplay', room, p1, connection);

		// The old path: hand the log back to the browser and let it POST to action.php.
		// Nothing may be sent back for the browser to upload.
		assert.equal(
			sent.filter(msg => msg.startsWith('|queryresponse|savereplay|')).length, 0,
			`server told the browser to upload the replay itself: ${JSON.stringify(sent)}`
		);
		// The server did the upload.
		assert.equal(store.requests.length, 1, `store got ${store.requests.length} uploads, expected 1`);
		assert.equal(store.requests[0].act, 'uploadreplay');
		assert(store.requests[0].log.includes('|turn|1'), 'the battle log was not what got uploaded');
		// ...and told the player where it went.
		const [popup] = popups();
		assert(popup, `no popup was sent; got ${JSON.stringify(sent)}`);
		assert(
			popup.includes(`https://replay.example.com/${store.requests[0].id}`),
			`popup did not contain the replay URL: ${popup}`
		);
		assert(!popup.includes('undefined'), `popup contained an undefined replay id: ${popup}`);
		assert.equal(room.battle.replaySaved, true);
	});

	it('sends the upload key from PHNN_REPLAY_TOKEN_FILE', async () => {
		const { p1, connection } = makeBattle();

		await Chat.parse('/savereplay', room, p1, connection);

		assert.equal(store.requests.length, 1, `store got ${store.requests.length} uploads, expected 1`);
		assert.equal(store.requests[0].token, token, 'the upload did not carry the key from PHNN_REPLAY_TOKEN_FILE');
	});

	it('says the upload key was refused when the store answers 403 not authorized', async () => {
		const { p1, connection } = makeBattle();
		store.forcedStatus = 403;
		store.forcedResponse = 'not authorized';
		const logged = [];
		const monitor = global.Monitor;
		const oldLog = monitor.log;
		monitor.log = text => { logged.push(text); };
		try {
			await Chat.parse('/savereplay', room, p1, connection);
		} finally {
			monitor.log = oldLog;
		}

		const [popup] = popups();
		assert(popup, `no popup was sent; got ${JSON.stringify(sent)}`);
		assert(popup.includes('upload key'), `popup did not mention the upload key: ${popup}`);
		assert(!popup.includes(token), `popup leaked the upload key: ${popup}`);
		assert.equal(room.battle.replaySaved, false, 'a refused upload was recorded as saved');
		assert(
			logged.some(line => line.startsWith('[replay-upload] ') && line.endsWith(' rejected: not authorized')),
			`the store's answer was not logged for an admin: ${JSON.stringify(logged)}`
		);
	});

	it('reports a rejection in words, not as a raw response body', async () => {
		const { p1, connection } = makeBattle();
		store.forcedResponse = 'invalid id';

		await Chat.parse('/savereplay', room, p1, connection);

		const [popup] = popups();
		assert(popup, `no popup was sent; got ${JSON.stringify(sent)}`);
		assert(
			popup.includes("isn't one the replay server will accept"),
			`popup was not the specific 'invalid id' message: ${popup}`
		);
		// The upload did not happen, so a retry has to be possible.
		assert.equal(room.battle.replaySaved, false, 'a failed upload was recorded as saved');
	});

	it('never shows the login server\'s raw JSON error body', async () => {
		const { p1, connection } = makeBattle();
		// Exactly what the login server answers now, `]` guard and all. This is the string the
		// user saw in the bug report.
		store.forcedResponse = ']{"actionerror":"No longer exists; use addreplay."}';

		await Chat.parse('/savereplay', room, p1, connection);

		const [popup] = popups();
		assert(popup, `no popup was sent; got ${JSON.stringify(sent)}`);
		assert(!popup.includes('{"'), `popup contained a raw JSON body: ${popup}`);
		assert(!popup.includes(']{'), `popup contained the JSON-hijacking guard: ${popup}`);
		assert(
			popup.includes('No longer exists; use addreplay.'),
			`popup dropped the reason entirely: ${popup}`
		);
	});

	it('keeps a replay saved for a punishment out of the public listing', async () => {
		const { p1, connection } = makeBattle();

		await Chat.parse('/savereplay forpunishment', room, p1, connection);

		assert.equal(store.requests.length, 1, `store got ${store.requests.length} uploads, expected 1`);
		// This store has no `private` column; a password is the only thing that keeps a replay
		// out of search results, so a not-public save has to carry one.
		assert(
			store.requests[0].password,
			'a replay saved for a punishment was uploaded with no password, so it is publicly listed'
		);
		// 'forpunishment' is silent - the punished user must not get a popup about it.
		assert.equal(popups().length, 0, `a silent save sent a popup: ${JSON.stringify(popups())}`);
	});

	it('survives the replay store being unreachable', async () => {
		const { p1, connection } = makeBattle();
		Config.replayuploadurl = 'http://127.0.0.1:1/action.php';
		try {
			await Chat.parse('/savereplay', room, p1, connection);
		} finally {
			Config.replayuploadurl = storeUrl;
		}

		const [popup] = popups();
		assert(popup, `no popup was sent; got ${JSON.stringify(sent)}`);
		assert(
			popup.includes("could not be saved"),
			`popup did not say the save failed: ${popup}`
		);
		assert.equal(room.battle.replaySaved, false, 'an unreachable store was recorded as saved');
	});
});
