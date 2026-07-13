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
];

const TYPES = [
	'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost',
	'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy',
];

function multiplier(dex, atk, def) {
	if (!dex.getImmunity(atk, def)) return 0;
	return Math.pow(2, dex.getEffectiveness(atk, def));
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
	for (const atk of TYPES) {
		for (const def of TYPES) {
			const mm = multiplier(modDex, atk, def);
			const sm = multiplier(stockDex, atk, def);
			if (mm !== sm) {
				out[atk] = out[atk] || {};
				out[atk][def] = mm;
			}
		}
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
