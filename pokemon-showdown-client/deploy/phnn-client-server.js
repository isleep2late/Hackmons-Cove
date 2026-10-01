#!/usr/bin/env node
/**
 * PHNN custom-client front server.
 *
 * Serves the built Pokemon Showdown client (the play.pokemonshowdown.com/ dir)
 * AND reverse-proxies login requests to Smogon's login server. This is what
 * lets us self-host the client at play.hackmons.com while keeping Smogon
 * accounts: the browser talks only to our origin, and we relay /action.php
 * (and /~~<serverid>/action.php) server-to-server to play.pokemonshowdown.com,
 * which has no CORS and won't accept the cross-origin request directly.
 *
 * The game socket (path /showdown) is reverse-proxied to the local PS server
 * on PHNN_GAME_PORT (default 8000), so one hostname serves client + battles.
 *
 * Usage:
 *   node deploy/phnn-client-server.js [port]
 * Env:
 *   PHNN_CLIENT_PORT   listen port (default 8099)
 *   PHNN_STATIC_DIR    dir to serve (default ../play.pokemonshowdown.com)
 *   PHNN_LOGIN_ORIGIN  login server origin (default https://play.pokemonshowdown.com)
 */
'use strict';

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const { URL } = require('url');
const net = require('net');
const phnnTeamgen = require('./phnn-teamgen');

const PORT = Number(process.env.PHNN_CLIENT_PORT || process.argv[2] || 8099);
const STATIC_DIR = path.resolve(__dirname, process.env.PHNN_STATIC_DIR || '../play.pokemonshowdown.com');
// Upstream's replay front-end (built by ./build) lives in its own tree; its js/ is
// served alongside the play client's so the viewer can be loaded from our origin.
const REPLAY_STATIC_DIR = path.resolve(__dirname, process.env.PHNN_REPLAY_STATIC_DIR || '../replay.pokemonshowdown.com');
const BUILT_INDEX = new Map([
	[path.join(STATIC_DIR, 'index-new.html'), '/caches/index-new.html'],
	[path.join(STATIC_DIR, 'index-old.html'), '/caches/index-old.html'],
]);
const LOGIN_ORIGIN = process.env.PHNN_LOGIN_ORIGIN || 'https://play.pokemonshowdown.com';
// PHNN custom avatars live in the server repo's config/avatars dir and are
// served at /avatars/ (see resolveAvatar in battle-dex.ts).
const AVATARS_DIR = path.resolve(__dirname, process.env.PHNN_AVATARS_DIR || '../../pokemon-showdown/config/avatars');
const GAME_HOST = process.env.PHNN_GAME_HOST || 'localhost';
const GAME_PORT = Number(process.env.PHNN_GAME_PORT || 8000);
const REPLAYS_DIR = process.env.PHNN_REPLAYS_DIR || '/mnt/hdd2/showdown-replays';
const OAUTH_HOST = (process.env.PHNN_OAUTH_HOST || 'play.hackmons.com').toLowerCase();

const MIME = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
	'.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
	'.map': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

// A request is a login request if its path ends in /action.php (covers both
// /action.php and the /~~<serverid>/action.php form the client uses).
function isLoginPath(pathname) {
	return pathname === '/action.php' || pathname.endsWith('/action.php');
}

const MAX_LOGIN_BODY = 2 * 1024 * 1024;

function proxyLogin(req, res, reqUrl) {
	const target = new URL(LOGIN_ORIGIN);
	const declared = Number(req.headers['content-length']);
	if (declared && declared > MAX_LOGIN_BODY) {
		res.writeHead(413, { 'content-type': 'text/plain' });
		res.end('payload too large');
		req.destroy();
		return;
	}
	const chunks = [];
	let received = 0;
	let aborted = false;
	req.on('data', c => {
		if (aborted) return;
		received += c.length;
		if (received > MAX_LOGIN_BODY) {
			aborted = true;
			chunks.length = 0;
			res.writeHead(413, { 'content-type': 'text/plain' });
			res.end('payload too large');
			req.destroy();
			return;
		}
		chunks.push(c);
	});
	req.on('end', () => {
		if (aborted) return;
		const body = Buffer.concat(chunks);
		try {
			const params = new URLSearchParams(body.toString('utf8'));
			if (params.get('act') === 'uploadreplay') { saveReplay(params, res, req); return; }
		} catch (e) {}
		const headers = {
			'content-type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
			'user-agent': req.headers['user-agent'] || 'phnn-client',
		};
		// Forward the browser's session cookie so the login server's `upkeep` can
		// recognise a returning user; without this every reload demands a re-login.
		if (req.headers.cookie) headers['cookie'] = req.headers.cookie;
		if (body.length) headers['content-length'] = body.length;
		const upstream = https.request({
			hostname: target.hostname,
			port: 443,
			// Always hit the canonical /action.php upstream regardless of the
			// /~~serverid/ prefix the client used.
			path: '/action.php' + (reqUrl.search || ''),
			method: req.method,
			headers,
		}, up => {
			const outHeaders = { 'content-type': up.headers['content-type'] || 'text/plain' };
			// Relay the login server's session cookie back to the browser, re-scoped to
			// our own origin: the upstream Domain=.pokemonshowdown.com would be rejected
			// for our host, so strip it and let the cookie be host-only.
			const setCookie = up.headers['set-cookie'];
			if (setCookie) {
				outHeaders['set-cookie'] = setCookie.map(cookie => {
					const parts = cookie.split(';').filter(part => !/^\s*domain=/i.test(part));
					const attrs = parts.slice(1).map(part => part.trim().toLowerCase());
					if (!attrs.some(a => a === 'secure')) parts.push(' Secure');
					if (!attrs.some(a => a.startsWith('samesite='))) parts.push(' SameSite=Lax');
					if (!attrs.some(a => a === 'httponly')) parts.push(' HttpOnly');
					return parts.join(';');
				});
			}
			res.writeHead(up.statusCode || 502, outHeaders);
			up.pipe(res);
		});
		upstream.on('error', err => {
			res.writeHead(502, { 'content-type': 'text/plain' });
			res.end('login proxy error: ' + err.message);
		});
		if (body.length) upstream.write(body);
		upstream.end();
	});
}

