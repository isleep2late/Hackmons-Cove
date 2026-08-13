'use strict';

const path = require('path');

const PS_DIR = process.env.PHNN_PS_DIR || path.resolve(__dirname, '..', '..', 'pokemon-showdown');

const CD_UNIVERSAL_ABILITIES = [
	'Magic Guard', 'Unaware', 'Multiscale', 'Regenerator', 'Speed Boost', 'Magic Bounce', 'Levitate',
	'Good as Gold', 'Comatose', 'Wonder Guard', 'Flash Fire', 'Prankster',
];
const CD_OFFENSE_ABILITIES = {
	physical: ['Huge Power', 'Pure Power', 'Parental Bond', 'Adaptability', 'No Guard', 'Scrappy', 'Mold Breaker', 'Libero', 'Tough Claws'],
	special: ['Hadron Engine', 'Parental Bond', 'Adaptability', 'Beads of Ruin', 'No Guard', 'Libero', 'Tinted Lens'],
	defensive: ['Fur Coat', 'Ice Scales', 'Poison Heal', 'Arena Trap', 'Shadow Tag'],
};
const CD_ITEM_STACKS = {
	physical: { main: 'Choice Band', extras: ['Life Orb', 'Expert Belt', 'Muscle Band', 'Focus Sash', 'Heavy-Duty Boots', 'Leftovers'] },
	special: { main: 'Choice Specs', extras: ['Life Orb', 'Expert Belt', 'Wise Glasses', 'Focus Sash', 'Heavy-Duty Boots', 'Leftovers'] },
	defensive: { main: 'Leftovers', extras: ['Rocky Helmet', 'Heavy-Duty Boots', 'Covert Cloak', 'Safety Goggles', 'Focus Sash'] },
};
const FILLER_ITEMS = [
	'Leftovers', 'Life Orb', 'Choice Band', 'Choice Specs', 'Choice Scarf', 'Heavy-Duty Boots',
	'Assault Vest', 'Rocky Helmet', 'Sitrus Berry', 'Focus Sash', 'Expert Belt', 'Muscle Band',
	'Wise Glasses', 'Lum Berry', 'Light Clay', 'Mental Herb', 'Safety Goggles', 'Covert Cloak',
];
const HM_STAB = {
	Normal: { physical: ['Extreme Speed', 'Double-Edge', 'Return'], special: ['Boomburst', 'Hyper Voice'] },
	Fire: { physical: ['V-create', 'Sacred Fire', 'Flare Blitz'], special: ['Blue Flare', 'Fusion Flare', 'Fire Blast'] },
	Water: { physical: ['Surging Strikes', 'Crabhammer', 'Liquidation', 'Waterfall'], special: ['Steam Eruption', 'Origin Pulse', 'Hydro Pump'] },
	Electric: { physical: ['Bolt Strike', 'Fusion Bolt', 'Wild Charge'], special: ['Electro Drift', 'Thunderbolt'] },
	Grass: { physical: ['Wood Hammer', 'Power Whip', 'Seed Bomb'], special: ['Seed Flare', 'Leaf Storm', 'Giga Drain'] },
	Ice: { physical: ['Glacial Lance', 'Icicle Crash', 'Ice Punch'], special: ['Ice Beam', 'Freeze-Dry', 'Blizzard'] },
	Fighting: { physical: ['Close Combat', 'Sacred Sword', 'Drain Punch', 'Superpower'], special: ['Secret Sword', 'Aura Sphere', 'Focus Blast'] },
	Poison: { physical: ['Gunk Shot', 'Poison Jab'], special: ['Malignant Chain', 'Sludge Bomb'] },
	Ground: { physical: ['Thousand Arrows', 'Precipice Blades', 'Headlong Rush', 'Earthquake'], special: ['Earth Power'] },
	Flying: { physical: ['Dragon Ascent', 'Brave Bird', 'Drill Peck'], special: ['Oblivion Wing', 'Aeroblast', 'Hurricane', 'Air Slash'] },
	Psychic: { physical: ['Photon Geyser', 'Psychic Fangs', 'Zen Headbutt'], special: ['Photon Geyser', 'Psystrike', 'Psycho Boost', 'Psychic'] },
	Bug: { physical: ['Megahorn', 'First Impression', 'Leech Life'], special: ['Bug Buzz'] },
	Rock: { physical: ['Diamond Storm', 'Mighty Cleave', 'Stone Edge', 'Rock Slide'], special: ['Power Gem', 'Ancient Power'] },
	Ghost: { physical: ['Spectral Thief', 'Poltergeist', 'Shadow Claw'], special: ['Astral Barrage', 'Moongeist Beam', 'Shadow Ball'] },
	Dragon: { physical: ['Glaive Rush', 'Dragon Darts', 'Outrage', 'Dragon Claw'], special: ['Core Enforcer', 'Draco Meteor', 'Dragon Energy', 'Dragon Pulse'] },
	Dark: { physical: ['Wicked Blow', 'Knock Off', 'Sucker Punch', 'Crunch'], special: ['Fiery Wrath', 'Dark Pulse'] },
	Steel: { physical: ['Sunsteel Strike', 'Behemoth Blade', 'Gigaton Hammer', 'Iron Head', 'Meteor Mash'], special: ['Make It Rain', 'Steel Beam', 'Flash Cannon'] },
	Fairy: { physical: ['Play Rough'], special: ['Moonblast', 'Fleur Cannon', 'Dazzling Gleam'] },
};
const HM_COVERAGE = {
	physical: ['Thousand Arrows', 'V-create', 'Wicked Blow', 'Glacial Lance', 'Close Combat', 'Earthquake'],
	special: ['Astral Barrage', 'Blue Flare', 'Moongeist Beam', 'Earth Power', 'Moonblast', 'Ice Beam'],
};
const HM_SETUP = {
	physical: ['Shell Smash', 'Victory Dance', 'Swords Dance', 'Dragon Dance'],
	special: ['Quiver Dance', 'Tail Glow', 'Nasty Plot', 'Calm Mind'],
};
const HM_UTILITY = ['Spore', 'Strength Sap', 'Recover', 'Extreme Speed', 'Sucker Punch', 'Knock Off', 'U-turn', 'Substitute', 'Taunt'];
const HM_OHKO = ['Sheer Cold', 'Fissure', 'Horn Drill', 'Guillotine'];
const HM_WALL_MOVES = [
	['Strength Sap', 'Recover', 'Roost', 'Soft-Boiled', 'Slack Off', 'Moonlight'],
	['Spore', 'Nuzzle', 'Will-O-Wisp', 'Toxic', 'Thunder Wave'],
	['Stealth Rock', 'Spikes', 'Toxic Spikes'],
	['Core Enforcer', 'U-turn', 'Whirlwind', 'Haze', 'Knock Off', 'Seismic Toss'],
];
const HM_PREMIUM_ABILITIES = ['Wonder Guard', 'Neutralizing Gas', 'Magic Guard', 'Huge Power', 'Pure Power', 'Parental Bond', 'Shadow Tag', 'Prankster', 'Unaware', 'Fur Coat', 'Ice Scales', 'Good as Gold'];
const META_ABILITIES = {
	physical: ['Huge Power', 'Pure Power', 'Parental Bond', 'No Guard', 'Scrappy', 'Mold Breaker', 'Libero'],
	special: ['Hadron Engine', 'Parental Bond', 'No Guard', 'Beads of Ruin', 'Libero', 'Drought', 'Drizzle'],
	ate: ['Pixilate', 'Refrigerate'],
	defensive: ['Magic Guard', 'Magic Bounce', 'Wonder Guard', 'Good as Gold', 'Comatose', 'Ice Face', 'Flash Fire', 'Innards Out'],
	utility: ['Speed Boost', 'Neutralizing Gas', 'Shadow Tag', 'Arena Trap', 'Sand Stream', 'Psychic Surge', 'Misty Surge'],
};
const HACKMONS_HINTS = [
	'hackmons', 'customgame', 'customdisguise', 'disguises', 'statuses', 'nonerfs',
	'metronome', 'infinite', 'brokencup', '350cup', 'anyability', 'nolimit', 'bh',
];
const MAX_ATTEMPTS = 20;

