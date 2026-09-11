#!/usr/bin/env node
'use strict';
/*
 * Every generated set must be able to damage every type it can meet, using content its own
 * generation actually has.
 *
 * This is not hypothetical. A user was handed a Pure Hackmons set whose only offensive move was
 * Moongeist Beam. Moongeist Beam is Ghost, Ghost does zero to Normal, and the set had nothing else
 * that dealt damage - so against a Normal-type body that Pokemon could not move the HP bar at all,
 * no matter how the battle went. Moongeist Beam's party trick is that it ignores abilities, which is
 * exactly the wrong tool: a type immunity is not an ability, so ignoring abilities does nothing
 * about it. The generator's only damage check was "at least one move is not a Status move", which
 * that set passed.
 *
 * Two properties are checked, per SET, on generated teams:
 *
 *   COVERAGE   For every defending type T that legal bodies in this format actually carry, the set
 *              has at least one damaging move that is not zeroed by T. Mono-T is the check, because
 *              a second type can only add immunities, never remove one - so a set that cannot hit
 *              mono-T cannot hit anything carrying T either.
 *
 *   ERA        Every move, ability and item on the set exists in the format's own generation.
 *              Availability is read from the dex (`.gen`, `.isNonstandard === 'Future'`), never from
 *              a list in this file, so a sync that moves content between generations moves the check
 *              with it.
 *
 * The defending-type list is also read from the dex, by counting legal bodies per type in the
 * format. That is what keeps this correct per generation without a table: Gen 1 has no Steel, Dark
 * or Fairy bodies to meet, so it is not asked to hit them.
 *
 * The generator is random, so the seed is pinned: Math.random and crypto.getRandomValues (which is
 * what PRNG.generateSeed inside the sim draws from) are both replaced with one seeded stream. Same
 * seed, same teams, every run - a failure found here can be reproduced exactly.
 *
 * SCOPE: the default format list is the Hackmons family in Gens 6-9, which is where the generator
 * writes the movesets itself. Gens 1-2 and the non-Hackmons ladders are not in the default list and
 * do not hold the property - they ship upstream random-battle sets and mined Smogon sets verbatim.
 * Pass --formats to look at them; the residue is real and is documented next to the fix in
 * pokemon-showdown-client/deploy/phnn-teamgen.js.
 *
 * Usage: node tools/check-teamgen-coverage.js [--teams=N] [--seed=S] [--formats=id,id] [--verbose]
 * Exit 0 when every set in every generated team holds both properties, 1 when any does not.
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PS_DIR = process.env.PHNN_PS_DIR || path.join(ROOT, 'pokemon-showdown');
const TEAMGEN = process.env.PHNN_TEAMGEN ||
	path.join(ROOT, 'pokemon-showdown-client', 'deploy', 'phnn-teamgen.js');

// gens 6-9 across every shape of Hackmons format this fork serves: the plain ladders, the
// ability-restricted ones, the cup generators, the 255-EV variants and the alt metas.
// Hackmons Cup is not here because you cannot bring a team to it at all - the server rolls one, and
// the validator answers "This format doesn't let you use your own team", so there is nothing to
// check. [Gen 9 Champions] Pure Hackmons IS here now. It used to be excluded because that format
// caps Stat Points and the generator did not know the rule existed, so it failed to produce a team
// 100% of the time; the generator reads the cap off the format's own rule table now, so the format
// is held to the same properties as every other one.
const DEFAULT_FORMATS = [
	'gen6purehackmons', 'gen7purehackmons', 'gen8purehackmons', 'gen9purehackmons',
	'gen9championspurehackmons',
	'gen6balancedhackmons', 'gen7balancedhackmons', 'gen8balancedhackmons', 'gen9balancedhackmons',
	'gen6255purehackmons', 'gen7255purehackmons', 'gen8255purehackmons', 'gen9255purehackmons',
	'gen6disguises', 'gen7disguises', 'gen8disguises', 'gen9disguises',
	'gen6statuses', 'gen7statuses', 'gen8statuses', 'gen9statuses',
	'gen9nationaldexpurehackmons', 'gen9wondroushackmons', 'gen8wondroushackmons',
	'gen9nonerfsstandard', 'gen9nonerfsextended',
	'gen6customgame', 'gen7customgame', 'gen8customgame', 'gen9customgame',
	'gen6customdisguises', 'gen7customdisguises', 'gen8customdisguises', 'gen9customdisguises',
];

// a defending type is worth checking once this many legal bodies in the format carry it; below that
// it is a curiosity (Gen 1 has three Ghosts) rather than something a ladder set has to answer
const MIN_BODIES_PER_TYPE = 3;

// The generator used to give up on a format entirely often enough to need a budget: it picked a body
// or a move the validator then refused, re-rolled the same way twenty times, and returned an error
// instead of a team. Measured over 8 seeds x 825 teams that was 33/6562 = 0.50%, and this constant
// was 0.02 so the pre-existing flake did not fail a run it was not about.
//
// It is zero now, and zero is the point. The generator no longer probes move legality with a fixed
// body it does not intend to use, and a failed attempt teaches the next one what the validator just
// refused, so a systematically-illegal choice cannot burn all twenty attempts any more. Measured at
// 0/11050 teams over 13 seeds (20260910, 1, 2, 3, 5, 7, 11, 99, 12345, 424242, 20250101, 20260101,
// 31337) x 850 teams with the format list above, against 28/850 for the same seed before it. A team
// that never gets built cannot be checked for anything else in this file either, so there is no
// budget for one: any regression that brings the failures back trips this immediately.
const GEN_ERROR_CEILING = 0;

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
	const hit = args.find(a => a.startsWith(`--${name}=`));
	return hit === undefined ? fallback : hit.slice(name.length + 3);
};
const TEAMS_PER_FORMAT = Number(argOf('teams', 15));
const SEED = Number(argOf('seed', 20260910));
const VERBOSE = args.includes('--verbose');
const FORMATS = argOf('formats', '') ? argOf('formats', '').split(',').filter(Boolean) : DEFAULT_FORMATS;

/* ---------- deterministic RNG, installed before the generator is loaded ---------- */