// Proxy game-server HTTP requests (SockJS /showdown/info, xhr fallbacks) to the local PS server.
function proxyGame(req, res, reqUrl) {
	const upstream = http.request({
		hostname: GAME_HOST,
		port: GAME_PORT,
		path: reqUrl.pathname + (reqUrl.search || ''),
		method: req.method,
		headers: req.headers,
	}, up => {
		res.writeHead(up.statusCode || 502, up.headers);
		up.pipe(res);
	});
	upstream.on('error', err => {
		res.writeHead(502, { 'content-type': 'text/plain' });
		res.end('game proxy error: ' + err.message);
	});
	req.pipe(upstream);
}

// Cache-bust token for config.js; changes each restart so browsers refetch.
const START_TOKEN = Date.now().toString(36);

function indexPageFor(page, cookie) {
	const room = page.replace(/^\/+/, '').replace(/^index\.html$/, '');
	if (room === 'oldclient' || !/^(|[A-Za-z0-9][A-Za-z0-9-]*)$/.test(room)) return '/caches/index-old.html';
	if (/(?:^|;\s*)preactalpha=1(?:;|$)/.test(cookie || '')) return '/caches/index-new.html';
	if (/^(newclient|preactalpha|preactbeta|beta|dev|development|login|users|(dm|challenge|user|viewuser|ladder)-[a-z0-9-]*)$/.test(room)) {
		return '/caches/index-new.html';
	}
	return '/caches/index-old.html';
}

const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.map', '.txt', '.xml', '.md']);
const ASSET_CACHE_MAX = Number(process.env.PHNN_ASSET_CACHE_MB || 256) * 1024 * 1024;
const ASSET_MAX_FILE = 64 * 1024 * 1024;
const ASSET_SETTLE_MS = Number(process.env.PHNN_ASSET_SETTLE_MS) || 2000;
const COMPRESS_WAIT_MS = 1000;
const IMMUTABLE = 'public, max-age=31536000, immutable';
const assetCache = new Map();
const assetLoads = new Map();
const indexAssetPaths = new Set();
let assetCacheBytes = 0;

function statKey(st) {
	return `${st.dev}:${st.ino}:${st.size}:${st.mtimeMs}:${st.ctimeMs}`;
}

function trimAssetCache() {
	for (const [filePath, entry] of assetCache) {
		if (assetCacheBytes <= ASSET_CACHE_MAX) break;
		assetCache.delete(filePath);
		assetCacheBytes -= entry.bytes;
		entry.inCache = false;
	}
}

function addAssetBytes(entry, n) {
	entry.bytes += n;
	if (entry.inCache) { assetCacheBytes += n; trimAssetCache(); }
}

async function readAsset(filePath) {
	const fh = await fs.promises.open(filePath, 'r');
	try {
		const before = await fh.stat();
		const raw = await fh.readFile();
		const after = await fh.stat();
		const key = statKey(before);
		return {
			key, raw, md5: crypto.createHash('md5').update(raw).digest('hex'),
			lastModified: new Date(Math.floor(after.ctimeMs / 1000) * 1000),
			cacheable: key === statKey(after) && raw.length === before.size && Date.now() - after.ctimeMs >= ASSET_SETTLE_MS,
			enc: {}, pending: {}, bytes: raw.length, inCache: false,
		};
	} finally {
		await fh.close();
	}
}

function loadAsset(filePath, st) {
	const key = statKey(st);
	const hit = assetCache.get(filePath);
	if (hit && hit.key === key) {
		assetCache.delete(filePath);
		assetCache.set(filePath, hit);
		return Promise.resolve(hit);
	}
	const loadId = filePath + '\0' + key;
	let loading = assetLoads.get(loadId);
	if (!loading) {
		loading = readAsset(filePath).then(entry => {
			if (entry.cacheable) {
				const old = assetCache.get(filePath);
				if (old) { assetCache.delete(filePath); assetCacheBytes -= old.bytes; old.inCache = false; }
				assetCache.set(filePath, entry);
				entry.inCache = true;
				assetCacheBytes += entry.bytes;
				trimAssetCache();
			}
			return entry;
		}).finally(() => assetLoads.delete(loadId));
		assetLoads.set(loadId, loading);
	}
	return loading;
}

