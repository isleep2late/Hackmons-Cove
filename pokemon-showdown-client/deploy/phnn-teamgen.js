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
	let phys = 0;
	let spec = 0;
	for (const m of set.moves || []) {
		const move = Dex.moves.get(('' + m).split(' (')[0]);
		if (move.category === 'Physical') phys++;
		else if (move.category === 'Special') spec++;
	}
	if (!phys && !spec) return 'defensive';
	const species = Dex.species.get(set.species);
	const bulk = species.exists ? species.baseStats.hp + species.baseStats.def + species.baseStats.spd : 0;
	if (phys + spec <= 1 && bulk >= 280) return 'defensive';
	return phys >= spec ? 'physical' : 'special';
}

function abilityAllowed(name, gen, ruleTable) {
	const { Dex } = loadSim();
	const ability = Dex.forGen(gen).abilities.get(name);
	if (!ability.exists || ability.gen > gen || ability.isNonstandard) return false;
	if (ruleTable.check('ability:' + toId(name)) === 'banned') return false;
	return true;
}

function upgradeHackmonsSet(set, gen, ruleTable, usedAbilities) {
	const { Dex } = loadSim();
	const role = setRole(set);
	let pool = (META_ABILITIES[role] || []).slice();
	if (role !== 'defensive') {
		const hasNormalAttack = (set.moves || []).some(m => {
			const move = Dex.moves.get(('' + m).split(' (')[0]);
			return move.type === 'Normal' && move.category !== 'Status';
		});
		if (hasNormalAttack) pool = META_ABILITIES.ate.concat(pool);
	}
	pool = pool.concat(META_ABILITIES.utility, META_ABILITIES.defensive);
	for (const name of pool) {
		if ((usedAbilities.get(toId(name)) || 0) >= 1) continue;
		if (!abilityAllowed(name, gen, ruleTable)) continue;
		set.ability = name;
		usedAbilities.set(toId(name), (usedAbilities.get(toId(name)) || 0) + 1);
		break;
	}
	if (role === 'physical') {
		set.evs = { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 };
		set.nature = 'Jolly';
	} else if (role === 'special') {
		set.evs = { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 };
		set.nature = 'Timid';
	} else {
		set.evs = { hp: 252, atk: 0, def: 128, spa: 0, spd: 124, spe: 0 };
		set.nature = 'Bold';
	}
	if (!set.item && gen >= 2) set.item = 'Leftovers';
}

function itemAllowed(name, gen, ruleTable) {
	const { Dex } = loadSim();
	const item = Dex.forGen(gen).items.get(name);
	if (!item.exists || item.gen > gen || item.isNonstandard) return false;
	if (ruleTable.check('item:' + toId(name)) === 'banned') return false;
	return true;
}

function upgradeCdSet(set, gen, ruleTable) {
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
		if (!abilityAllowed(name, gen, ruleTable)) continue;
		extras.push(name);
	}
	if (extras.length) set.phAbilities = extras.join('/');
	const stack = CD_ITEM_STACKS[role] || CD_ITEM_STACKS.defensive;
	if (!set.item || !itemAllowed(set.item, gen, ruleTable)) {
		set.item = itemAllowed(stack.main, gen, ruleTable) ? stack.main : 'Leftovers';
	}
	const itemExtras = [];
	for (const name of stack.extras) {
		if (toId(name) === toId(set.item)) continue;
		if (!itemAllowed(name, gen, ruleTable)) continue;
		itemExtras.push(name);
	}
	if (itemExtras.length) set.phItems = itemExtras.join('/');
}

function reshape(team, baseid, gen, rulesText, ruleTable) {
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
		if (isHackmons && !baseid.includes('letsgo')) upgradeHackmonsSet(set, gen, ruleTable, usedAbilities);
		if (ruleTable.has('itemclause') && set.item) {
			if (usedItems.has(toId(set.item))) {
				while (fillerIdx < FILLER_ITEMS.length && usedItems.has(toId(FILLER_ITEMS[fillerIdx]))) fillerIdx++;
				set.item = FILLER_ITEMS[fillerIdx] || '';
			}
			if (set.item) usedItems.add(toId(set.item));
		}
		if (isCD) upgradeCdSet(set, gen, ruleTable);
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
	if (ruleTable.has('littlecup') && !hasGenerator(baseid)) {
		return { error: 'Little Cup formats have no team generator yet. Try another format.' };
	}
	const source = hasGenerator(baseid) ? baseid : sourceFor(baseid, format);
	if (!source) return { error: 'No team generator is available for this format.' };

	const teamSize = Math.max(1, Math.min(6, ruleTable.maxTeamSize || 6));
	const isMono = ruleTable.has('sametypeclause');
	let team = null;
	let problems = null;

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		let pool;
		try {
			pool = isMono ? drawMonoTypePool(source, teamSize) : Teams.generate(source);
		} catch (e) {
			return { error: `Generator failed: ${('' + e.message).slice(0, 200)}` };
		}
		if (!pool || !pool.length) return { error: 'The team generator produced nothing for this format.' };
		if (!team || isMono) {
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
		reshape(team, baseid, gen, rulesText, ruleTable);
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
