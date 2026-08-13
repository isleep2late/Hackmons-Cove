const fs = require('fs');
const path = require('path');

const SIM = path.resolve(__dirname, '../../../pokemon-showdown/dist/sim');
const OUT = path.resolve(__dirname, '../src/phnn/phnn-data.ts');

const MODS = [
	{ key: 'gen9phnn', mod: 'phnn', stock: 'gen9' },
	{ key: 'gen5phnn', mod: 'gen5phnn', stock: 'gen5' },
	{ key: 'gen7phnn', mod: 'gen7phnn', stock: 'gen7' },
	{ key: 'gen3phnn', mod: 'gen3phnn', stock: 'gen3' },
	{ key: 'gen8unified', mod: 'gen8unified', stock: 'gen8' },
	{ key: 'gen9customdisguises', mod: 'gen9customdisguises', stock: 'gen9' },
	{ key: 'champions', mod: 'champions', stock: 'gen9' },
	{ key: 'spaceworld', mod: 'spaceworld', stock: 'gen2' },
	{ key: 'gen2gs', mod: 'gen2gs', stock: 'gen2' },
	{ key: 'gen1phnn', mod: 'gen1phnn', stock: 'gen1' },
	{ key: 'gen1phnneng', mod: 'gen1phnneng', stock: 'gen1' },
	{ key: 'gen1', mod: 'gen1', stock: 'gen1' },
	{ key: 'gen2', mod: 'gen2', stock: 'gen2' },
	{ key: 'gen3', mod: 'gen3', stock: 'gen3' },
	{ key: 'gen4', mod: 'gen4', stock: 'gen4' },
	{ key: 'gen5', mod: 'gen5', stock: 'gen5' },
	{ key: 'gen6', mod: 'gen6', stock: 'gen6' },
	{ key: 'gen7', mod: 'gen7', stock: 'gen7' },
	{ key: 'gen8', mod: 'gen8', stock: 'gen8' },
];

const TYPES = [
	'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost',
	'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy',
	'???', 'Shadow', 'Stellar', 'Bird',
];

function multiplier(dex, atk, def) {
	try {
		if (!dex.getImmunity(atk, def)) return 0;
		return Math.pow(2, dex.getEffectiveness(atk, def));
	} catch (e) {
		return 1;
	}
}

function moveDiff(modDex, stockDex) {
	const out = {};
	for (const id in modDex.data.Moves) {
		const m = modDex.moves.get(id);
		const s = stockDex.moves.get(id);
		if (!m.exists) continue;
		const entry = {};
		if (typeof m.basePower === 'number' && (!s.exists || m.basePower !== s.basePower)) entry.basePower = m.basePower;
		if (m.type && (!s.exists || m.type !== s.type)) entry.type = m.type;
		if (m.category && (!s.exists || m.category !== s.category)) entry.category = m.category;
		if (m.overrideDefensiveStat && m.overrideDefensiveStat !== (s.exists && s.overrideDefensiveStat)) entry.overrideDefensiveStat = m.overrideDefensiveStat;
		if (m.overrideOffensiveStat && m.overrideOffensiveStat !== (s.exists && s.overrideOffensiveStat)) entry.overrideOffensiveStat = m.overrideOffensiveStat;
		if (m.ignoreImmunity && !(s.exists && s.ignoreImmunity)) entry.ignoreImmunity = true;
		if (Object.keys(entry).length) out[id] = entry;
	}
	return out;
}

function typeChartDiff(modDex, stockDex) {
	const out = {};
	const EXOTIC = new Set(['???', 'Shadow', 'Stellar', 'Bird']);
	for (const atk of TYPES) {
		if (!modDex.types.get(atk).exists) continue;
		for (const def of TYPES) {
			if (!modDex.types.get(def).exists) continue;
			const mm = multiplier(modDex, atk, def);
			const sm = multiplier(stockDex, atk, def);
			// exotic rows are always emitted: @smogon/calc has no Shadow/???/Bird data of its own
			if (mm !== sm || EXOTIC.has(atk) || EXOTIC.has(def)) {
				out[atk] = out[atk] || {};
				out[atk][def] = mm;
			}
		}
	}
	return out;
}

const ABILITY_KEYS = [
	'isBreakable', 'suppressWeather', 'onModifyAtk', 'onModifySpA', 'onModifyDef', 'onModifySpD',
	'onBasePower', 'onModifyMove', 'onModifyType', 'onSourceModifyDamage', 'onModifyDamage',
	'onCriticalHit', 'onEffectiveness', 'onTryHit', 'onDamage',
];

function abilityDiff(modDex, stockDex) {
	const out = {};
	for (const id in modDex.data.Abilities) {
		const m = modDex.abilities.get(id);
		const s = stockDex.abilities.get(id);
		if (!m.exists) continue;
		const entry = {};
		if (!s.exists) {
			entry.added = true;
		} else {
			for (const key of ABILITY_KEYS) {
				const mHas = typeof m[key] !== 'undefined';
				const sHas = typeof s[key] !== 'undefined';
				const mStr = mHas ? String(m[key]) : '';
				const sStr = sHas ? String(s[key]) : '';
				if (mStr !== sStr) entry[key] = mHas ? (typeof m[key] === 'function' ? 'modified' : m[key]) : null;
			}
		}
		if (Object.keys(entry).length) out[m.name] = entry;
	}
	return out;
}

function baseStatDiff(modDex, stockDex) {
	const out = {};
	for (const id in modDex.data.Pokedex) {
		const m = modDex.species.get(id);
		const s = stockDex.species.get(id);
		if (!m.exists || !s.exists) continue;
		const diff = {};
		for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
			if (m.baseStats[stat] !== s.baseStats[stat]) diff[stat] = m.baseStats[stat];
		}
		if (Object.keys(diff).length) out[m.name] = diff;
	}
	return out;
}

function main() {
	const { Dex } = require(SIM);
	const result = {};
	for (const { key, mod, stock } of MODS) {
		let modDex;
		try {
			modDex = Dex.mod(mod);
		} catch (e) {
			continue;
		}
		if (!modDex) continue;
		const stockDex = Dex.mod(stock);
		result[key] = {
			gen: modDex.gen,
			moves: moveDiff(modDex, stockDex),
			typeChart: typeChartDiff(modDex, stockDex),
			baseStats: baseStatDiff(modDex, stockDex),
			abilities: abilityDiff(modDex, stockDex),
		};
	}
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, 'export default ' + JSON.stringify(result, null, '\t') + ' as const;\n');
	for (const key in result) {
		const r = result[key];
		console.log(`${key}: ${Object.keys(r.moves).length} move overrides, ${Object.keys(r.typeChart).length} attacking-type chart changes, ${Object.keys(r.baseStats).length} base-stat overrides`);
	}
	console.log('wrote', OUT);
}

main();
