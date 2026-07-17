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
			'access-control-allow-origin': '*',
		};
		if (isIndex) {
			fs.readFile(filePath, 'utf8', (e, html) => {
				if (e) { res.writeHead(500); res.end('read error'); return; }
				html = html.replace(/\/\/localhost\//g, '/');
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
			if (t) meta.uploadtime = t;
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
			res.end(JSON.stringify({ id, log }));
			return;
		}
		if (ext === 'html') {
			res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-disposition': 'attachment; filename="' + id + '.html"', 'cache-control': 'no-store' });
			res.end(replayViewerHtml(id, log, false));
			return;
		}
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
		res.end(replayViewerHtml(id, log, true));
	});
}

const server = http.createServer((req, res) => {
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
	} else if (isLoginPath(reqUrl.pathname)) {
		proxyLogin(req, res, reqUrl);
	} else if (reqUrl.pathname.startsWith('/showdown')) {
		proxyGame(req, res, reqUrl);
	} else if (reqUrl.pathname.startsWith('/avatars/')) {
		serveAvatar(res, reqUrl.pathname);
	} else if (replayHost) {
		const seg = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, '');
		if (!seg || /^[a-z0-9-]+(\.(log|json|html))?$/i.test(seg)) {
			serveReplay(req, res, reqUrl, true);
		} else {
			serveStatic(req, res, reqUrl.pathname);
		}
	} else if (reqUrl.pathname === '/replays' || reqUrl.pathname.startsWith('/replays/')) {
		serveReplay(req, res, reqUrl, false);
	} else {
		serveStatic(req, res, reqUrl.pathname);
	}
});

// Proxy the game WebSocket (/showdown upgrade) to the local PS server.
const MAX_WS_PROXIES = 1000;
let activeWsProxies = 0;
server.on('upgrade', (req, socket, head) => {
	const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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
});