// mulberry32: one 32-bit state, uniform enough for shuffling and good enough that the same seed
// always produces the same teams, which is the only property this needs
function mulberry32(a) {
	let s = a >>> 0;
	return function () {
		s = (s + 0x6D2B79F5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const rng = mulberry32(SEED);
Math.random = rng;
// the sim seeds its own PRNG from PRNG.generateSeed -> SodiumRNG.generateSeed -> crypto.getRandomValues,
// which Math.random does not reach. Without this the random-battle half of a team is unseeded.
if (typeof globalThis.crypto === 'undefined') globalThis.crypto = require('node:crypto').webcrypto;
const realGetRandomValues = globalThis.crypto.getRandomValues;
try {
	Object.defineProperty(globalThis.crypto, 'getRandomValues', {
		configurable: true, writable: true,
		value: function (arr) {
			for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(rng() * 4294967296);
			return arr;
		},
	});
} catch (e) {
	console.log(`[FAIL] cannot seed crypto.getRandomValues (${e.message}) - results would be flaky`);
	process.exit(1);
}
void realGetRandomValues;

const { Dex, Teams } = require(path.join(PS_DIR, 'dist', 'sim'));
const { TeamValidator } = require(path.join(PS_DIR, 'dist', 'sim', 'team-validator'));
const { generateTeam } = require(TEAMGEN);

const toId = text => ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');

/* ---------- what the format is made of, read from the dex ---------- */

const formatInfoCache = new Map();
function formatInfo(formatid) {
	if (formatInfoCache.has(formatid)) return formatInfoCache.get(formatid);
	const validator = TeamValidator.get(formatid);
	const fdex = Dex.forFormat(validator.format);
	const ruleTable = Dex.formats.getRuleTable(validator.format);
	const counts = new Map();
	for (const sp of fdex.species.all()) {
		if (!sp.exists || !sp.baseStats) continue;
		if (sp.isNonstandard && sp.isNonstandard !== 'Past' && sp.isNonstandard !== 'Unobtainable') continue;
		if (ruleTable.check('pokemon:' + sp.id) === 'banned') continue;
		if (ruleTable.check('basepokemon:' + toId(sp.baseSpecies)) === 'banned') continue;
		for (const t of sp.types) counts.set(t, (counts.get(t) || 0) + 1);
	}
	const defendingTypes = [...counts.entries()]
		.filter(([, n]) => n >= MIN_BODIES_PER_TYPE)
		.map(([t]) => t)
		.sort();
	const info = { fdex, ruleTable, defendingTypes };
	formatInfoCache.set(formatid, info);
	return info;
}

/* ---------- immunity model ---------- */

// A move skips the defender's type immunity when its own data says so (Thousand Arrows carries
// `ignoreImmunity: {Ground: true}`), or when an ability on the set widens that field - Scrappy and
// Mind's Eye do it in onModifyMove. Rather than list those abilities, run the handler the dex ships
// against a probe move and read back what it set, so a new one is picked up for free.
const abilityOverrideCache = new Map();
function abilityIgnoreImmunity(fdex, abilityName, moveType) {
	const key = `${fdex.currentMod}|${toId(abilityName)}|${moveType}`;
	if (abilityOverrideCache.has(key)) return abilityOverrideCache.get(key);
	let out = null;
	const ability = fdex.abilities.get(abilityName);
	if (ability.exists && typeof ability.onModifyMove === 'function') {
		const probe = { type: moveType, category: 'Physical', id: 'probe', basePower: 60 };
		try {
			ability.onModifyMove.call({}, probe, {}, {});
			out = probe.ignoreImmunity === undefined ? null : probe.ignoreImmunity;
		} catch (e) {
			out = null; // handler needed a real battle; treat it as adding nothing
		}
	}
	abilityOverrideCache.set(key, out);
	return out;
}

function damagingMoves(fdex, set) {
	const out = [];
	for (const name of set.moves || []) {
		const mv = fdex.moves.get(('' + name).split(' (')[0]);
		if (!mv.exists || mv.category === 'Status') continue;
		out.push(mv);
	}
	return out;
}

function moveCanDamage(fdex, set, mv, defType) {
	let ignore = mv.ignoreImmunity;
	if (ignore === undefined || ignore === null || ignore === false) {
		ignore = abilityIgnoreImmunity(fdex, set.ability || '', mv.type);
	}
	if (ignore === true) return true;
	if (ignore && typeof ignore === 'object' && ignore[mv.type]) return true;
	return fdex.getImmunity(mv.type, defType);
}

/* ---------- the two properties ---------- */

function checkCoverage(info, set) {
	const { fdex, defendingTypes } = info;
	const moves = damagingMoves(fdex, set);
	if (!moves.length) return { ok: false, walls: ['(no damaging move at all)'] };
	const walls = defendingTypes.filter(t => !moves.some(mv => moveCanDamage(fdex, set, mv, t)));
	return { ok: !walls.length, walls };
}

function checkEra(info, set) {
	const { fdex } = info;
	const bad = [];
	// `.gen` is the whole test. isNonstandard === 'Future' is NOT usable here: this fork invents
	// content of its own (Nihil Light and friends) and marks it Future so it stays out of the vanilla
	// ladders, while un-dexiting it at the validator for the formats that want it. A mod dex already
	// reports a later-generation move with its real gen - Moongeist Beam is gen 7 in the gen 6 dex -
	// so the gen comparison catches the real thing without catching the fork's own moves.
	const era = thing => thing.gen > fdex.gen;
	for (const name of set.moves || []) {
		const mv = fdex.moves.get(('' + name).split(' (')[0]);
		if (!mv.exists) bad.push(`move ${name} does not exist`);
		else if (era(mv)) bad.push(`move ${mv.name} is Gen ${mv.gen}, format is Gen ${fdex.gen}`);
	}
	if (set.ability && toId(set.ability) !== 'noability') {
		const ab = fdex.abilities.get(set.ability);
		if (!ab.exists) bad.push(`ability ${set.ability} does not exist`);
		else if (era(ab)) bad.push(`ability ${ab.name} is Gen ${ab.gen}, format is Gen ${fdex.gen}`);
	}
	if (set.item) {
		const it = fdex.items.get(set.item);
		if (!it.exists) bad.push(`item ${set.item} does not exist`);
		else if (era(it)) bad.push(`item ${it.name} is Gen ${it.gen}, format is Gen ${fdex.gen}`);
	}
	return { ok: !bad.length, bad };
}

/* ---------- a check on the check ---------- */

// The two properties are enforced in different places, and one of them has no natural RED left to
// point at: nothing in gens 6-9 currently makes the generator emit an out-of-era move, because
// moveAllowed and the team validator both refuse it, so the ERA half above would pass whether or not
// it still worked. These fixtures are its failure mode. Each one is a set built by hand with a known
// answer; if the checker stops giving that answer, this exits 1 the same as a real failure would.
const SELFTEST = [
	// the reported bug, stated directly: Ghost is all it has, and Ghost does nothing to Normal
	{ f: 'gen9purehackmons', why: 'Moongeist Beam alone', expect: 'walled',
		set: { species: 'Giratina', ability: 'Levitate', item: 'Leftovers', moves: ['Moongeist Beam', 'Recover', 'Taunt', 'Substitute'] } },
	{ f: 'gen9purehackmons', why: 'three Ghost attacks is still one type', expect: 'walled',
		set: { species: 'Giratina', ability: 'Levitate', item: 'Leftovers', moves: ['Shadow Ball', 'Astral Barrage', 'Poltergeist', 'Recover'] } },
	{ f: 'gen9purehackmons', why: 'Ground does nothing to Flying', expect: 'walled',
		set: { species: 'Groudon', ability: 'Drought', item: 'Leftovers', moves: ['Earthquake', 'Earth Power', 'Recover', 'Taunt'] } },
	{ f: 'gen9purehackmons', why: 'Electric does nothing to Ground', expect: 'walled',
		set: { species: 'Regieleki', ability: 'Transistor', item: 'Leftovers', moves: ['Thunderbolt', 'Wild Charge', 'Recover', 'Taunt'] } },
	{ f: 'gen9purehackmons', why: 'Normal does nothing to Ghost', expect: 'walled',
		set: { species: 'Snorlax', ability: 'Thick Fat', item: 'Leftovers', moves: ['Extreme Speed', 'Boomburst', 'Recover', 'Taunt'] } },
	{ f: 'gen9purehackmons', why: 'no damaging move at all', expect: 'walled',
		set: { species: 'Blissey', ability: 'Natural Cure', item: 'Leftovers', moves: ['Recover', 'Taunt', 'Spore', 'Substitute'] } },
	{ f: 'gen9purehackmons', why: 'Ghost plus Normal covers the whole chart', expect: 'clear',
		set: { species: 'Giratina', ability: 'Levitate', item: 'Leftovers', moves: ['Moongeist Beam', 'Boomburst', 'Recover', 'Taunt'] } },
	// Thousand Arrows carries ignoreImmunity for its own type, so Ground-only is fine on this one set
	{ f: 'gen9purehackmons', why: 'Thousand Arrows ignores the Flying immunity', expect: 'clear',
		set: { species: 'Zygarde', ability: 'Aura Break', item: 'Leftovers', moves: ['Thousand Arrows', 'Earth Power', 'Recover', 'Taunt'] } },
	// Scrappy widens ignoreImmunity in onModifyMove; the checker learns that by running the handler
	{ f: 'gen9purehackmons', why: 'Scrappy lets Normal through to Ghost', expect: 'clear',
		set: { species: 'Snorlax', ability: 'Scrappy', item: 'Leftovers', moves: ['Extreme Speed', 'Boomburst', 'Recover', 'Taunt'] } },
	// era: content from after the format's generation
	{ f: 'gen6purehackmons', why: 'Moongeist Beam is Gen 7', expect: 'out-of-era',
		set: { species: 'Giratina', ability: 'Levitate', item: 'Leftovers', moves: ['Moongeist Beam', 'Boomburst', 'Recover', 'Taunt'] } },
	{ f: 'gen6purehackmons', why: 'Good as Gold is Gen 9', expect: 'out-of-era',
		set: { species: 'Giratina', ability: 'Good as Gold', item: 'Leftovers', moves: ['Shadow Ball', 'Boomburst', 'Recover', 'Taunt'] } },
	{ f: 'gen6purehackmons', why: 'Booster Energy is Gen 9', expect: 'out-of-era',
		set: { species: 'Giratina', ability: 'Levitate', item: 'Booster Energy', moves: ['Shadow Ball', 'Boomburst', 'Recover', 'Taunt'] } },
	{ f: 'gen6purehackmons', why: 'Mold Breaker is Gen 4 and belongs here', expect: 'in-era',
		set: { species: 'Giratina', ability: 'Mold Breaker', item: 'Leftovers', moves: ['Shadow Ball', 'Boomburst', 'Recover', 'Taunt'] } },
	// the fork's own moves are flagged Future so they stay off the vanilla ladders; that is not an
	// era violation in a Gen 9 format, and reading isNonstandard instead of .gen would call it one
	{ f: 'gen9nonerfsextended', why: "the fork's own Gen 9 move is not out of era", expect: 'in-era',
		set: { species: 'Terapagos-Stellar', ability: 'Tera Shell', item: 'Leftovers', moves: ['Nihil Light', 'Boomburst', 'Recover', 'Taunt'] } },
];

function runSelftest() {
	let bad = 0;
	for (const t of SELFTEST) {
		let got;
		try {
			const info = formatInfo(t.f);
			got = t.expect === 'walled' || t.expect === 'clear' ?
				(checkCoverage(info, t.set).ok ? 'clear' : 'walled') :
				(checkEra(info, t.set).ok ? 'in-era' : 'out-of-era');
		} catch (e) {
			got = `threw: ${e.message}`;
		}
		const ok = got === t.expect;
		if (!ok) bad++;
		console.log(`  [${ok ? 'ok' : 'BAD'}] ${t.f}: ${t.why} -> expected ${t.expect}, got ${got}`);
	}
	return bad;
}

console.log(`--- self-test: ${SELFTEST.length} hand-built sets with known answers ---`);
const selftestBad = runSelftest();
console.log(selftestBad ?
	`  ${selftestBad} SELF-TEST FAILURE(S) - the checker itself is broken, nothing below can be trusted` :
	`  all ${SELFTEST.length} hand-built sets answered as expected`);
console.log('');

/* ---------- run ---------- */

const failures = [];
const genFailures = [];
let setsChecked = 0;
let teamsChecked = 0;
let teamsAttempted = 0;

for (const formatid of FORMATS) {
	let info;
	try {
		info = formatInfo(formatid);
	} catch (e) {
		console.log(`[SKIP] ${formatid}: ${e.message}`);
		continue;
	}
	let fmtSets = 0, fmtFails = 0;
	for (let i = 0; i < TEAMS_PER_FORMAT; i++) {
		teamsAttempted++;
		let res;
		try {
			res = generateTeam(formatid);
		} catch (e) {
			genFailures.push({ formatid, team: i, set: '(generator threw)', why: [e.message] });
			continue;
		}
		if (res.error) {
			// A team that was never built has no sets to check, and that is a DIFFERENT defect from
			// the one this file is about - the generator picking a body or move the validator then
			// refuses, and giving up after MAX_ATTEMPTS. It is counted and printed, and it trips the
			// run once it stops being the rare flake it currently is (see GEN_ERROR_CEILING).
			genFailures.push({ formatid, team: i, set: '(no team produced)', why: [res.error] });
			continue;
		}
		teamsChecked++;
		let sets;
		try {
			sets = Teams.unpack(res.team) || [];
		} catch (e) {
			failures.push({ formatid, team: i, set: '(unpack failed)', why: [e.message] });
			continue;
		}
		for (const set of sets) {
			setsChecked++;
			fmtSets++;
			const why = [];
			const cov = checkCoverage(info, set);
			if (!cov.ok) {
				const shown = (set.moves || []).join(', ') || '(none)';
				why.push(`walled by ${cov.walls.join('/')} - moves: ${shown}`);
			}
			const era = checkEra(info, set);
			if (!era.ok) why.push(...era.bad);
			if (why.length) {
				fmtFails++;
				failures.push({ formatid, team: i, set: set.species || set.name, why });
			}
		}
	}
	// a format that produced no sets at all checked nothing, which is not a pass
	if (!fmtSets) {
		console.log(`[FAIL] ${formatid}: produced no sets in ${TEAMS_PER_FORMAT} attempts - nothing was checked`);
		continue;
	}
	const label = fmtFails ? 'FAIL' : 'PASS';
	console.log(`[${label}] ${formatid}: ${fmtSets - fmtFails}/${fmtSets} sets hold ` +
		`(${info.defendingTypes.length} defending types: ${info.defendingTypes.join(' ')})`);
}

const report = (title, list) => {
	if (!list.length) return;
	console.log('');
	console.log(`--- ${title} ---`);
	const shown = VERBOSE ? list : list.slice(0, 40);
	for (const f of shown) {
		console.log(`  ${f.formatid} team#${f.team} ${f.set}`);
		for (const w of f.why) console.log(`      ${w}`);
	}
	if (shown.length < list.length) console.log(`  ... ${list.length - shown.length} more (use --verbose)`);
};
report(`${failures.length} failing set(s)`, failures);
report(`${genFailures.length} team(s) the generator could not build (separate defect)`, genFailures);

console.log('');
if (!setsChecked) {
	console.log('NOTHING WAS CHECKED - that is not a pass');
	process.exit(1);
}
const genRate = teamsAttempted ? genFailures.length / teamsAttempted : 0;
console.log(`seed=${SEED} teams/format=${TEAMS_PER_FORMAT} formats=${FORMATS.length} ` +
	`teams=${teamsChecked} sets=${setsChecked} self-test-failures=${selftestBad} ` +
	`generator-errors=${genFailures.length}/${teamsAttempted} (${(genRate * 100).toFixed(2)}%)`);
const genOverBudget = genRate > GEN_ERROR_CEILING;
if (genFailures.length && !genOverBudget) {
	console.log(`  (generator errors are under the ${(GEN_ERROR_CEILING * 100).toFixed(0)}% ceiling, ` +
		`so they do not fail this run - they are a pre-existing defect of their own)`);
}
if (genOverBudget) {
	console.log(`  GENERATOR ERROR RATE ${(genRate * 100).toFixed(2)}% IS OVER THE ` +
		`${(GEN_ERROR_CEILING * 100).toFixed(0)}% CEILING - teams that never get built cannot be checked`);
}
const total = failures.length + selftestBad + (genOverBudget ? 1 : 0);
console.log(total ? `${total} FAILURE(S)` : `OK - ${setsChecked} sets checked`);
process.exit(total ? 1 : 0);
