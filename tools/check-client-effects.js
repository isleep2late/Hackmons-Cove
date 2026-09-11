#!/usr/bin/env node
'use strict';
/*
 * Every effect id a move animation asks for has to exist in BattleEffects.
 *
 * This is not hypothetical. Upstream renamed the effect `poisonwisp` to `purplewisp`; a partial
 * client sync carried the rename into BattleEffects but not into the move animations, so every
 * animation that asked for the old name got `undefined` back and died on
 *
 *   TypeError: Cannot read properties of undefined (reading 'url')
 *     at BattleScene.showEffect   (data/graphics.js:288)
 *     at Object.anim              (data/graphics.js:25208)   <- spore
 *
 * in the middle of a live battle, spraying a stack trace into the battle log where the animation
 * should have been. It took a user report to find, because nothing in the build fails when the two
 * halves disagree: both files are valid JavaScript on their own, and the mismatch only exists at the
 * moment the move is used.
 *
 * A sync is exactly when this breaks, so this runs against the built bundle rather than the sources -
 * the bundle is what the browser gets, and a source fixed but not rebuilt is the same outage.
 *
 * Usage: node tools/check-client-effects.js [path/to/graphics.js]...
 * Exit 0 when every referenced id is defined, 1 when any is not.
 */
const fs = require('fs');
const path = require('path');

const DEFAULTS = [
	'pokemon-showdown-client/play.pokemonshowdown.com/data/graphics.js',
];

function definedEffects(source) {
	const m = /var BattleEffects\s*=\s*\{/.exec(source);
	if (!m) return null;
	let depth = 1, i = m.index + m[0].length;
	const start = i;
	while (depth > 0 && i < source.length) {
		const ch = source[i];
		if (ch === '{') depth++;
		else if (ch === '}') depth--;
		i++;
	}
	const block = source.slice(start, i);
	const ids = new Set();
	// Top-level keys only: an id sits at the start of the object or straight after a comma.
	for (const match of block.matchAll(/(?:^|,)\s*([A-Za-z0-9_]+)\s*:\s*\{/g)) ids.add(match[1]);
	return ids;
}

function referencedEffects(source) {
	const ids = new Set();
	for (const m of source.matchAll(/showEffect\(\s*'([^']+)'/g)) ids.add(m[1]);
	for (const m of source.matchAll(/showEffect\(\s*"([^"]+)"/g)) ids.add(m[1]);
	return ids;
}

let failed = 0, checked = 0;
const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;
for (const rel of targets) {
	const file = path.resolve(rel);
	if (!fs.existsSync(file)) {
		console.log(`[FAIL] ${rel}: not found - nothing was checked, which is not a pass`);
		failed++;
		continue;
	}
	const source = fs.readFileSync(file, 'utf8');
	const defined = definedEffects(source);
	if (!defined) {
		console.log(`[FAIL] ${rel}: no BattleEffects object found - the shape this check relies on has moved`);
		failed++;
		continue;
	}
	const used = referencedEffects(source);
	if (!used.size) {
		console.log(`[FAIL] ${rel}: no showEffect calls found - the shape this check relies on has moved`);
		failed++;
		continue;
	}
	checked++;
	const missing = [...used].filter(id => !defined.has(id)).sort();
	if (missing.length) {
		failed++;
		console.log(`[FAIL] ${rel}: ${missing.length} effect id(s) animated but never defined in BattleEffects:`);
		for (const id of missing) {
			const where = source.split('\n').findIndex(line => line.includes(`showEffect('${id}'`)) + 1;
			console.log(`         ${id}   (first asked for at line ${where})`);
		}
		console.log(`       Every one of these throws "Cannot read properties of undefined (reading 'url')"`);
		console.log(`       out of BattleScene.showEffect the moment a move that uses it is used.`);
	} else {
		console.log(`[PASS] ${rel}: all ${used.size} animated effect id(s) exist among the ${defined.size} defined`);
	}
}

if (!checked) {
	console.log('NOTHING WAS CHECKED - that is not a pass');
	process.exit(1);
}
console.log(failed ? `${failed} FAILURE(S)` : `OK - ${checked} bundle(s) checked`);
process.exit(failed ? 1 : 0);
