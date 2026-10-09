'use strict';
const assert = require('assert').strict;
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { after, before, describe, it } = require('node:test');

const frontServer = path.resolve(__dirname, '../deploy/phnn-client-server.js');
const md5 = data => crypto.createHash('md5').update(data).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const SETTLE_MS = 4000;
const IMMUTABLE = 'public, max-age=31536000, immutable';
const appJs = Array.from({ length: 3000 }, (_, i) => `window.phnnTest${i} = ${JSON.stringify('value ' + (i * 7919 % 1000))};\n`).join('');
const absJs = 'window.abs = ' + JSON.stringify('x'.repeat(2000)) + ';\n';
const configJs = 'var Config = ' + JSON.stringify({ padding: 'c'.repeat(600) }) + ';\n';
const calcJs = 'window.calc = ' + JSON.stringify('k'.repeat(900)) + ';\n';
const pngBytes = crypto.randomBytes(1200);

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

describe('old and new client routes', () => {
	let child;
	let serverOut = '';
	let baseUrl;
	let staticDir;
	let replaysDir;
	let avatarsRoot;
	let tokenDir;
	let replayToken;

	before(async () => {
		staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phnn-client-routes-'));
		fs.mkdirSync(path.join(staticDir, 'caches'));
		fs.writeFileSync(path.join(staticDir, 'caches/index-old.html'), '<!-- OLD CLIENT -->\n' + [
			'/js/app.js?00000000', '/js/change.js?12345678', '//beta.test/js/abs.js?11111111', '//other.test/js/abs.js?22222222',
			'/config/config.js?33333333', '/config/config-test.js?44444444', '/js/lib/nohash.js',
		].map(src => `<script src="${src}"></script>\n`).join(''));
		for (const [file, data] of [
			['js/app.js', appJs], ['js/change.js', appJs.slice(0, 20000)], ['js/abs.js', absJs], ['js/lib/nohash.js', absJs],
			['config/config.js', configJs], ['config/config-test.js', configJs], ['calc/x.js', calcJs], ['img.png', pngBytes],
		]) {
			fs.mkdirSync(path.dirname(path.join(staticDir, file)), { recursive: true });
			fs.writeFileSync(path.join(staticDir, file), data);
		}
		const fixturesWritten = Date.now();
		fs.writeFileSync(path.join(staticDir, 'caches/index-new.html'), '<!-- NEW CLIENT -->');
		fs.writeFileSync(path.join(staticDir, 'style.css'), 'body{}');
		for (const file of ['testclient-key.php', 'action.php', 'sprites/index.php', 'js/oldclient/clean-cookies.php']) {
			fs.mkdirSync(path.dirname(path.join(staticDir, file)), { recursive: true });
			fs.writeFileSync(path.join(staticDir, file), '<?php PHP SOURCE');
		}
		replaysDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phnn-client-routes-replays-'));
		fs.mkdirSync(staticDir + '-sibling');
		fs.writeFileSync(staticDir + '-sibling/secret.txt', 'SIBLING SECRET');
		avatarsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phnn-client-routes-avatars-'));
		fs.mkdirSync(path.join(avatarsRoot, 'avatars'));
		fs.writeFileSync(path.join(avatarsRoot, 'avatars/a.png'), 'PNG');
		fs.writeFileSync(path.join(avatarsRoot, 'avatars.json'), 'SIBLING SECRET');
		tokenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phnn-client-routes-token-'));
		replayToken = crypto.randomBytes(32).toString('hex');
		fs.writeFileSync(path.join(tokenDir, 'replay-upload-token'), replayToken + '\n', { mode: 0o600 });
		const port = await freePort();
		child = spawn(process.execPath, [frontServer], {
			env: {
				...process.env, PHNN_CLIENT_PORT: String(port), PHNN_GAME_PORT: String(await freePort()), PHNN_STATIC_DIR: staticDir,
				PHNN_REPLAYS_DIR: replaysDir, PHNN_LOGIN_ORIGIN: 'https://127.0.0.1', PHNN_AVATARS_DIR: path.join(avatarsRoot, 'avatars'),
				PHNN_ASSET_SETTLE_MS: String(SETTLE_MS), PHNN_REPLAY_TOKEN_FILE: path.join(tokenDir, 'replay-upload-token'),
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		child.stdout.on('data', chunk => { serverOut += chunk; });
		baseUrl = `http://127.0.0.1:${port}`;
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
			child.on('exit', code => { clearTimeout(timer); reject(new Error(`front server exited with ${code}: ${out}`)); });
		});
		await sleep(Math.max(0, fixturesWritten + SETTLE_MS + 200 - Date.now()));
	});

	after(() => {
		if (child) child.kill('SIGTERM');
		if (staticDir) fs.rmSync(staticDir, { recursive: true, force: true });
		if (staticDir) fs.rmSync(staticDir + '-sibling', { recursive: true, force: true });
		if (avatarsRoot) fs.rmSync(avatarsRoot, { recursive: true, force: true });
		if (replaysDir) fs.rmSync(replaysDir, { recursive: true, force: true });
		if (tokenDir) fs.rmSync(tokenDir, { recursive: true, force: true });
	});

	function request(pathname, { method = 'GET', headers = {}, body } = {}) {
		return new Promise((resolve, reject) => {
			const req = http.request(baseUrl + pathname, { method, headers }, res => {
				let data = '';
				res.setEncoding('utf8');
				res.on('data', chunk => { data += chunk; });
				res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
			});
			req.on('error', reject);
			req.end(body);
		});
	}

	function requestRaw(pathname, { method = 'GET', headers = {} } = {}) {
		return new Promise((resolve, reject) => {
			const req = http.request(baseUrl + pathname, { method, headers }, res => {
				const chunks = [];
				res.on('data', chunk => chunks.push(chunk));
				res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
			});
			req.on('error', reject);
			req.end();
		});
	}

	function decoded(res) {
		const enc = res.headers['content-encoding'];
		return enc === 'br' ? zlib.brotliDecompressSync(res.body) : enc === 'gzip' ? zlib.gunzipSync(res.body) : res.body;
	}

	async function servedIndex(host = 'beta.test') {
		const res = await request('/', { headers: { host } });
		assert.equal(res.status, 200);
		return res.body;
	}

	async function served(pathname, cookie) {
		const res = await fetch(baseUrl + pathname, cookie ? { headers: { cookie } } : undefined);
		const body = await res.text();
		if (body.includes('OLD CLIENT')) return 'old';
		if (body.includes('NEW CLIENT')) return 'new';
		return `${res.status} ${body.slice(0, 40)}`;
	}

	it('serves the old client by default', async () => {
		for (const p of ['/', '/index.html', '/lobby', '/battle-gen9purehackmons-123', '/a/b']) {
			assert.equal(await served(p), 'old', p);
		}
	});

	it('opens the new client at /newclient and upstream\'s other new-client paths', async () => {
		for (const p of ['/newclient', '/beta', '/dm-someone', '/ladder-gen9purehackmons', '/users']) {
			assert.equal(await served(p), 'new', p);
		}
	});

	it('follows the default-client cookie, except at /oldclient', async () => {
		assert.equal(await served('/', 'preactalpha=1'), 'new');
		assert.equal(await served('/lobby', 'foo=bar; preactalpha=1'), 'new');
		assert.equal(await served('/oldclient', 'preactalpha=1'), 'old');
		assert.equal(await served('/', 'preactalpha=0'), 'old');
		assert.equal(await served('/newclient', 'preactalpha=0'), 'new');
	});

	it('serves the built page, not the build source, for index-new.html and index-old.html', async () => {
		fs.writeFileSync(path.join(staticDir, 'index-new.html'), 'RAW NEW SOURCE');
		fs.writeFileSync(path.join(staticDir, 'index-old.html'), 'RAW OLD SOURCE');
		assert.equal(await served('/index-new.html'), 'new');
		assert.equal(await served('/index-old.html'), 'old');
		assert.equal(await served('/index-new.html', 'preactalpha=0'), 'new');
		const res = await request('/index-old.html');
		assert.equal(res.headers['cache-control'], 'no-store');
		assert.ok(!res.body.includes('RAW'));
		const self = path.basename(staticDir);
		for (const encoded of [
			'/%2Findex-new.html', '/js/..%2Findex-new.html', '/js/%2E%2E/index-old.html', '/index-new.html%2F.',
			`/..%2F${self}%2Findex-new.html`, `/js/..%2F..%2F${self}%2Findex-old.html`,
		]) {
			const encodedRes = await request(encoded);
			assert.equal(encodedRes.status, 200, encoded);
			assert.ok(!encodedRes.body.includes('RAW'), encoded);
		}
		assert.equal((await request('/..%2Findex-new.html')).status, 403);
	});

	it('warms the files that were too fresh at start once they have settled', async () => {
		for (let i = 0; i < 100 && (serverOut.match(/\[assets\] warmed/g) || []).length < 2; i++) await sleep(100);
		const warms = [...serverOut.matchAll(/\[assets\] warmed (\d+) files/g)].map(m => Number(m[1]));
		assert.equal(warms.length, 2, serverOut);
		assert.ok(warms[1] > 0, serverOut);
	});

	it('still serves real files as files', async () => {
		const res = await fetch(`${baseUrl}/style.css`);
		assert.equal(res.status, 200);
		assert.equal(await res.text(), 'body{}');
		assert.equal((await fetch(`${baseUrl}/missing.css`)).status, 404);
	});

	const cleanCookiesPath = '/js/oldclient/clean-cookies.php';
	const expire = '=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/';

	it('answers clean-cookies.php itself, with nothing to clean', async () => {
		const res = await request(cleanCookiesPath + '?v=1', { headers: { host: 'beta.hackmons.com', cookie: 'a=b; showdown_username=x' } });
		assert.equal(res.status, 200);
		assert.equal(res.headers['content-type'], 'application/javascript; charset=utf-8');
		assert.equal(res.headers['cache-control'], 'no-store');
		assert.equal(res.headers['set-cookie'], undefined);
		assert.equal(res.body, '');
	});

	it('expires only the cookies over 3000 characters, for our host and its parent domain', async () => {
		const cookie = `small=x; big=${'x'.repeat(3001)}; edge=${'y'.repeat(3000)}`;
		const res = await request(cleanCookiesPath, { headers: { host: 'beta.hackmons.com:443', cookie } });
		assert.equal(res.status, 200);
		assert.deepEqual(res.headers['set-cookie'], [
			'big' + expire,
			'big' + expire + '; Domain=beta.hackmons.com',
			'big' + expire + '; Domain=.beta.hackmons.com',
			'big' + expire + '; Domain=hackmons.com',
			'big' + expire + '; Domain=.hackmons.com',
		]);
		assert.match(res.body, /^alert\("You had a cookie which was too big to handle and had to be deleted\./);
		const ipHost = await request(cleanCookiesPath, { headers: { cookie } });
		assert.deepEqual(ipHost.headers['set-cookie'], ['big' + expire]);
	});

	it('does not reflect a hostile cookie name or Host header', async () => {
		const big = 'z'.repeat(3001);
		const res = await request(cleanCookiesPath, {
			headers: { host: 'evil.test;Domain=attacker.test', cookie: `bad<name>=${big}; a b=${big}; "q"=${big}; x,y=${big}; good=${big}` },
		});
		assert.equal(res.status, 200);
		assert.deepEqual(res.headers['set-cookie'], ['good' + expire]);
	});

	it('answers HEAD for clean-cookies.php', async () => {
		const res = await request(cleanCookiesPath, { method: 'HEAD', headers: { host: 'play.hackmons.com', cookie: `big=${'x'.repeat(3001)}` } });
		assert.equal(res.status, 200);
		assert.equal(res.headers['content-type'], 'application/javascript; charset=utf-8');
		assert.equal(res.headers['set-cookie'].length, 5);
		assert.equal(res.body, '');
	});

	it('never serves PHP source', async () => {
		const cases = [
			['/testclient-key.php'], ['/sprites/index.php'], ['/testclient-key.ph%70'], ['/testclient-key.php%2f%2e'],
			['/testclient-key.php', { headers: { host: 'replay.hackmons.com' } }], [cleanCookiesPath, { method: 'POST' }],
		];
		for (const [p, opts] of cases) {
			const res = await request(p, opts);
			assert.equal(res.status, 404, p);
			assert.equal(res.headers['content-type'], 'text/plain', p);
			assert.ok(!res.body.includes('PHP SOURCE'), p);
		}
	});

	it('still sends /action.php to the login proxy', async () => {
		for (const [p, id] of [['/action.php', 'gen9routetest-1'], ['/~~showdown/action.php', 'gen9routetest-2']]) {
			const res = await request(p, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ act: 'uploadreplay', id, log: '|tier|Route Test', token: replayToken }).toString(),
			});
			assert.equal(res.body, 'success:' + id, p);
			assert.ok(fs.existsSync(path.join(replaysDir, id + '.log')), p);
		}
	});

	it('says at startup that the replay key loaded, without printing it', () => {
		assert.ok(serverOut.includes('replay uploads: key loaded'), serverOut);
		assert.ok(!serverOut.includes(replayToken));
	});

	it('refuses a replay upload without the right key', async () => {
		const wrongKey = crypto.randomBytes(32).toString('hex');
		for (const [label, extra, id] of [
			['no key', {}, 'gen9keytest-1'], ['empty key', { token: '' }, 'gen9keytest-2'],
			['wrong key', { token: wrongKey }, 'gen9keytest-3'], ['short key', { token: replayToken.slice(0, 10) }, 'gen9keytest-4'],
		]) {
			const res = await request('/action.php', {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '198.51.100.21' },
				body: new URLSearchParams({ act: 'uploadreplay', id, log: '|tier|Key Test', ...extra }).toString(),
			});
			assert.equal(res.status, 403, label);
			assert.equal(res.body, 'not authorized', label);
			assert.ok(!fs.existsSync(path.join(replaysDir, id + '.log')), label);
		}
	});

	it('answers a replay upload that is not a POST with 405 and never forwards it', async () => {
		const form = new URLSearchParams({ act: 'uploadreplay', id: 'gen9methodtest-1', log: '|tier|Method Test', token: replayToken }).toString();
		for (const [label, p, opts] of [
			['GET with a body', '/action.php', { method: 'GET', body: form, headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': String(Buffer.byteLength(form)) } }],
			['GET with a query', '/action.php?' + form, { method: 'GET' }],
			['PUT', '/~~showdown/action.php', { method: 'PUT', body: form, headers: { 'content-type': 'application/x-www-form-urlencoded' } }],
			['DELETE', '/action.php?' + form, { method: 'DELETE' }],
		]) {
			const res = await request(p, opts);
			assert.equal(res.status, 405, label);
			assert.equal(res.headers['allow'], 'POST', label);
			assert.equal(res.body, 'method not allowed', label);
		}
		assert.ok(!fs.existsSync(path.join(replaysDir, 'gen9methodtest-1.log')));
	});

	it('never rate-limits uploads that carry the key, only keyless ones', async () => {
		const upload = (id, extra) => request('/action.php', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '198.51.100.22' },
			body: new URLSearchParams({ act: 'uploadreplay', id, log: '|tier|Rate Test', ...extra }).toString(),
		});
		for (let i = 0; i < 35; i++) {
			const res = await upload(`gen9ratetest-${i}`, { token: replayToken });
			assert.equal(res.body, `success:gen9ratetest-${i}`, `keyed upload ${i}`);
		}
		for (let i = 0; i < 30; i++) {
			const res = await upload(`gen9ratetest-nokey-${i}`, {});
			assert.equal(res.status, 403, `keyless upload ${i}`);
			assert.equal(res.body, 'not authorized', `keyless upload ${i}`);
		}
		for (const extra of [{}, { token: 'x'.repeat(64) }]) {
			const res = await upload('gen9ratetest-nokey-last', extra);
			assert.equal(res.status, 429);
			assert.equal(res.body, 'too many uploads');
		}
		const keyed = await upload('gen9ratetest-after', { token: replayToken });
		assert.equal(keyed.body, 'success:gen9ratetest-after');
	});

	it('answers a malformed path or Host header with 400 instead of hanging', async () => {
		for (const [p, headers] of [['/%E0', {}], ['/replays/%E0', {}], ['/', { host: 'a b' }]]) {
			const res = await request(p, { headers });
			assert.equal(res.status, 400, p);
		}
		assert.equal((await request('/%E0', { headers: { host: 'replay.hackmons.com' } })).status, 400);
		assert.equal(await served('/lobby'), 'old');
	});

	it('keeps static files and avatars inside their own directories', async () => {
		const sibling = `/..%2f${path.basename(staticDir)}-sibling/secret.txt`;
		for (const p of [sibling, '/avatars/..%2favatars.json']) {
			const res = await request(p);
			assert.equal(res.status, 403, p);
			assert.ok(!res.body.includes('SIBLING SECRET'), p);
		}
		assert.equal((await request('/avatars/a.png')).body, 'PNG');
	});

	it('does not let a browser or Cloudflare keep a 404', async () => {
		for (const p of ['/data/pokedex-mini.js', '/testclient-key.php']) {
			const res = await request(p);
			assert.equal(res.status, 404, p);
			assert.equal(res.headers['cache-control'], 'no-store', p);
		}
	});

	it('compresses text files with br or gzip, and the bytes decode to the original', async () => {
		for (const [acceptEncoding, expected] of [['gzip, br', 'br'], ['gzip', 'gzip'], ['br;q=0, gzip', 'gzip'], ['', undefined], ['identity', undefined]]) {
			const res = await requestRaw('/js/app.js', { headers: acceptEncoding ? { 'accept-encoding': acceptEncoding } : {} });
			assert.equal(res.status, 200, acceptEncoding);
			assert.equal(res.headers['content-encoding'], expected, acceptEncoding);
			assert.equal(res.headers['vary'], 'Accept-Encoding', acceptEncoding);
			assert.equal(Number(res.headers['content-length']), res.body.length, acceptEncoding);
			assert.equal(res.headers['content-type'], 'text/javascript; charset=utf-8');
			if (expected) assert.ok(res.body.length < appJs.length / 4, `${acceptEncoding}: ${res.body.length}`);
			assert.equal(decoded(res).toString(), appJs, acceptEncoding);
		}
		const png = await requestRaw('/img.png', { headers: { 'accept-encoding': 'gzip, br' } });
		assert.equal(png.headers['content-encoding'], undefined);
		assert.equal(png.headers['vary'], undefined);
		assert.ok(png.body.equals(pngBytes));
	});

	it('rewrites the index page to the hashes of the current files', async () => {
		const page = await servedIndex();
		assert.ok(page.includes(`src="/js/app.js?${md5(appJs).slice(0, 8)}"`), page);
		assert.ok(page.includes(`src="//beta.test/js/abs.js?${md5(absJs).slice(0, 8)}"`), page);
		assert.ok(page.includes('src="//other.test/js/abs.js?22222222"'), page);
		assert.ok(page.includes('src="/js/lib/nohash.js"'), page);
		assert.match(page, /src="\/config\/config\.js\?cb=[a-z0-9]+&33333333"/);
		const local = await servedIndex('127.0.0.1');
		assert.ok(local.includes('src="//beta.test/js/abs.js?11111111"'), local);
	});

	it('makes only an index-page URL with the current content hash immutable', async () => {
		await servedIndex();
		const hash = md5(appJs).slice(0, 8);
		const cacheControl = async (p, host) => (await request(p, host ? { headers: { host } } : {})).headers['cache-control'];
		assert.equal(await cacheControl(`/js/app.js?${hash}`), IMMUTABLE);
		assert.equal(await cacheControl(`/js/abs.js?${md5(absJs).slice(0, 8)}`, 'beta.test'), IMMUTABLE);
		for (const p of [
			'/js/app.js', '/js/app.js?00000000', `/js/app.js?${hash}&x=1`, `/js/app.js?${hash.toUpperCase()}`, `/js/app.js?${md5(appJs).slice(0, 9)}`,
			`/calc/x.js?${md5(calcJs).slice(0, 8)}`, `/config/config.js?${md5(configJs).slice(0, 8)}`, '/config/config.js', '/js/lib/nohash.js',
			`/config/config-test.js?${md5(configJs).slice(0, 8)}`,
			'/img.png', '/avatars/a.png',
		]) {
			const res = await request(p);
			assert.equal(res.status, 200, p);
			assert.equal(res.headers['cache-control'], 'no-store', p);
			assert.match(res.headers['etag'], /^"[0-9a-f]{32}(-br|-gzip)?"$/, p);
			assert.ok(res.headers['last-modified'], p);
		}
	});

	it('answers If-None-Match and If-Modified-Since with 304', async () => {
		const first = await requestRaw('/js/app.js', { headers: { 'accept-encoding': 'gzip, br' } });
		const etag = first.headers['etag'];
		assert.equal(etag, `"${md5(appJs)}-br"`);
		const lastModified = first.headers['last-modified'];
		const cases = [
			[{ 'if-none-match': etag }, 304],
			[{ 'if-none-match': `W/"${md5(appJs)}-br"` }, 304],
			[{ 'if-none-match': `W/"${md5(appJs)}-gzip"` }, 200],
			[{ 'if-none-match': `"${md5(appJs)}"` }, 200],
			[{ 'if-none-match': `"nope", ${etag}` }, 304],
			[{ 'if-none-match': '*' }, 304],
			[{ 'if-none-match': `"${md5(absJs)}-br"` }, 200],
			[{ 'if-modified-since': lastModified }, 304],
			[{ 'if-modified-since': new Date(Date.parse(lastModified) - 3600e3).toUTCString() }, 200],
			[{ 'if-none-match': '"nope"', 'if-modified-since': lastModified }, 200],
		];
		for (const [headers, status] of cases) {
			for (const method of ['GET', 'HEAD']) {
				const res = await requestRaw('/js/app.js', { method, headers: { 'accept-encoding': 'gzip, br', ...headers } });
				assert.equal(res.status, status, `${method} ${JSON.stringify(headers)}`);
				assert.equal(res.headers['etag'], etag, JSON.stringify(headers));
				assert.equal(res.headers['cache-control'], 'no-store');
				assert.equal(res.headers['vary'], 'Accept-Encoding');
				if (status === 304) assert.equal(res.body.length, 0);
			}
		}
		const immutable = `/js/app.js?${md5(appJs).slice(0, 8)}`;
		await servedIndex();
		const revalidated = await requestRaw(immutable, { headers: { 'if-none-match': etag, 'accept-encoding': 'gzip, br' } });
		assert.equal(revalidated.status, 304);
		assert.equal(revalidated.headers['cache-control'], IMMUTABLE);
	});

	it('changes the ETag when a file changes and stops trusting the old hash', async () => {
		const file = path.join(staticDir, 'js/change.js');
		const oldText = fs.readFileSync(file, 'utf8');
		const newText = oldText.replace(/value/g, 'VALUE');
		const oldHash = md5(oldText).slice(0, 8);
		const newHash = md5(newText).slice(0, 8);
		assert.ok((await servedIndex()).includes(`/js/change.js?${oldHash}"`));
		const before = await requestRaw(`/js/change.js?${oldHash}`, { headers: { 'accept-encoding': 'gzip, br' } });
		assert.equal(before.headers['cache-control'], IMMUTABLE);
		assert.equal(before.headers['etag'], `"${md5(oldText)}-br"`);

		fs.writeFileSync(file, newText);
		const fresh = await requestRaw(`/js/change.js?${oldHash}`, { headers: { 'accept-encoding': 'gzip, br', 'if-none-match': before.headers['etag'] } });
		assert.equal(fresh.status, 200);
		assert.equal(fresh.headers['cache-control'], 'no-store');
		assert.equal(fresh.headers['etag'], `"${md5(newText)}"`);
		assert.equal(fresh.headers['content-encoding'], undefined);
		assert.equal(fresh.headers['last-modified'], undefined);
		assert.equal(decoded(fresh).toString(), newText);
		assert.ok((await servedIndex()).includes(`/js/change.js?${newHash}"`));
		assert.equal((await request(`/js/change.js?${newHash}`)).headers['cache-control'], 'no-store');

		await sleep(SETTLE_MS + 200);
		assert.ok((await servedIndex()).includes(`/js/change.js?${newHash}"`));
		const settled = await requestRaw(`/js/change.js?${newHash}`, { headers: { 'accept-encoding': 'gzip, br' } });
		assert.equal(settled.headers['cache-control'], IMMUTABLE);
		assert.equal(settled.headers['etag'], `"${md5(newText)}-br"`);
		assert.equal(decoded(settled).toString(), newText);
		const stale = await requestRaw(`/js/change.js?${oldHash}`, { headers: { 'accept-encoding': 'gzip, br' } });
		assert.equal(stale.headers['cache-control'], 'no-store');
		assert.equal(decoded(stale).toString(), newText);
	});

	it('does not make an uncompressed copy immutable when it is revalidated', async () => {
		const file = path.join(staticDir, 'js/change.js');
		const text = fs.readFileSync(file, 'utf8').replace(/VALUE/g, 'Value');
		const hash = md5(text).slice(0, 8);
		fs.writeFileSync(file, text);
		assert.ok((await servedIndex()).includes(`/js/change.js?${hash}"`));
		const fresh = await requestRaw(`/js/change.js?${hash}`, { headers: { 'accept-encoding': 'gzip, br' } });
		assert.equal(fresh.headers['cache-control'], 'no-store');
		assert.equal(fresh.headers['content-encoding'], undefined);
		assert.equal(fresh.headers['etag'], `"${md5(text)}"`);

		await sleep(SETTLE_MS + 200);
		await servedIndex();
		const headers = { 'accept-encoding': 'gzip, br', 'if-none-match': fresh.headers['etag'] };
		const revalidated = await requestRaw(`/js/change.js?${hash}`, { headers });
		if (revalidated.status === 304) {
			assert.equal(revalidated.headers['cache-control'], 'no-store');
			assert.equal(revalidated.headers['etag'], fresh.headers['etag']);
			await sleep(200);
		}
		const upgraded = await requestRaw(`/js/change.js?${hash}`, { headers });
		assert.equal(upgraded.status, 200);
		assert.equal(upgraded.headers['cache-control'], IMMUTABLE);
		assert.equal(upgraded.headers['content-encoding'], 'br');
		assert.equal(decoded(upgraded).toString(), text);
		const again = await requestRaw(`/js/change.js?${hash}`, { headers: { ...headers, 'if-none-match': upgraded.headers['etag'] } });
		assert.equal(again.status, 304);
		assert.equal(again.headers['cache-control'], IMMUTABLE);
	});

	it('keeps index pages uncached, compressed when asked, and config revalidated', async () => {
		for (const p of ['/', '/newclient', '/lobby']) {
			const res = await requestRaw(p, { headers: { 'accept-encoding': 'gzip, br' } });
			assert.equal(res.status, 200, p);
			assert.equal(res.headers['cache-control'], 'no-store', p);
			assert.equal(res.headers['etag'], undefined, p);
			assert.equal(res.headers['last-modified'], undefined, p);
			assert.equal(res.headers['content-encoding'], 'br', p);
			assert.equal(res.headers['vary'], 'Accept-Encoding', p);
			assert.match(decoded(res).toString(), /(OLD|NEW) CLIENT/, p);
		}
		const plain = await requestRaw('/');
		assert.equal(plain.headers['content-encoding'], undefined);
		assert.ok(plain.body.toString().includes('OLD CLIENT'));
		const config = await requestRaw('/config/config.js?cb=abc&33333333', { headers: { 'accept-encoding': 'gzip, br' } });
		assert.equal(config.headers['cache-control'], 'no-store');
		assert.equal(decoded(config).toString(), configJs);
	});

	it('answers HEAD with the same headers as GET', async () => {
		await servedIndex();
		for (const [p, headers] of [
			['/js/app.js', { 'accept-encoding': 'gzip, br' }], ['/js/app.js', {}], [`/js/app.js?${md5(appJs).slice(0, 8)}`, { 'accept-encoding': 'gzip' }],
			['/img.png', {}], ['/', { 'accept-encoding': 'gzip, br', host: 'beta.test' }], ['/avatars/a.png', {}],
		]) {
			const get = await requestRaw(p, { headers });
			const head = await requestRaw(p, { method: 'HEAD', headers });
			assert.equal(head.status, 200, p);
			assert.equal(head.body.length, 0, p);
			for (const name of ['content-type', 'content-length', 'content-encoding', 'etag', 'last-modified', 'cache-control', 'vary']) {
				assert.equal(head.headers[name], get.headers[name], `${p} ${name}`);
			}
			assert.equal(Number(get.headers['content-length']), get.body.length, p);
		}
	});

	it('still ignores Range and sends the whole file', async () => {
		const res = await requestRaw('/js/app.js', { headers: { range: 'bytes=0-9' } });
		assert.equal(res.status, 200);
		assert.equal(res.headers['content-range'], undefined);
		assert.equal(res.body.toString(), appJs);
	});

	it('ignores an impossible upload time in a replay', async () => {
		const id = 'gen9routetest-3';
		const res = await request('/action.php', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ act: 'uploadreplay', id, log: '|t:|-9000000000000000\n|player|p1|A|1\n|tier|Route Test\n|start', token: replayToken }).toString(),
		});
		assert.equal(res.body, 'success:' + id);
		const list = await request('/replays/');
		assert.equal(list.status, 200);
		assert.ok(list.body.includes(id));
	});
});

