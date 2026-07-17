const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '../node_modules/@smogon/calc/dist/mechanics');

const PATCHES = [
	{
		file: 'util.js',
		find: '        if (effectiveness === 0 && isRingTarget) {',
		replace: '        var __pc = (typeof globalThis !== \'undefined\') && globalThis.__phnnCalc && globalThis.__phnnCalc.typeChart;\n        if (__pc && __pc[move.type] && Object.prototype.hasOwnProperty.call(__pc[move.type], type)) {\n            effectiveness = __pc[move.type][type];\n        }\n        if (effectiveness === 0 && isRingTarget) {',
	},
	{
		file: 'gen789.js',
		find: '    if (attacker.hasAbility(\'Parental Bond (Child)\')) {\n        baseDamage = (0, util_2.pokeRound)((0, util_2.OF32)(baseDamage * 1024) / 4096);\n    }',
		replace: '    if (attacker.hasAbility(\'Parental Bond (Child)\')) {\n        baseDamage = (0, util_2.pokeRound)((0, util_2.OF32)(baseDamage * (((typeof globalThis !== \'undefined\') && globalThis.__phnnCalc && globalThis.__phnnCalc.parentalBond) ? 2048 : 1024)) / 4096);\n    }',
	},
	{
		file: 'gen789.js',
		find: `        (attacker.hasItem('Soul Dew') &&
            attacker.named('Latios', 'Latias', 'Latios-Mega', 'Latias-Mega') &&
            move.hasType('Psychic', 'Dragon')) ||`,
		replace: `        (!((typeof globalThis !== 'undefined') && globalThis.__phnnCalc) && attacker.hasItem('Soul Dew') &&
            attacker.named('Latios', 'Latias', 'Latios-Mega', 'Latias-Mega') &&
            move.hasType('Psychic', 'Dragon')) ||`,
	},
	{
		file: 'gen789.js',
		find: `        bpMods.push(4915);
        desc.attackerItem = attacker.item;`,
		replace: `        bpMods.push((((typeof globalThis !== 'undefined') && globalThis.__phnnCalc) && (attacker.hasItem('Pink Bow') || attacker.hasItem('Polkadot Bow'))) ? 4506 : 4915);
        desc.attackerItem = attacker.item;`,
	},
	{
		file: 'gen789.js',
		find: `    return atMods;`,
		replace: `    if (((typeof globalThis !== 'undefined') && globalThis.__phnnCalc) && move.category === 'Special' && attacker.hasItem('Soul Dew') && attacker.named('Latios', 'Latias', 'Latios-Mega', 'Latias-Mega')) {
        atMods.push(6144);
    }
    return atMods;`,
	},
	{
		file: 'gen789.js',
		find: `    return dfMods;`,
		replace: `    if (((typeof globalThis !== 'undefined') && globalThis.__phnnCalc) && !hitsPhysical && defender.hasItem('Soul Dew') && defender.named('Latios', 'Latias', 'Latios-Mega', 'Latias-Mega')) {
        dfMods.push(6144);
    }
    return dfMods;`,
	},
];

let ok = true;

for (const { file, find, replace } of PATCHES) {
	const target = path.join(DIST, file);

	if (!fs.existsSync(target)) {
		console.error('patch-calc: missing', target);
		ok = false;
		continue;
	}

	let src = fs.readFileSync(target, 'utf8');

	if (src.includes(replace)) {
		console.log('patch-calc:', file, 'already patched');
		continue;
	}

	if (!src.includes(find)) {
		console.error('patch-calc:', file, 'anchor not found (upstream changed?)');
		ok = false;
		continue;
	}

	src = src.replace(find, replace);
	fs.writeFileSync(target, src);
	console.log('patch-calc:', file, 'patched');
}

if (!ok) {
	process.exitCode = 1;
}