function compressAsset(entry, enc) {
	if (enc in entry.enc) return Promise.resolve(entry.enc[enc]);
	if (!entry.pending[enc]) {
		const raw = entry.raw;
		entry.pending[enc] = new Promise(resolve => {
			const done = (err, out) => {
				const buf = !err && out.length < raw.length ? out : null;
				entry.enc[enc] = buf;
				delete entry.pending[enc];
				if (buf) addAssetBytes(entry, buf.length);
				resolve(buf);
			};
			if (enc === 'br') {
				zlib.brotliCompress(raw, { params: {
					[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
					[zlib.constants.BROTLI_PARAM_QUALITY]: 9,
					[zlib.constants.BROTLI_PARAM_LGWIN]: Math.max(10, Math.min(24, Math.ceil(Math.log2(raw.length + 1)))),
					[zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
				} }, done);
			} else {
				zlib.gzip(raw, { level: 6 }, done);
			}
		});
		entry.pending[enc].startedAt = Date.now();
	}
	return entry.pending[enc];
}

function compressedSoon(entry, enc) {
	if (enc in entry.enc) return Promise.resolve(entry.enc[enc]);
	const pending = compressAsset(entry, enc);
	const wait = pending.startedAt + COMPRESS_WAIT_MS - Date.now();
	if (wait <= 0) return Promise.resolve(null);
	return new Promise(resolve => {
		const timer = setTimeout(resolve, wait, null);
		pending.then(buf => { clearTimeout(timer); resolve(buf); });
	});
}

function acceptedEncoding(header) {
	const weights = {};
	for (const part of String(header || '').toLowerCase().split(',')) {
		const [name, ...params] = part.split(';').map(s => s.trim());
		if (!name) continue;
		const q = params.map(p => /^q=([0-9.]+)$/.exec(p)).find(Boolean);
		weights[name] = q ? Number(q[1]) : 1;
	}
	const ok = enc => (weights[enc] ?? weights['*'] ?? 0) > 0;
	return ok('br') ? 'br' : ok('gzip') ? 'gzip' : null;
}

function heldEncoding(req, entry) {
	if (req.method !== 'GET' && req.method !== 'HEAD') return undefined;
	const inm = req.headers['if-none-match'];
	if (inm !== undefined) {
		for (let tag of inm.split(',')) {
			tag = tag.trim();
			if (tag === '*') return null;
			const match = /^(?:W\/)?"?([0-9a-f]{32})(?:-(br|gzip))?"?$/.exec(tag);
			if (match && match[1] === entry.md5) return match[2] || '';
		}
		return undefined;
	}
	const since = Date.parse(req.headers['if-modified-since'] || '');
	return entry.cacheable && !isNaN(since) && entry.lastModified.getTime() <= since ? null : undefined;
}

function serveFile(req, res, filePath, stat, { search = '', mayBeImmutable = false, cors = true } = {}) {
	const ext = path.extname(filePath);
	const type = MIME[ext] || 'application/octet-stream';
	if (stat.size > ASSET_MAX_FILE) {
		res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', ...(cors ? { 'access-control-allow-origin': '*' } : {}) });
		fs.createReadStream(filePath).pipe(res);
		return;
	}
	loadAsset(filePath, stat).then(async entry => {
		const compressible = COMPRESSIBLE.has(ext);
		const hash = /^\?([0-9a-f]{8})$/.exec(search);
		const immutable = mayBeImmutable && entry.cacheable && hash && entry.md5.startsWith(hash[1]) && indexAssetPaths.has(filePath);
		const headers = { 'cache-control': immutable ? IMMUTABLE : 'no-store' };
		if (cors) headers['access-control-allow-origin'] = '*';
		if (compressible) headers['vary'] = 'Accept-Encoding';
		let enc = compressible && entry.cacheable && entry.raw.length >= 256 ? acceptedEncoding(req.headers['accept-encoding']) : null;
		if (enc && entry.enc[enc] === null) enc = null;
		if (entry.cacheable) headers['last-modified'] = entry.lastModified.toUTCString();
		const held = heldEncoding(req, entry);
		const compressing = held === '' && enc && entry.enc[enc] === undefined;
		if (held === null || held === (enc || '') || compressing) {
			if (compressing) compressAsset(entry, enc);
			if (immutable && held !== 'br' && held !== 'gzip' && enc) headers['cache-control'] = 'no-store';
			headers['etag'] = `"${entry.md5}${held === null ? (enc ? '-' + enc : '') : held ? '-' + held : ''}"`;
			res.writeHead(304, headers);
			res.end();
			return;
		}
		let body = entry.raw;
		if (enc) {
			const encoded = await compressedSoon(entry, enc);
			if (encoded) {
				body = encoded;
			} else {
				if (entry.enc[enc] !== null) headers['cache-control'] = 'no-store';
				enc = null;
			}
		}
		headers['etag'] = `"${entry.md5}${enc ? '-' + enc : ''}"`;
		headers['content-type'] = type;
		if (enc) headers['content-encoding'] = enc;
		headers['content-length'] = body.length;
		res.writeHead(200, headers);
		res.end(body);
	}).catch(() => {
		if (res.headersSent) { res.destroy(); return; }
		res.writeHead(500, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
		res.end('read error');
	});
}

function resolveStaticPath(rel) {
	let baseDir = STATIC_DIR;
	// The replay viewer's own bundles live in the replay tree, not the play client's.
	if (/^\/js\/(replays(-battle|-index)?|utils)\.js(\.map)?$/.test(rel)) baseDir = REPLAY_STATIC_DIR;
	const filePath = path.join(baseDir, rel);
	// prevent path traversal outside STATIC_DIR
	if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) return null;
	return filePath;
}

const CACHEBUSTED_URL = /((?:src|href)=")((?:\/\/([^/"]+))?(\/[^"?#]*))\?[0-9a-f]{8}"/g;

async function refreshCachebusters(html, host) {
	const ownHost = String(host || '').toLowerCase().replace(/:\d+$/, '');
	const isOwn = urlHost => urlHost === undefined || urlHost.toLowerCase() === ownHost;
	const hashes = new Map();
	for (const m of html.matchAll(CACHEBUSTED_URL)) {
		if (isOwn(m[3]) && !hashes.has(m[4])) hashes.set(m[4], null);
	}
	await Promise.all([...hashes.keys()].map(async urlPath => {
		try {
			const filePath = resolveStaticPath(decodeURIComponent(urlPath));
			if (!filePath || /\.php$/i.test(filePath)) return;
			const stat = await fs.promises.stat(filePath);
			if (!stat.isFile() || stat.size > ASSET_MAX_FILE) return;
			const entry = await loadAsset(filePath, stat);
			hashes.set(urlPath, entry.md5.slice(0, 8));
			if (entry.cacheable) indexAssetPaths.add(filePath);
		} catch {}
	}));
	return html.replace(CACHEBUSTED_URL, (all, attr, url, urlHost, urlPath) => {
		const hash = isOwn(urlHost) && hashes.get(urlPath);
		return hash ? `${attr}${url}?${hash}"` : all;
	});
}

function serveIndexPage(req, res, filePath, headers) {
	fs.readFile(filePath, 'utf8', async (e, html) => {
		if (e) { res.writeHead(500); res.end('read error'); return; }
		html = html.replace(/\/\/localhost\//g, '/');
		html = html.replace(/config\/config\.js\?/g, `config/config.js?cb=${START_TOKEN}&`);
		try {
			html = await refreshCachebusters(html, req.headers.host);
		} catch {}
		let body = Buffer.from(html);
		const enc = acceptedEncoding(req.headers['accept-encoding']);
		if (enc === 'br') body = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
		else if (enc === 'gzip') body = zlib.gzipSync(body, { level: 6 });
		res.writeHead(200, { ...headers, 'vary': 'Accept-Encoding', ...(enc ? { 'content-encoding': enc } : {}), 'content-length': body.length });
		res.end(body);
	});
}

async function warmAssets(retry) {
	const urlPaths = retry || new Set(['/showdex/main.js']);
	for (const page of retry ? [] : ['caches/index-old.html', 'caches/index-new.html']) {
		try {
			const html = await fs.promises.readFile(path.join(STATIC_DIR, page), 'utf8');
			for (const m of html.matchAll(/(?:src|href)="(?:\/\/[^/"]+)?(\/[^"?#]+)[?"]/g)) urlPaths.add(m[1]);
		} catch {}
	}
	const started = Date.now();
	const fresh = new Set();
	let count = 0;
	for (const urlPath of urlPaths) {
		try {
			const filePath = resolveStaticPath(decodeURIComponent(urlPath));
			if (!filePath || /\.php$/i.test(filePath)) continue;
			const stat = await fs.promises.stat(filePath);
			if (!stat.isFile() || stat.size > ASSET_MAX_FILE) continue;
			const entry = await loadAsset(filePath, stat);
			if (!entry.cacheable) { fresh.add(urlPath); continue; }
			if (COMPRESSIBLE.has(path.extname(filePath)) && entry.raw.length >= 256) await compressAsset(entry, 'br');
			count++;
		} catch {}
	}
	console.log(`[assets] warmed ${count} files in ${Date.now() - started} ms; cache holds ${(assetCacheBytes / 1048576).toFixed(1)} MB`);
	if (fresh.size && !retry) setTimeout(() => void warmAssets(fresh), ASSET_SETTLE_MS + 500);
}

function serveStatic(req, res, pathname, page, search) {
	let rel = decodeURIComponent(pathname);
	const builtIndex = BUILT_INDEX.get(path.join(STATIC_DIR, rel));
	const isIndex = page !== undefined || rel === '/' || rel === '/index.html' || !!builtIndex;
	if (builtIndex) rel = builtIndex;
	else if (isIndex) rel = indexPageFor(page !== undefined ? page : rel, req.headers.cookie);
	else if (rel.endsWith('/')) rel += 'index.html';
	const filePath = resolveStaticPath(rel);
	if (!filePath) {
		res.writeHead(403); res.end('forbidden'); return;
	}
	if (/\.php$/i.test(filePath)) {
		res.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
		res.end('404 Not Found');
		return;
	}
	fs.stat(filePath, (err, stat) => {
		if (err || !stat.isFile()) {
			if (!path.extname(rel)) { serveStatic(req, res, '/', rel); return; }
			res.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
			res.end('404 Not Found');
			return;
		}
		if (isIndex) {
			serveIndexPage(req, res, filePath, {
				'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
				'cache-control': 'no-store',
				'access-control-allow-origin': '*',
			});
			return;
		}
		serveFile(req, res, filePath, stat, { search, mayBeImmutable: !filePath.startsWith(path.join(STATIC_DIR, 'config') + path.sep) });
	});
}

function cleanCookies(req, res) {
	const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
	const domains = [''];
	if (host.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host)) {
		for (const domain of new Set([host, host.split('.').slice(-2).join('.')])) {
			domains.push('; Domain=' + domain, '; Domain=.' + domain);
		}
	}
	const names = new Set();
	for (const pair of (req.headers.cookie || '').split(';')) {
		const eq = pair.indexOf('=');
		if (eq < 0) continue;
		const name = pair.slice(0, eq).trim();
		if (pair.slice(eq + 1).trim().length > 3000 && /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) names.add(name);
	}
	const setCookie = [];
	for (const name of names) {
		const secure = /^__(?:secure|host)-/i.test(name) ? '; Secure' : '';
		for (const domain of domains) {
			setCookie.push(name + '=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/' + domain + secure);
		}
	}
	const headers = { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' };
	if (setCookie.length) headers['set-cookie'] = setCookie;
	res.writeHead(200, headers);
	res.end(names.size ? 'alert("You had a cookie which was too big to handle and had to be deleted. If you had cookie settings, they may have been deleted.")' : '');
}

function serveAvatar(req, res, pathname) {
	const name = decodeURIComponent(pathname.slice('/avatars/'.length));
	const filePath = path.join(AVATARS_DIR, name);
	if (!filePath.startsWith(AVATARS_DIR + path.sep) || !name) {
		res.writeHead(403); res.end('forbidden'); return;
	}
	fs.stat(filePath, (err, stat) => {
		if (err || !stat.isFile()) {
			res.writeHead(404, { 'content-type': 'text/plain' });
			res.end('404 Not Found');
			return;
		}
		serveFile(req, res, filePath, stat, { cors: false });
	});
}

const MAX_REPLAY_LOG = 1024 * 1024;
const REPLAY_RATE = new Map();
function replayRateOk(ip) {
	const now = Date.now();
	const windowMs = 10 * 60 * 1000;
	const max = 30;
	const rec = REPLAY_RATE.get(ip);
	if (!rec || now - rec.start > windowMs) {
		REPLAY_RATE.set(ip, { start: now, count: 1 });
		if (REPLAY_RATE.size > 5000) {
			for (const [k, v] of REPLAY_RATE) if (now - v.start > windowMs) REPLAY_RATE.delete(k);
		}
		return true;
	}
	rec.count++;
	return rec.count <= max;
}

function saveReplay(params, res, req) {
	const ip = (req && (req.headers['cf-connecting-ip'] || req.socket?.remoteAddress)) || 'unknown';
	if (!replayRateOk(ip)) {
		res.writeHead(429, { 'content-type': 'text/plain' });
		res.end('too many uploads');
		return;
	}
	const id = (params.get('id') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^[a-z0-9]+-(?=gen\d)/, '').slice(0, 60);
	const log = params.get('log') || '';
	const password = (params.get('password') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
	if (!id || !log) {
		res.writeHead(200, { 'content-type': 'text/plain' });
		res.end('invalid id');
		return;
	}
	if (log.length > MAX_REPLAY_LOG) {
		res.writeHead(413, { 'content-type': 'text/plain' });
		res.end('replay too large');
		return;
	}
	const fullid = id + (password ? '-' + password + 'pw' : '');
	const file = path.join(REPLAYS_DIR, fullid + '.log');
	if (!file.startsWith(REPLAYS_DIR)) { res.writeHead(403); res.end('forbidden'); return; }
	try {
		fs.mkdirSync(REPLAYS_DIR, { recursive: true });
		// Exclusive write: never overwrite an existing replay (first writer wins),
		// so an anonymous client cannot clobber someone else's shared replay.
		fs.writeFileSync(file, log, { flag: 'wx' });
		if (!password) fs.rmSync(path.join(REPLAYS_DIR, id + '.log.hidden'), { force: true });
		replayIndex.set(fullid, parseReplayMeta(fullid, log, Date.now()));
	} catch (err) {
		if (err && err.code === 'EEXIST') {
			res.writeHead(200, { 'content-type': 'text/plain' });
			res.end('success:' + fullid);
			return;
		}
		res.writeHead(200, { 'content-type': 'text/plain' });
		res.end('error saving replay');
		return;
	}
	res.writeHead(200, { 'content-type': 'text/plain' });
	res.end('success:' + fullid);
}

function toID(text) {
	return ('' + (text || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const replayIndex = new Map();
let lastIndexScan = 0;

function parseReplayMeta(fullid, logHead, mtimeMs) {
	const meta = {
		id: fullid,
		private: fullid.endsWith('pw'),
		players: [],
		playerIds: [],
		format: '',
		formatid: '',
		rating: null,
		uploadtime: Math.floor(mtimeMs / 1000),
		mtimeMs,
	};
	for (const line of logHead.split('\n').slice(0, 60)) {
		if (line.startsWith('|player|')) {
			const parts = line.split('|');
			if (parts[3]) {
				meta.players.push(parts[3]);
				meta.playerIds.push(toID(parts[3]));
				const rating = Number(parts[5]);
				if (rating && (!meta.rating || rating > meta.rating)) meta.rating = rating;
			}
		} else if (line.startsWith('|tier|')) {
			meta.format = line.slice(6).trim();
			meta.formatid = toID(meta.format);
		} else if (line.startsWith('|t:|') && meta.uploadtime === Math.floor(mtimeMs / 1000)) {
			const t = Number(line.slice(4));
			if (Number.isSafeInteger(t) && t > 0 && t < 1e11) meta.uploadtime = t;
		} else if (line === '|start' || line.startsWith('|turn|')) {
			break;
		}
	}
	if (!meta.format) {
		const m = fullid.match(/^([a-z0-9]+)-\d+/);
		meta.format = m ? m[1] : fullid;
		meta.formatid = toID(meta.format);
	}
	return meta;
}

function refreshReplayIndex() {
	const now = Date.now();
	if (now - lastIndexScan < 10000) return;
	lastIndexScan = now;
	let names;
	try {
		names = fs.readdirSync(REPLAYS_DIR);
	} catch (err) {
		return;
	}
	const seen = new Set();
	for (const name of names) {
		if (!name.endsWith('.log')) continue;
		const fullid = name.slice(0, -4);
		if (!/^[a-z0-9-]+$/.test(fullid)) continue;
		seen.add(fullid);
		let stat;
		try {
			stat = fs.statSync(path.join(REPLAYS_DIR, name));
		} catch (err) {
			continue;
		}
		const cached = replayIndex.get(fullid);
		if (cached && cached.mtimeMs === stat.mtimeMs) continue;
		let head = '';
		try {
			const fd = fs.openSync(path.join(REPLAYS_DIR, name), 'r');
			const buf = Buffer.alloc(4096);
			const n = fs.readSync(fd, buf, 0, 4096, 0);
			fs.closeSync(fd);
			head = buf.toString('utf8', 0, n);
		} catch (err) {
			continue;
		}
		replayIndex.set(fullid, parseReplayMeta(fullid, head, stat.mtimeMs));
	}
	for (const key of replayIndex.keys()) {
		if (!seen.has(key)) replayIndex.delete(key);
	}
}

function searchReplays(userQuery, formatQuery, limit) {
	refreshReplayIndex();
	const users = (userQuery || '').split(',').map(toID).filter(Boolean);
	const format = toID(formatQuery || '');
	const results = [];
	for (const meta of replayIndex.values()) {
		if (meta.private) continue;
		if (users.length && !users.every(u => meta.playerIds.includes(u))) continue;
		if (format && !meta.formatid.includes(format)) continue;
		results.push(meta);
	}
	results.sort((a, b) => b.uploadtime - a.uploadtime);
	return results.slice(0, limit || 51);
}

function escapeHtml(text) {
	return ('' + (text ?? '')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(uploadtime) {
	const s = Math.max(1, Math.floor(Date.now() / 1000) - uploadtime);
	if (s < 3600) return Math.floor(s / 60) + 'm ago';
	if (s < 86400) return Math.floor(s / 3600) + 'h ago';
	if (s < 30 * 86400) return Math.floor(s / 86400) + 'd ago';
	return new Date(uploadtime * 1000).toISOString().slice(0, 10);
}

function replayListHtml(results, base) {
	if (!results.length) return '<p><em>No replays found.</em></p>';
	let buf = '<ul class="linklist">';
	for (const r of results) {
		buf += '<li><a href="' + base + escapeHtml(r.id) + '" class="blocklink">';
		buf += '<small>[' + escapeHtml(r.format) + ']' + (r.rating ? ' <span style="color:#888">(Rating: ' + r.rating + ')</span>' : '') + '<span style="float:right;color:#888">' + timeAgo(r.uploadtime) + '</span></small><br />';
		buf += '<strong>' + escapeHtml(r.players[0] || '?') + '</strong> vs. <strong>' + escapeHtml(r.players[1] || '?') + '</strong>';
		if (r.players.length > 2) buf += ' vs. <strong>' + r.players.slice(2).map(escapeHtml).join('</strong> vs. <strong>') + '</strong>';
		buf += '</a></li>';
	}
	buf += '</ul>';
	return buf;
}

function replayPageShell(title, body) {
	return '<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>' + escapeHtml(title) + '</title><style>'
		+ 'body{font-family:Verdana,Helvetica,Arial,sans-serif;font-size:10pt;background:#f8fbfd;color:#333;margin:0}'
		+ '.mainbody{max-width:720px;margin:0 auto;padding:12px 16px 40px}'
		+ 'h1{font-size:20pt;margin:16px 0 4px}h1 a{color:#333;text-decoration:none}'
		+ 'h2{font-size:13pt;margin:20px 0 8px;color:#456}'
		+ 'label{display:block;margin:8px 0 2px;font-weight:bold}'
		+ 'input[type=text]{padding:4px 6px;font-size:10pt;border:1px solid #aaa;border-radius:3px;width:260px}'
		+ 'button{padding:5px 14px;font-size:10pt;border:1px solid #6688aa;border-radius:4px;background:linear-gradient(to bottom,#fff,#dde7f0);cursor:pointer}'
		+ 'button:hover{background:#dde7f0}'
		+ 'ul.linklist{list-style:none;margin:8px 0;padding:0}'
		+ 'ul.linklist li{margin-bottom:6px}'
		+ 'a.blocklink{display:block;border:1px solid #c4c4c4;border-radius:4px;background:#fff;padding:6px 10px;text-decoration:none;color:#333}'
		+ 'a.blocklink:hover{background:#eef4fa;border-color:#6688aa}'
		+ 'a.blocklink strong{color:#226}'
		+ '.searchbox{border:1px solid #c4c4c4;border-radius:4px;background:#fff;padding:10px 14px 14px}'
		+ 'p.foot{color:#888;font-size:8pt;margin-top:24px}'
		+ '</style></head><body><div class="mainbody">' + body + '</div></body></html>';
}

function replaySearchFormHtml(base, userVal, formatVal) {
	return '<div class="searchbox"><form action="' + base + 'search" method="get">'
		+ '<label>Username: <small style="font-weight:normal">(separate multiple usernames by commas)</small></label>'
		+ '<input type="text" name="user" value="' + escapeHtml(userVal || '') + '" placeholder="(anyone)" /> '
		+ '<label>Format:</label>'
		+ '<input type="text" name="format" value="' + escapeHtml(formatVal || '') + '" placeholder="(any format)" /> '
		+ '<div style="margin-top:10px"><button type="submit">&#128269; Search</button></div>'
		+ '</form></div>';
}

function replayIndexPage(base) {
	const recent = searchReplays('', '', 51);
	let body = '<h1><a href="' + base + '">Hackmons Replays</a></h1>';
	body += '<p>Watch replays of Hackmons Cove battles. Open any replay by its share link: <code>replay.hackmons.com/&lt;id&gt;</code>. Add <code>.log</code> or <code>.json</code> to a replay URL for its raw data, or <code>.html</code> for a standalone copy.</p>';
	body += '<h2>Search replays</h2>' + replaySearchFormHtml(base, '', '');
	body += '<h2>Recent replays</h2>' + replayListHtml(recent.slice(0, 50), base);
	if (recent.length > 50) body += '<p class="foot">Showing the 50 most recent public replays. Use search to find more.</p>';
	return replayPageShell('Replays - Hackmons Cove', body);
}

function replaySearchPage(base, reqUrl) {
	const userVal = reqUrl.searchParams.get('user') || '';
	const formatVal = reqUrl.searchParams.get('format') || '';
	const results = searchReplays(userVal, formatVal, 201);
	if (reqUrl.searchParams.get('json')) {
		return { json: results.slice(0, 200).map(r => ({ id: r.id, format: r.format, players: r.players, uploadtime: r.uploadtime, rating: r.rating })) };
	}
	let body = '<h1><a href="' + base + '">Hackmons Replays</a></h1>';
	body += '<h2>Search replays</h2>' + replaySearchFormHtml(base, userVal, formatVal);
	let heading = 'Results';
	if (userVal) heading = escapeHtml(userVal) + "'s replays";
	if (formatVal) heading += ' [' + escapeHtml(formatVal) + ']';
	body += '<h2>' + heading + '</h2>' + replayListHtml(results.slice(0, 200), base);
	if (results.length > 200) body += '<p class="foot">Showing the first 200 results. Narrow your search to find more.</p>';
	return { html: replayPageShell('Replay search - Hackmons Cove', body) };
}

const EMBED_SRC = process.env.PHNN_REPLAY_EMBED || 'https://play.hackmons.com/js/replay-embed.js';

// Client origin that serves the shared battle engine + data files.
const CLIENT_ORIGIN = process.env.PHNN_CLIENT_ORIGIN || 'https://play.hackmons.com';
const UPSTREAM_REPLAY_SCRIPTS = [
	'/js/lib/preact.min.js',
	'/config/config.js',
	'/js/lib/jquery-1.11.0.min.js',
	'/js/lib/html-sanitizer-minified.js',
	'/js/battle-sound.js',
	'/js/battledata.js',
	'/data/pokedex-mini.js',
	'/data/pokedex-mini-bw.js',
	'/data/graphics.js',
	'/data/pokedex.js',
	'/data/moves.js',
	'/data/abilities.js',
	'/data/items.js',
	'/data/teambuilder-tables.js',
	'/js/battle-tooltips.js',
	'/js/battle.js',
];

const UPSTREAM_REPLAY_STYLE = `	@media (max-width:820px) {
		.battle {
			margin: 0 auto;
		}
		.battle-log {
			margin: 7px auto 0;
			max-width: 640px;
			height: 300px;
			position: static;
		}
	}
	.optgroup {
		display: inline-block;
		line-height: 22px;
		font-size: 10pt;
		vertical-align: top;
	}
	.optgroup .button {
		height: 25px;
		padding-top: 0;
		padding-bottom: 0;
	}
	.optgroup button.button {
		padding-left: 12px;
		padding-right: 12px;
	}
	.linklist {
		list-style: none;
		margin: 0.5em 0;
		padding: 0;
	}
	.linklist li {
		padding: 2px 0;
	}
	.sidebar {
		float: left;
		width: 320px;
	}
	.bar-wrapper {
		max-width: 1100px;
		margin: 0 auto;
	}
	.bar-wrapper.has-sidebar {
		max-width: 1430px;
	}
	.mainbar {
		margin: 0;
		padding-right: 1px;
	}
	.mainbar.has-sidebar {
		margin-left: 330px;
	}
	.bar-wrapper.has-sidebar:not(.short-viewport) .mainbar {
		position: sticky;
		top: 0;
	}
	.bar-wrapper.has-sidebar.short-viewport {
		max-width: none;
	}
	.bar-wrapper.has-sidebar.short-viewport .sidebar {
		box-sizing: border-box;
		position: sticky;
		top: 0;
		max-height: 100vh;
		overflow-y: auto;
	}
	@media (min-width: 1431px) and (max-width: 1510px) {
		.bar-wrapper.has-sidebar.short-viewport .sidebar {
			width: calc(50% - 395px);
			padding-left: calc(50% - 715px);
		}
		.bar-wrapper.has-sidebar.short-viewport .mainbar {
			margin-right: calc(50% - 715px);
			margin-left: calc(50% - 385px);
		}
	}
	@media (min-width: 1511px) {
		.sidebar {
			width: 400px;
		}
		.bar-wrapper.has-sidebar {
			max-width: 1510px;
		}
		.mainbar.has-sidebar {
			margin-left: 410px;
		}
		.bar-wrapper.has-sidebar.short-viewport .sidebar {
			width: calc(50% - 355px);
			padding-left: calc(50% - 755px);
		}
		.bar-wrapper.has-sidebar.short-viewport .mainbar {
			margin-right: calc(50% - 755px);
			margin-left: calc(50% - 345px);
		}
	}
	.section.first-section {
		margin-top: 9px;
	}
	.blocklink small {
		white-space: normal;
	}
	.button {
		vertical-align: middle;
	}
	.replay-controls {
		padding-top: 10px;
	}
	.replay-controls h1 {
		font-size: 16pt;
		font-weight: normal;
		color: #CCC;
	}
	.pagelink {
		text-align: center;
	}
	.pagelink a {
		width: 150px;
	}
	.textbox, .button {
		font-size: 11pt;
		vertical-align: middle;
	}
	@media (max-width: 450px) {
		.button {
			font-size: 9pt;
		}
	}
`;

const PHNN_REPLAY_STYLE = `
	.replay-controls button, .replay-controls select { font-family: Verdana, sans-serif; font-size: 10pt; }
	.replay-controls h1 { color: #222; }
	.dark .replay-controls h1 { color: #CCC; }
	@media (max-width: 656px) {
		html, body { margin: 0; padding: 0; }
	}
`;

const PHNN_REPLAY_NAV_GUARD = '<script>\n' +
	'document.addEventListener("click", function (e) {\n' +
	'\tvar el = e.target;\n' +
	'\twhile (el && el.tagName !== "A") el = el.parentNode;\n' +
	'\tif (!el || !el.getAttribute("href")) return;\n' +
	'\tvar url; try { url = new URL(el.href, location.href); } catch (err) { return; }\n' +
	'\tvar base = location.pathname.slice(0, location.pathname.lastIndexOf("/") + 1);\n' +
	'\tif (url.origin === location.origin && url.pathname === base) e.stopPropagation();\n' +
	'}, true);\n' +
	'<\/script>\n';


function upstreamReplayHtml(id, log, meta) {
	const title = meta && meta.players && meta.players.length ?
		escapeHtml(meta.players.join(' vs. ')) + ' - Hackmons Cove Replay' : 'Hackmons Cove Replay';
	let out = '<!DOCTYPE html>\n<html><head>\n';
	out += '<meta charset="utf-8" />\n';
	out += '<meta name="viewport" content="width=device-width, initial-scale=1" />\n';
	out += '<title>' + title + '</title>\n';
	for (const href of ['/style/font-awesome.css', '/style/battle.css', '/style/utilichart.css']) {
		out += '<link rel="stylesheet" href="' + CLIENT_ORIGIN + href + '" />\n';
	}
	out += '<style>\n' + UPSTREAM_REPLAY_STYLE + PHNN_REPLAY_STYLE + '</style>\n';
	out += '</head><body>\n';
	out += '<div id="main" class="main"></div>\n';
	// The viewer only takes the inline path when replaydata-<id> exists; it reads the JSON from
	// there and the log from replaylog-<id>, unescaping '<\\/' back to '</'.
	const inlineData = {
		id, players: meta.players, format: meta.format, formatid: meta.formatid,
		rating: meta.rating, uploadtime: meta.uploadtime, private: meta.private ? 1 : 0,
	};
	out += '<script type="text/plain" class="data" id="replaydata-' + escapeHtml(id) + '">\n';
	out += JSON.stringify(inlineData).replace(/<\//g, '<\\/') + '\n';
	out += '<\/script>\n';
	out += '<script type="text/plain" class="log" id="replaylog-' + escapeHtml(id) + '">\n';
	out += log.replace(/<\//g, '<\\/') + '\n';
	out += '<\/script>\n';
	for (const src of UPSTREAM_REPLAY_SCRIPTS) {
		out += '<script defer src="' + CLIENT_ORIGIN + src + '"><\/script>\n';
	}
	out += '<script defer src="/js/utils.js"><\/script>\n';
	out += '<script defer src="/js/replays-battle.js"><\/script>\n';
	out += '<script defer src="/js/replays.js"><\/script>\n';
	out += PHNN_REPLAY_NAV_GUARD;
	out += '</body></html>\n';
	return out;
}

function replayViewerHtml(id, log, downloadBar) {
	const safeLog = log.replace(/<\//g, '<\\/');
	const bar = downloadBar
		? '<div style="max-width:1180px;margin:10px auto 0;padding:0 12px;font-family:Verdana,Helvetica,Arial,sans-serif;font-size:10pt;text-align:right"><a href="' + id + '.html" download="' + id + '.html" style="margin-right:14px">Download replay</a><a href="' + id + '.log" download="' + id + '.log">Download .log</a></div>\n'
		: '';
	return '<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>' + id + ' - Hackmons Replay</title></head><body>\n'
		+ bar
		+ '<input type="hidden" name="replayid" value="' + id + '" />\n'
		+ '<script type="text/plain" class="battle-log-data">\n' + safeLog + '\n</script>\n'
		+ '<script src="' + EMBED_SRC + '"></script>\n</body></html>';
}

function serveReplay(req, res, reqUrl, root) {
	let rel = decodeURIComponent(reqUrl.pathname);
	rel = (root ? rel : rel.slice('/replays'.length)).replace(/^\/+/, '');
	let ext = '';
	if (rel.endsWith('.log')) { ext = 'log'; rel = rel.slice(0, -4); }
	else if (rel.endsWith('.json')) { ext = 'json'; rel = rel.slice(0, -5); }
	else if (rel.endsWith('.html')) { ext = 'html'; rel = rel.slice(0, -5); }
	const id = rel.toLowerCase().replace(/[^a-z0-9-]/g, '');
	const base = root ? '/' : '/replays/';
	if (!id) {
		refreshReplayIndex();
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
		res.end(replayIndexPage(base));
		return;
	}
	if (id === 'search') {
		const result = replaySearchPage(base, reqUrl);
		if (result.json) {
			res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
			res.end(JSON.stringify(result.json));
		} else {
			res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
			res.end(result.html);
		}
		return;
	}
	const file = path.join(REPLAYS_DIR, id + '.log');
	if (!file.startsWith(REPLAYS_DIR)) { res.writeHead(403); res.end('forbidden'); return; }
	fs.readFile(file, 'utf8', (err, log) => {
		if (err) {
			res.writeHead(404, { 'content-type': 'text/plain' });
			res.end('Replay not found.');
			return;
		}
		if (ext === 'log') {
			res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': 'attachment; filename="' + id + '.log"', 'cache-control': 'no-store' });
			res.end(log);
			return;
		}
		if (ext === 'json') {
			res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
			refreshReplayIndex();
			const meta = replayIndex.get(id) || parseReplayMeta(id, log, Date.now());
			const password = id.endsWith('pw') ? (id.match(/-([a-z0-9]+)pw$/) || [])[1] || '' : '';
			// Our stored id already carries the -<password>pw suffix, but the viewer
			// rebuilds the share id from bare id + password, so hand it the bare id.
			const bareId = password ? id.slice(0, -(password.length + 3)) : id;
			res.end(JSON.stringify({
				id: bareId,
				log,
				players: meta.players,
				format: meta.format,
				formatid: meta.formatid,
				rating: meta.rating,
				uploadtime: meta.uploadtime,
				private: meta.private ? 1 : 0,
				password,
			}));
			return;
		}
		if (ext === 'html') {
			res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-disposition': 'attachment; filename="' + id + '.html"', 'cache-control': 'no-store' });
			res.end(replayViewerHtml(id, log, false));
			return;
		}
		refreshReplayIndex();
		const meta = replayIndex.get(id) || parseReplayMeta(id, log, Date.now());
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
		res.end(upstreamReplayHtml(id, log, meta));
	});
}

const TEAMGEN_RATE = new Map();
let teamgenActive = 0;
function teamgenRateOk(ip) {
	const now = Date.now();
	const windowMs = 10 * 60 * 1000;
	const max = 60;
	const rec = TEAMGEN_RATE.get(ip);
	if (!rec || now - rec.start > windowMs) {
		TEAMGEN_RATE.set(ip, { start: now, count: 1 });
		if (TEAMGEN_RATE.size > 5000) {
			for (const [k, v] of TEAMGEN_RATE) if (now - v.start > windowMs) TEAMGEN_RATE.delete(k);
		}
		return true;
	}
	rec.count++;
	return rec.count <= max;
}

function serveTeamgen(req, res, reqUrl) {
	const ip = req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '';
	const sendJson = (code, obj) => {
		res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
		res.end(JSON.stringify(obj));
	};
	if (!teamgenRateOk(ip)) return sendJson(429, { error: 'Too many team requests; try again in a few minutes.' });
	if (teamgenActive >= 4) return sendJson(429, { error: 'The team generator is busy; try again in a moment.' });
	const format = (reqUrl.searchParams.get('format') || '').slice(0, 300);
	if (!format) return sendJson(400, { error: 'No format given.' });
	teamgenActive++;
	setImmediate(() => {
		let out;
		try {
			out = phnnTeamgen.generateTeam(format);
		} catch (e) {
			out = { error: 'Internal team generator error.' };
		}
		teamgenActive--;
		sendJson(200, out);
	});
}

function handleRequest(req, res) {
	const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
	const host = (req.headers.host || '').toLowerCase().split(':')[0];
	const replayHost = host.startsWith('replay.');
	if (reqUrl.pathname === '/oauth.html' && host !== OAUTH_HOST) {
		res.writeHead(404, { 'content-type': 'text/plain' });
		res.end('404 Not Found');
		return;
	}
	if (reqUrl.pathname === '/calc') {
		// Damage calculator lives at /calc/ (static dir play.pokemonshowdown.com/calc)
		res.writeHead(301, { location: '/calc/' + (reqUrl.search || '') });
		res.end();
	} else if (reqUrl.pathname === '/js/oldclient/clean-cookies.php' && (req.method === 'GET' || req.method === 'HEAD')) {
		cleanCookies(req, res);
	} else if (isLoginPath(reqUrl.pathname)) {
		proxyLogin(req, res, reqUrl);
	} else if (reqUrl.pathname.startsWith('/showdown')) {
		proxyGame(req, res, reqUrl);
	} else if (reqUrl.pathname.startsWith('/avatars/')) {
		serveAvatar(req, res, reqUrl.pathname);
	} else if (replayHost) {
		const seg = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, '');
		if (!seg || /^[a-z0-9-]+(\.(log|json|html))?$/i.test(seg)) {
			serveReplay(req, res, reqUrl, true);
		} else {
			serveStatic(req, res, reqUrl.pathname, undefined, reqUrl.search);
		}
	} else if (reqUrl.pathname === '/replays' || reqUrl.pathname.startsWith('/replays/')) {
		serveReplay(req, res, reqUrl, false);
	} else if (reqUrl.pathname === '/teamgen') {
		serveTeamgen(req, res, reqUrl);
	} else {
		serveStatic(req, res, reqUrl.pathname, undefined, reqUrl.search);
	}
}

const server = http.createServer((req, res) => {
	try {
		handleRequest(req, res);
	} catch (err) {
		const badInput = err instanceof URIError || ['ERR_INVALID_URL', 'ERR_INVALID_ARG_VALUE', 'ERR_INVALID_ARG_TYPE'].includes(err && err.code);
		if (!badInput) console.error('[request]', req.method, req.url, err && err.message);
		if (res.headersSent) { res.destroy(); return; }
		res.writeHead(badInput ? 400 : 500, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
		res.end(badInput ? '400 Bad Request' : '500 Internal Server Error');
	}
});

// Proxy the game WebSocket (/showdown upgrade) to the local PS server.
const MAX_WS_PROXIES = 1000;
let activeWsProxies = 0;
server.on('upgrade', (req, socket, head) => {
	let reqUrl;
	try {
		reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
	} catch {
		socket.destroy();
		return;
	}
	if (!reqUrl.pathname.startsWith('/showdown')) { socket.destroy(); return; }
	if (activeWsProxies >= MAX_WS_PROXIES) { socket.destroy(); return; }
	activeWsProxies++;
	let released = false;
	const release = () => { if (!released) { released = true; activeWsProxies--; } };
	const upstream = net.connect(GAME_PORT, GAME_HOST, () => {
		let reqLine = `${req.method} ${req.url} HTTP/1.1\r\n`;
		for (let i = 0; i < req.rawHeaders.length; i += 2) {
			reqLine += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
		}
		upstream.write(reqLine + '\r\n');
		if (head && head.length) upstream.write(head);
		upstream.pipe(socket);
		socket.pipe(upstream);
	});
	upstream.on('error', () => socket.destroy());
	socket.on('error', () => upstream.destroy());
	upstream.on('close', release);
	socket.on('close', release);
});

// Never let an unexpected error crash the process. A crash would drop the
// Cloudflare tunnel and could expose the origin, and a printed stack trace can
// leak internal paths; log and keep serving instead.
process.on('uncaughtException', err => {
	console.error('[uncaughtException]', err && err.message);
});
process.on('unhandledRejection', err => {
	console.error('[unhandledRejection]', err && (err.message || err));
});

server.listen(PORT, '127.0.0.1', () => {
	console.log(`PHNN client server on http://localhost:${PORT}`);
	console.log(`  static dir: ${STATIC_DIR}`);
	console.log(`  login proxy: /action.php -> ${LOGIN_ORIGIN}/action.php`);
	console.log(`  game proxy:  /showdown -> ${GAME_HOST}:${GAME_PORT}`);
	console.log(`  avatars dir: ${AVATARS_DIR} (served at /avatars/)`);
	if (process.env.PHNN_ASSET_WARM !== '0') warmAssets();
});