describe('replay upload key file', () => {
	let keyDir;
	const started = [];

	before(() => {
		keyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phnn-replay-key-'));
		fs.mkdirSync(path.join(keyDir, 'static'));
	});

	after(() => {
		for (const proc of started) proc.kill('SIGTERM');
		if (keyDir) fs.rmSync(keyDir, { recursive: true, force: true });
	});

	async function startFront(keyFile) {
		const port = await freePort();
		const proc = spawn(process.execPath, [frontServer], {
			env: {
				...process.env, PHNN_CLIENT_PORT: String(port), PHNN_GAME_PORT: String(await freePort()),
				PHNN_STATIC_DIR: path.join(keyDir, 'static'), PHNN_REPLAYS_DIR: path.join(keyDir, 'replays'),
				PHNN_LOGIN_ORIGIN: 'https://127.0.0.1', PHNN_ASSET_WARM: '0', PHNN_REPLAY_TOKEN_FILE: keyFile,
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		started.push(proc);
		const out = await new Promise((resolve, reject) => {
			let text = '';
			const timer = setTimeout(() => reject(new Error(`front server never came up; got: ${text}`)), 30000);
			proc.stdout.on('data', chunk => {
				text += chunk;
				if (/replay uploads: [^\n]*\n/.test(text)) {
					clearTimeout(timer);
					resolve(text);
				}
			});
			proc.on('exit', code => { clearTimeout(timer); reject(new Error(`front server exited with ${code}: ${text}`)); });
		});
		const upload = (id, token) => new Promise((resolve, reject) => {
			const form = new URLSearchParams({ act: 'uploadreplay', id, log: '|tier|Key File Test', token }).toString();
			const req = http.request(`http://127.0.0.1:${port}/action.php`, {
				method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
			}, res => {
				let data = '';
				res.setEncoding('utf8');
				res.on('data', chunk => { data += chunk; });
				res.on('end', () => resolve({ status: res.statusCode, body: data }));
			});
			req.on('error', reject);
			req.end(form);
		});
		const stop = () => new Promise(resolve => {
			if (proc.exitCode !== null) return resolve();
			proc.once('exit', () => resolve());
			proc.kill('SIGTERM');
		});
		return { out, upload, stop };
	}

	function keyIn(keyFile) {
		const key = fs.readFileSync(keyFile, 'utf8').trim();
		assert.match(key, /^[0-9a-f]{64}$/);
		assert.equal(fs.statSync(keyFile).mode & 0o777, 0o600);
		assert.deepEqual(fs.readdirSync(path.dirname(keyFile)), [path.basename(keyFile)]);
		return key;
	}

	it('creates a missing key file, mode 600, and uses it', async () => {
		fs.mkdirSync(path.join(keyDir, 'missing'));
		const keyFile = path.join(keyDir, 'missing', 'replay-upload-token');
		const front = await startFront(keyFile);
		try {
			assert.ok(front.out.includes('replay uploads: key loaded'), front.out);
			const key = keyIn(keyFile);
			assert.ok(!front.out.includes(key));
			assert.equal((await front.upload('gen9keyfiletest-1', key)).body, 'success:gen9keyfiletest-1');
		} finally {
			await front.stop();
		}
	});

	it('replaces an empty key file instead of running without a key', async () => {
		fs.mkdirSync(path.join(keyDir, 'empty'));
		const keyFile = path.join(keyDir, 'empty', 'replay-upload-token');
		fs.writeFileSync(keyFile, ' \n', { mode: 0o600 });
		const front = await startFront(keyFile);
		try {
			assert.ok(front.out.includes('replay uploads: key loaded'), front.out);
			const key = keyIn(keyFile);
			assert.equal((await front.upload('gen9keyfiletest-2', key)).body, 'success:gen9keyfiletest-2');
			assert.equal((await front.upload('gen9keyfiletest-3', '')).status, 403);
		} finally {
			await front.stop();
		}
	});

	it('keeps an existing key across restarts', async () => {
		const keyFile = path.join(keyDir, 'missing', 'replay-upload-token');
		const was = fs.statSync(keyFile);
		const key = fs.readFileSync(keyFile, 'utf8').trim();
		const front = await startFront(keyFile);
		try {
			assert.ok(front.out.includes('replay uploads: key loaded'), front.out);
			assert.equal(fs.readFileSync(keyFile, 'utf8').trim(), key);
			assert.equal(fs.statSync(keyFile).ino, was.ino);
			assert.equal(fs.statSync(keyFile).mtimeMs, was.mtimeMs);
			assert.equal((await front.upload('gen9keyfiletest-4', key)).body, 'success:gen9keyfiletest-4');
		} finally {
			await front.stop();
		}
	});

	it('says replay uploads are disabled when no key can be read or made', async () => {
		const noDirFile = path.join(keyDir, 'nodir', 'replay-upload-token');
		const front = await startFront(noDirFile);
		try {
			assert.ok(front.out.includes(`replay uploads: DISABLED, no readable key at ${noDirFile}`), front.out);
			assert.ok(!fs.existsSync(path.dirname(noDirFile)));
			const res = await front.upload('gen9keyfiletest-5', '');
			assert.equal(res.status, 403);
			assert.equal(res.body, 'not authorized');
		} finally {
			await front.stop();
		}
	});

	it('leaves an unreadable key file alone and says uploads are disabled', { skip: process.getuid && process.getuid() === 0 ? 'root can read any file' : false }, async () => {
		fs.mkdirSync(path.join(keyDir, 'unreadable'));
		const keyFile = path.join(keyDir, 'unreadable', 'replay-upload-token');
		fs.writeFileSync(keyFile, 'a'.repeat(64) + '\n', { mode: 0o600 });
		fs.chmodSync(keyFile, 0o000);
		const was = fs.statSync(keyFile);
		const front = await startFront(keyFile);
		try {
			assert.ok(front.out.includes(`replay uploads: DISABLED, no readable key at ${keyFile}`), front.out);
			const now = fs.statSync(keyFile);
			assert.equal(now.ino, was.ino);
			assert.equal(now.size, was.size);
			assert.equal(now.mtimeMs, was.mtimeMs);
			assert.deepEqual(fs.readdirSync(path.dirname(keyFile)), [path.basename(keyFile)]);
			assert.equal((await front.upload('gen9keyfiletest-6', 'a'.repeat(64))).status, 403);
		} finally {
			await front.stop();
			fs.chmodSync(keyFile, 0o600);
		}
	});
});
