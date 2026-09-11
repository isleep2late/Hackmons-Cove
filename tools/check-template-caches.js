#!/usr/bin/env node
'use strict';
/*
 * No two compiled client files may declare the same tagged-template cache variable.
 *
 * Babel hoists one `var _templateObject<N>` per tagged template and numbers them from 1 in EVERY
 * file. There is no bundler here: `remove-import-export` strips the module syntax and
 * index-new.html loads the compiled files as plain <script defer> tags, so those declarations all
 * land in one global scope. Two files both declaring `_templateObject` share the cache: whichever
 * runs first fills it, and the other's call site at the same index silently renders the first
 * file's string.
 *
 * Measured before the fix: battle-dex.js, panel-rooms.js, panel-chat-tournament.js and
 * battledata.js each declared _templateObject..._templateObject8, and TL.andList(['p','q'])
 * returned "Language room" - a panel-rooms.js string.
 *
 * build-tools/babel-plugin-scope-template-cache.cjs gives each compiled file its own suffix. This
 * check is what notices if that stops happening - a build config change, a Babel upgrade, or the
 * plugin being dropped in an upstream sync.
 *
 * Usage: node tools/check-template-caches.js [dir-of-compiled-js]...
 * Exit 0 when every cache name belongs to exactly one source file, 1 otherwise.
 */
const fs = require('fs');
const path = require('path');

const DEFAULTS = [
	'pokemon-showdown-client/play.pokemonshowdown.com/js',
	'pokemon-showdown-client/replay.pokemonshowdown.com/js',
];

let failed = 0, filesSeen = 0, namesSeen = 0;
const owners = new Map(); // cache name -> Set of files declaring it

for (const rel of (process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS)) {
	const dir = path.resolve(rel);
	if (!fs.existsSync(dir)) continue;
	for (const entry of fs.readdirSync(dir)) {
		if (!entry.endsWith('.js')) continue;
		const source = fs.readFileSync(path.join(dir, entry), 'utf8');
		// Declarations only: `var _templateObject...`, possibly several to a statement.
		const names = new Set();
		for (const m of source.matchAll(/\bvar\s+((?:_templateObject[0-9]*(?:\$[A-Za-z0-9_]*)?\s*,\s*)*_templateObject[0-9]*(?:\$[A-Za-z0-9_]*)?)/g)) {
			for (const raw of m[1].split(',')) {
				const name = raw.trim();
				if (name) names.add(name);
			}
		}
		if (!names.size) continue;
		filesSeen++;
		for (const name of names) {
			if (!owners.has(name)) owners.set(name, new Set());
			owners.get(name).add(entry);
		}
	}
}

namesSeen = owners.size;
if (!filesSeen) {
	console.log('[FAIL] no compiled files with tagged templates were found - nothing was checked, which is not a pass');
	console.log('       (build the client first: ./build full)');
	process.exit(1);
}

for (const [name, files] of [...owners].sort()) {
	if (files.size > 1) {
		failed++;
		console.log(`[FAIL] ${name} is declared by ${files.size} files: ${[...files].sort().join(', ')}`);
		console.log(`       They share one global slot, so whichever loads first decides what the others render.`);
	}
}

if (failed) {
	console.log(`${failed} colliding cache name(s) across ${filesSeen} file(s)`);
	process.exit(1);
}
console.log(`[PASS] ${namesSeen} template cache name(s) across ${filesSeen} file(s); each belongs to exactly one file`);
process.exit(0);
