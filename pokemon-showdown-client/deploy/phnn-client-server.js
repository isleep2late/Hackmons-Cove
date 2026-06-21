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
const { URL } = require('url');
const net = require('net');

const PORT = Number(process.env.PHNN_CLIENT_PORT || process.argv[2] || 8099);
const STATIC_DIR = path.resolve(__dirname, process.env.PHNN_STATIC_DIR || '../play.pokemonshowdown.com');
const LOGIN_ORIGIN = process.env.PHNN_LOGIN_ORIGIN || 'https://play.pokemonshowdown.com';
// PHNN custom avatars live in the server repo's config/avatars dir and are
// served at /avatars/ (see resolveAvatar in battle-dex.ts).
const AVATARS_DIR = path.resolve(__dirname, process.env.PHNN_AVATARS_DIR || '../../pokemon-showdown/config/avatars');
const GAME_HOST = process.env.PHNN_GAME_HOST || 'localhost';
const GAME_PORT = Number(process.env.PHNN_GAME_PORT || 8000);
const REPLAYS_DIR = process.env.PHNN_REPLAYS_DIR || path.join('/mnt/hdd2/showdown-replays', path.basename(path.resolve(__dirname, '../..')));

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

function proxyLogin(req, res, reqUrl) {
	const target = new URL(LOGIN_ORIGIN);
	const chunks = [];
	req.on('data', c => chunks.push(c));
	req.on('end', () => {
		const body = Buffer.concat(chunks);
		try {
			const params = new URLSearchParams(body.toString('utf8'));
			if (params.get('act') === 'uploadreplay') { saveReplay(params, res); return; }
		} catch (e) {}
		const headers = {
			'content-type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
			'user-agent': req.headers['user-agent'] || 'phnn-client',
		};
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
			res.writeHead(up.statusCode || 502, { 'content-type': up.headers['content-type'] || 'text/plain' });
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

function serveStatic(req, res, pathname) {
	let rel = decodeURIComponent(pathname);
	// Serve the (built) old-client production page at the site root. caches/index-old.html
	// is produced by `./build` with URLs rewritten to Config.routes.client (play.hackmons.com).
	const isIndex = (rel === '/' || rel === '/index.html');
	if (isIndex) rel = '/caches/index-old.html';
	else if (rel.endsWith('/')) rel += 'index.html';
	const filePath = path.join(STATIC_DIR, rel);
	// prevent path traversal outside STATIC_DIR
	if (!filePath.startsWith(STATIC_DIR)) {
		res.writeHead(403); res.end('forbidden'); return;
	}
	fs.stat(filePath, (err, stat) => {
		if (err || !stat.isFile()) {
			if (!path.extname(rel)) { serveStatic(req, res, '/'); return; }
			res.writeHead(404, { 'content-type': 'text/plain' });
			res.end('404 Not Found');
			return;
		}
		const headers = {
			'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
			'cache-control': 'no-store',
		};
		if (isIndex) {
			fs.readFile(filePath, 'utf8', (e, html) => {
				if (e) { res.writeHead(500); res.end('read error'); return; }
				html = html.replace(/config\/config\.js\?/g, `config/config.js?cb=${START_TOKEN}&`);
				res.writeHead(200, headers);
				res.end(html);
			});
			return;
		}
		res.writeHead(200, headers);
		fs.createReadStream(filePath).pipe(res);
	});
}

function serveAvatar(res, pathname) {
	const name = decodeURIComponent(pathname.slice('/avatars/'.length));
	const filePath = path.join(AVATARS_DIR, name);
	if (!filePath.startsWith(AVATARS_DIR) || !name) {
		res.writeHead(403); res.end('forbidden'); return;
	}
	fs.stat(filePath, (err, stat) => {
		if (err || !stat.isFile()) {
			res.writeHead(404, { 'content-type': 'text/plain' });
			res.end('404 Not Found');
			return;
		}
		res.writeHead(200, {
			'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
			'cache-control': 'no-store',
		});
		fs.createReadStream(filePath).pipe(res);
	});
}

function saveReplay(params, res) {
	const id = (params.get('id') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
	const log = params.get('log') || '';
	if (!id || !log) {
		res.writeHead(200, { 'content-type': 'text/plain' });
		res.end('invalid id');
		return;
	}
	try {
		fs.mkdirSync(REPLAYS_DIR, { recursive: true });
		fs.writeFileSync(path.join(REPLAYS_DIR, id + '.log'), log);
	} catch (err) {
		res.writeHead(200, { 'content-type': 'text/plain' });
		res.end('error: ' + err.message);
		return;
	}
	res.writeHead(200, { 'content-type': 'text/plain' });
	res.end('success:' + id);
}

function serveReplay(req, res, reqUrl) {
	let rel = decodeURIComponent(reqUrl.pathname).slice('/replays'.length).replace(/^\/+/, '');
	let ext = '';
	if (rel.endsWith('.log')) { ext = 'log'; rel = rel.slice(0, -4); }
	else if (rel.endsWith('.json')) { ext = 'json'; rel = rel.slice(0, -5); }
	const id = rel.toLowerCase().replace(/[^a-z0-9-]/g, '');
	if (!id) {
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
		res.end('<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Replays - Hackmons!</title><body style="font-family:Verdana,sans-serif;max-width:640px;margin:40px auto;padding:0 16px"><h2>Hackmons Replays</h2><p>Open a replay using its share link, e.g. <code>/replays/&lt;id&gt;</code>. Add <code>.log</code> or <code>.json</code> to a replay URL to get its raw data.</p></body>');
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
			res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
			res.end(log);
			return;
		}
		if (ext === 'json') {
			res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
			res.end(JSON.stringify({ id, log }));
			return;
		}
		const safeLog = log.replace(/<\//g, '<\\/');
		const html = '<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>Replay - Hackmons!</title></head><body>\n<script type="text/plain" class="battle-log-data">\n' + safeLog + '\n</script>\n<script src="/js/replay-embed.js"></script>\n</body></html>';
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
		res.end(html);
	});
}

const server = http.createServer((req, res) => {
	const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
	if (isLoginPath(reqUrl.pathname)) {
		proxyLogin(req, res, reqUrl);
	} else if (reqUrl.pathname.startsWith('/showdown')) {
		proxyGame(req, res, reqUrl);
	} else if (reqUrl.pathname.startsWith('/avatars/')) {
		serveAvatar(res, reqUrl.pathname);
	} else if (reqUrl.pathname === '/replays' || reqUrl.pathname.startsWith('/replays/')) {
		serveReplay(req, res, reqUrl);
	} else {
		serveStatic(req, res, reqUrl.pathname);
	}
});

// Proxy the game WebSocket (/showdown upgrade) to the local PS server.
server.on('upgrade', (req, socket, head) => {
	const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
	if (!reqUrl.pathname.startsWith('/showdown')) { socket.destroy(); return; }
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
});

server.listen(PORT, () => {
	console.log(`PHNN client server on http://localhost:${PORT}`);
	console.log(`  static dir: ${STATIC_DIR}`);
	console.log(`  login proxy: /action.php -> ${LOGIN_ORIGIN}/action.php`);
	console.log(`  game proxy:  /showdown -> ${GAME_HOST}:${GAME_PORT}`);
	console.log(`  avatars dir: ${AVATARS_DIR} (served at /avatars/)`);
});