let sim = null;
function loadSim() {
	if (!sim) {
		const { Dex, Teams } = require(path.join(PS_DIR, 'dist', 'sim'));
		const { TeamValidator } = require(path.join(PS_DIR, 'dist', 'sim', 'team-validator'));
		sim = { Dex, Teams, TeamValidator };
	}
	return sim;
}

function toId(text) {
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const generatorCache = new Map();
function hasGenerator(formatid) {
	if (generatorCache.has(formatid)) return generatorCache.get(formatid);
	const { Dex, Teams } = loadSim();
	let ok = false;
	try {
		if (Dex.formats.get(formatid).exists || /^gen9/.test(formatid)) {
			ok = (Teams.generate(formatid) || []).length > 0;
		}
	} catch (e) {
		ok = false;
	}
	generatorCache.set(formatid, ok);
	return ok;
}

function genOf(baseid, format) {
	const fromMod = /^gen(\d+)/.exec(format.mod || '');
	if (fromMod) return +fromMod[1];
	const fromId = /^gen(\d+)/.exec(baseid);
	return fromId ? +fromId[1] : 9;
}

function isHackmonsTarget(baseid) {
	return HACKMONS_HINTS.some(h => baseid.includes(h));
}

function wantsDoubles(baseid, format) {
	if (format.gameType && format.gameType !== 'singles') return true;
	return baseid.includes('doubles') || baseid.includes('vgc') || baseid.includes('freeforall') || baseid.includes('multi');
}

function sourceFor(baseid, format) {
	const gen = genOf(baseid, format);
	const cands = [];
	if (baseid.includes('letsgo')) cands.push('gen7letsgorandombattle');
	if (baseid.includes('bdsp')) cands.push('gen8bdsprandombattle');
	if (baseid.includes('champions')) cands.push('gen9championspurehackmons');
	const hackmons = isHackmonsTarget(baseid);
	if (!hackmons) {
		if (wantsDoubles(baseid, format)) cands.push(`gen${gen}randomdoublesbattle`);
		for (let g = gen; g >= 1; g--) cands.push(`gen${g}randombattle`);
	}
	for (let g = gen; g >= 1; g--) cands.push(`gen${g}purehackmons`);
	for (let g = gen; g >= 1; g--) cands.push(`gen${g}hackmonscup`);
	return cands.find(hasGenerator) || null;
}

function setRole(set) {
	const { Dex } = loadSim();
	const species = Dex.species.get(set.species);
	if (!species.exists) return 'physical';
	const bs = species.baseStats;
	const bulk = bs.hp + bs.def + bs.spd;
	const off = Math.max(bs.atk, bs.spa);
	if (bulk >= 340 && off < 115) return 'defensive';
	return bs.atk >= bs.spa ? 'physical' : 'special';
}

function moveAllowed(name, fdex, ruleTable) {
	const move = fdex.moves.get(name);
	if (!move.exists || move.gen > fdex.gen || move.isNonstandard) return false;
	if (move.status === 'slp' && (ruleTable.has('sleepmovesclause') || ruleTable.has('sleepclause'))) return false;
	if (ruleTable.check('move:' + toId(name)) === 'banned') return false;
	return true;
}

function pickMove(cands, fdex, ruleTable, used, variety) {
	const legal = [];
	for (const name of cands) {
		if (used.has(toId(name))) continue;
		if (!moveAllowed(name, fdex, ruleTable)) continue;
		legal.push(name);
		if (legal.length >= (variety || 1) + 1) break;
	}
	if (!legal.length) return null;
	if (!variety || legal.length === 1) return legal[0];
	return legal[Math.floor(Math.random() * Math.min(legal.length, variety))];
}

function bstOf(species) {
	const bs = species.baseStats;
	return bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
}

const speciesPoolCache = new Map();
function speciesPool(fdex, ruleTable, fullid) {
	if (speciesPoolCache.has(fullid)) return speciesPoolCache.get(fullid);
	const pool = [];
	for (const species of fdex.species.all()) {
		if (!species.exists || !species.baseStats) continue;
		if (species.isNonstandard && species.isNonstandard !== 'Past' && species.isNonstandard !== 'Unobtainable') continue;
		if (ruleTable.check('pokemon:' + species.id) === 'banned') continue;
		if (ruleTable.check('basepokemon:' + toId(species.baseSpecies)) === 'banned') continue;
		pool.push({ species, bst: bstOf(species) });
	}
	pool.sort((a, b) => b.bst - a.bst);
	const spice = pool.filter(e => /(-Shadow\b|Shadow-|-Totem\b|-Gmax\b|-Alpha\b|-Titan\b)/.test(e.species.name) || /Shadow$/.test(e.species.name));
	const result = { pool, spice };
	speciesPoolCache.set(fullid, result);
	return result;
}

function probeSpecies(cand, validator) {
	const probe = {
		species: cand.species.name, ability: cand.species.abilities['0'] || 'No Ability',
		moves: ['Tackle'], evs: {}, ivs: {}, level: undefined, nature: 'Serious',
	};
	let problems = null;
	try {
		problems = validator.validateSet(JSON.parse(JSON.stringify(probe)), {});
	} catch (e) {
		return false;
	}
	if (problems && problems.length && problems.some(p => /does not exist|isn't obtainable|is banned|only allowed|must be|not allowed|roster/i.test(p))) return false;
	return true;
}

function sampleSpecies(pools, validator, teamSize, allowDupes) {
	const { pool, spice } = pools;
	const chosen = [];
	const baseCounts = new Map();
	const take = (cand) => {
		const baseId = toId(cand.species.baseSpecies || cand.species.name);
		const count = baseCounts.get(baseId) || 0;
		if (count >= 1 && (!allowDupes || count >= 3 || Math.random() >= 0.3)) return false;
		if (!count && !probeSpecies(cand, validator)) return false;
		baseCounts.set(baseId, count + 1);
		chosen.push(cand.species);
		return true;
	};
	if (spice.length) {
		const spiceWindow = Math.min(spice.length, 30);
		const spiceWanted = Math.random() < 0.85 ? (Math.random() < 0.4 ? 2 : 1) : 0;
		let guard = 0;
		while (chosen.length < spiceWanted && guard++ < 40) {
			take(spice[Math.floor(Math.pow(Math.random(), 1.6) * spiceWindow)]);
		}
	}
	const dupeCount = allowDupes && Math.random() < 0.45 ? (Math.random() < 0.3 ? 2 : 1) : 0;
	const uniqueTarget = Math.max(1, teamSize - dupeCount);
	const window = Math.min(pool.length, Math.max(40, teamSize * 10));
	let guard = 0;
	while (chosen.length < uniqueTarget && guard++ < 300) {
		const cand = pool[Math.floor(Math.pow(Math.random(), 2.2) * window)];
		if (!cand) continue;
		take(cand);
	}
	while (chosen.length < teamSize && chosen.length > 0 && dupeCount > 0) {
		chosen.push(chosen[Math.floor(Math.random() * Math.min(2, chosen.length))]);
	}
	while (chosen.length < teamSize && guard++ < 300) {
		const cand = pool[Math.floor(Math.pow(Math.random(), 2.2) * window)];
		if (!cand) continue;
		take(cand);
	}
	return chosen;
}

function buildHackmonsMoves(set, role, fdex, ruleTable, opts) {
	const species = fdex.species.get(set.species);
	const types = species && species.exists ? species.types : [];
	const used = new Set();
	const moves = [];
	const add = name => {
		if (name) {
			moves.push(name);
			used.add(toId(name));
		}
	};
	if (role === 'defensive') {
		for (const group of HM_WALL_MOVES) add(pickMove(group, fdex, ruleTable, used, 3));
	} else {
		add(pickMove(((HM_STAB[types[0]] || {})[role]) || [], fdex, ruleTable, used, 2));
		const secondary = types[1] ? ((HM_STAB[types[1]] || {})[role] || []) : [];
		add(pickMove(secondary.concat(HM_COVERAGE[role]), fdex, ruleTable, used, 3));
		if (opts && opts.noGuardOhko) {
			add(pickMove(HM_OHKO, fdex, ruleTable, used, 1));
		} else if (Math.random() < 0.75) {
			add(pickMove(HM_SETUP[role], fdex, ruleTable, used, 2));
		} else {
			add(pickMove(HM_COVERAGE[role].concat(HM_SETUP[role]), fdex, ruleTable, used, 4));
		}
		add(pickMove(HM_UTILITY, fdex, ruleTable, used, 3));
	}
	for (const m of set.moves || []) {
		if (moves.length >= 4) break;
		const id = toId(('' + m).split(' (')[0]);
		if (!used.has(id)) {
			moves.push(m);
			used.add(id);
		}
	}
	if (moves.length) set.moves = moves.slice(0, 4);
}

function applyHackmonsEvs(set, role, ruleTable) {
	const unlimited = ruleTable.evLimit === null;
	set.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
	if (unlimited) {
		if (role === 'special') {
			set.evs = { hp: 252, atk: 0, def: 252, spa: 252, spd: 252, spe: 252 };
			set.nature = 'Timid';
			set.ivs = Object.assign({}, set.ivs, { atk: 0 });
		} else if (role === 'physical') {
			set.evs = { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 };
			set.nature = 'Jolly';
		} else {
			set.evs = { hp: 252, atk: 0, def: 252, spa: 252, spd: 252, spe: 252 };
			set.nature = 'Bold';
			set.ivs = Object.assign({}, set.ivs, { atk: 0 });
		}
	} else if (role === 'physical') {
		set.evs = { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 };
		set.nature = 'Jolly';
	} else if (role === 'special') {
		set.evs = { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 };
		set.nature = 'Timid';
		set.ivs = Object.assign({}, set.ivs, { atk: 0 });
	} else {
		set.evs = { hp: 252, atk: 0, def: 128, spa: 0, spd: 124, spe: 0 };
		set.nature = 'Bold';
	}
}

function abilityAllowed(name, fdex, ruleTable) {
	const ability = fdex.abilities.get(name);
	if (!ability.exists || ability.gen > fdex.gen || ability.isNonstandard) return false;
	if (ruleTable.check('ability:' + toId(name)) === 'banned') return false;
	return true;
}

function upgradeHackmonsSet(set, fdex, ruleTable, usedAbilities) {
	const role = setRole(set);
	const ohkoLegal = !ruleTable.has('ohkoclause') && moveAllowed('Sheer Cold', fdex, ruleTable);
	const wantsNoGuard = role !== 'defensive' && ohkoLegal && !usedAbilities.has('noguard') &&
		abilityAllowed('No Guard', fdex, ruleTable) && Math.random() < 0.3;
	buildHackmonsMoves(set, role, fdex, ruleTable, { noGuardOhko: wantsNoGuard });
	if (wantsNoGuard) {
		set.ability = 'No Guard';
		usedAbilities.set('noguard', 1);
	} else {
		let pool = (META_ABILITIES[role] || []).filter(a => toId(a) !== 'noguard');
		if (role !== 'defensive') {
			const hasNormalAttack = (set.moves || []).some(m => {
				const move = fdex.moves.get(('' + m).split(' (')[0]);
				return move.type === 'Normal' && move.category !== 'Status';
			});
			if (hasNormalAttack) pool = META_ABILITIES.ate.concat(pool);
		}
		pool = pool.concat(META_ABILITIES.utility, META_ABILITIES.defensive);
		const isLegal = name => !usedAbilities.get(toId(name)) && abilityAllowed(name, fdex, ruleTable);
		let picked = null;
		if (Math.random() < 0.4) {
			const premium = HM_PREMIUM_ABILITIES.filter(isLegal);
			if (premium.length) picked = premium[Math.floor(Math.random() * premium.length)];
		}
		if (!picked) {
			const legal = pool.filter(isLegal);
			if (legal.length) picked = legal[Math.floor(Math.random() * Math.min(legal.length, 4))];
		}
		if (picked) {
			set.ability = picked;
			usedAbilities.set(toId(picked), 1);
		}
	}
	applyHackmonsEvs(set, role, ruleTable);
	if (!set.item && fdex.gen >= 2) set.item = 'Leftovers';
}

function itemAllowed(name, fdex, ruleTable) {
	const item = fdex.items.get(name);
	if (!item.exists || item.gen > fdex.gen || item.isNonstandard) return false;
	if (ruleTable.check('item:' + toId(name)) === 'banned') return false;
	return true;
}

function upgradeCdSet(set, fdex, ruleTable) {
	const role = setRole(set);
	const abilityPool = (CD_OFFENSE_ABILITIES[role] || []).concat(
		role === 'defensive' ? [] : CD_OFFENSE_ABILITIES.defensive.slice(0, 2),
		CD_UNIVERSAL_ABILITIES
	);
	const mainAbility = toId(set.ability || '');
	const extras = [];
	for (const name of abilityPool) {
		if (toId(name) === mainAbility) continue;
		if (extras.some(e => toId(e) === toId(name))) continue;
		if (!abilityAllowed(name, fdex, ruleTable)) continue;
		extras.push(name);
	}
	if (extras.length) set.phAbilities = extras.join('/');
	const stack = CD_ITEM_STACKS[role] || CD_ITEM_STACKS.defensive;
	if (!set.item || !itemAllowed(set.item, fdex, ruleTable)) {
		set.item = itemAllowed(stack.main, fdex, ruleTable) ? stack.main : 'Leftovers';
	}
	const itemExtras = [];
	for (const name of stack.extras) {
		if (toId(name) === toId(set.item)) continue;
		if (!itemAllowed(name, fdex, ruleTable)) continue;
		itemExtras.push(name);
	}
	if (itemExtras.length) set.phItems = itemExtras.join('/');
}

function reshape(team, baseid, gen, rulesText, ruleTable, fdex) {
	const isCD = baseid.includes('customdisguise') && /^gen[89]/.test(baseid) && !toId(rulesText).includes('standardcustom');
	const isHackmons = isHackmonsTarget(baseid) && gen >= 3 && !baseid.includes('metronome');
	const usedAbilities = new Map();
	const isLetsGo = baseid.includes('letsgo');
	const usedItems = new Set();
	let fillerIdx = 0;
	for (const set of team) {
		delete set.level;
		if (gen < 9) delete set.teraType;
		if (gen === 1 || isLetsGo) delete set.item;
		if (isLetsGo) delete set.evs;
		if (isHackmons && !baseid.includes('letsgo')) upgradeHackmonsSet(set, fdex, ruleTable, usedAbilities);
		if (ruleTable.has('itemclause') && set.item) {
			if (usedItems.has(toId(set.item))) {
				while (fillerIdx < FILLER_ITEMS.length && usedItems.has(toId(FILLER_ITEMS[fillerIdx]))) fillerIdx++;
				set.item = FILLER_ITEMS[fillerIdx] || '';
			}
			if (set.item) usedItems.add(toId(set.item));
		}
		if (isCD) upgradeCdSet(set, fdex, ruleTable);
	}
	return team;
}

function baseSpeciesId(set) {
	const { Dex } = loadSim();
	const species = Dex.species.get(set.species);
	return toId(species.baseSpecies || set.species);
}

function drawMonoTypePool(source, teamSize) {
	const { Dex, Teams } = loadSim();
	let type = null;
	const picked = [];
	const seen = new Set();
	for (let draws = 0; draws < 15 && picked.length < teamSize; draws++) {
		const pool = Teams.generate(source);
		for (const set of pool) {
			if (picked.length >= teamSize) break;
			const species = Dex.species.get(set.species);
			if (!species.exists) continue;
			if (!type) type = species.types[0];
			if (!species.types.includes(type)) continue;
			const sid = baseSpeciesId(set);
			if (seen.has(sid)) continue;
			seen.add(sid);
			picked.push(set);
		}
	}
	return picked.length >= Math.min(teamSize, 3) ? picked : null;
}

function generateTeam(formatid) {
	const { Dex, Teams, TeamValidator } = loadSim();
	const sepIdx = formatid.indexOf('@@@');
	const baseFmt = sepIdx < 0 ? formatid : formatid.slice(0, sepIdx);
	const rulesText = sepIdx < 0 ? '' : formatid.slice(sepIdx + 3).trim();
	const baseid = toId(baseFmt);
	const format = Dex.formats.get(baseid);
	if (!format.exists) return { error: `Unknown format: ${baseFmt}` };
	const fullid = rulesText ? `${baseid}@@@${rulesText}` : baseid;

	let validator;
	let ruleTable;
	try {
		validator = TeamValidator.get(fullid);
		ruleTable = Dex.formats.getRuleTable(validator.format);
	} catch (e) {
		return { error: `Bad custom rules: ${('' + e.message).slice(0, 200)}` };
	}

	const gen = genOf(baseid, format);
	const fdex = Dex.forFormat(validator.format);
	if (ruleTable.has('littlecup') && !hasGenerator(baseid)) {
		return { error: 'Little Cup formats have no team generator yet. Try another format.' };
	}
	const source = hasGenerator(baseid) ? baseid : sourceFor(baseid, format);
	if (!source) return { error: 'No team generator is available for this format.' };

	const teamSize = Math.max(1, Math.min(6, ruleTable.maxTeamSize || 6));
	const isMono = ruleTable.has('sametypeclause');
	const synthesize = isHackmonsTarget(baseid) && gen >= 3 && !isMono &&
		!baseid.includes('metronome') && !baseid.includes('letsgo');
	let team = null;
	let problems = null;

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		let pool;
		try {
			if (synthesize) {
				const sPool = speciesPool(fdex, ruleTable, fullid);
				const allowDupes = !ruleTable.has('speciesclause') && !ruleTable.has('formeclause');
				const picked = sampleSpecies(sPool, validator, teamSize, allowDupes);
				if (picked.length >= teamSize) {
					pool = picked.map(sp => ({
						name: sp.name, species: sp.name, ability: '', item: '',
						moves: [], nature: 'Serious', gender: '', evs: {}, ivs: {},
					}));
				} else {
					pool = Teams.generate(source);
				}
			} else {
				pool = isMono ? drawMonoTypePool(source, teamSize) : Teams.generate(source);
			}
		} catch (e) {
			return { error: `Generator failed: ${('' + e.message).slice(0, 200)}` };
		}
		if (!pool || !pool.length) return { error: 'The team generator produced nothing for this format.' };
		if (!team || isMono || synthesize) {
			team = pool.slice(0, teamSize);
		} else {
			const badIdx = new Set();
			for (const p of problems) {
				team.forEach((set, i) => {
					const label = set.name || set.species;
					if (p.includes(label) || p.includes(set.species)) badIdx.add(i);
				});
			}
			if (!badIdx.size) {
				team = pool.slice(0, teamSize);
			} else {
				const spare = pool.filter(set => !team.some(t => baseSpeciesId(t) === baseSpeciesId(set)));
				for (const i of badIdx) {
					if (!spare.length) break;
					team[i] = spare.pop();
				}
			}
		}
		if (!synthesize || ruleTable.has('speciesclause') || ruleTable.has('formeclause')) {
			const seen = new Set();
			team = team.filter(set => {
				const sid = baseSpeciesId(set);
				if (seen.has(sid)) return false;
				seen.add(sid);
				return true;
			});
			while (team.length < teamSize) {
				const extra = (isMono ? [] : Teams.generate(source)).find(set => !seen.has(baseSpeciesId(set)));
				if (!extra) break;
				seen.add(baseSpeciesId(extra));
				team.push(extra);
			}
		}
		reshape(team, baseid, gen, rulesText, ruleTable, fdex);
		try {
			problems = validator.validateTeam(JSON.parse(JSON.stringify(team))) || [];
		} catch (e) {
			return { error: `Validator error: ${('' + e.message).slice(0, 200)}` };
		}
		if (!problems.length) {
			return { team: Teams.pack(team), export: Teams.export(team), source, attempts: attempt + 1 };
		}
	}
	return {
		error: `Couldn't build a fully legal team for this format after ${MAX_ATTEMPTS} tries. ` +
			`Last problems: ${problems.slice(0, 3).join(' | ').slice(0, 400)}`,
	};
}

module.exports = { generateTeam };
