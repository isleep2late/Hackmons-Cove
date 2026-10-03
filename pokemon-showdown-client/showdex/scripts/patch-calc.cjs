const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '../node_modules/@smogon/calc/dist/mechanics');

const PATCHES = [
	{
		file: 'gen789.js',
		find: '        baseDamage = Math.floor((0, util_2.OF32)(baseDamage * 1.5));',
		replace: "        baseDamage = Math.floor((0, util_2.OF32)(baseDamage * (((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && globalThis.__phnnCalc.critModifier) || 1.5)));",
	},
	{
		file: 'gen789.js',
		find: "    else if ((defender.hasItem('Metal Powder') && defender.named('Ditto') && hitsPhysical) ||",
		replace: "    else if (((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && defender.hasItem('Metal Powder') && defender.named('Ditto')) ||\n        (defender.hasItem('Metal Powder') && defender.named('Ditto') && hitsPhysical) ||",
	},

	{
		file: 'util.js',
		find: '        if (effectiveness === 0 && isRingTarget) {',
		replace: '        var __pc = (typeof globalThis !== \'undefined\') && globalThis.__phnnCalc && globalThis.__phnnCalc.typeChart;\n        if (__pc && __pc[move.type] && Object.prototype.hasOwnProperty.call(__pc[move.type], type)) {\n            effectiveness = __pc[move.type][type];\n        }\n        if (effectiveness === 0 && isRingTarget) {',
	},
	{
		file: 'gen789.js',
		find: `    const damage = [];
    for (let i = 0; i < 16; i++) {
        damage[i] =
            (0, util_2.getFinalDamage)(baseDamage, i, typeEffectiveness, applyBurn, stabMod, finalMod, protect);
    }
    result.damage = childDamage ? [damage, childDamage] : damage;`,
		replace: `    const damage = [];
    const __phnnChildScale = (attacker.hasAbility('Parental Bond (Child)') && (typeof globalThis !== 'undefined') && globalThis.__phnnCalc && globalThis.__phnnCalc.parentalBond) ? 2 : 1;
    for (let i = 0; i < 16; i++) {
        damage[i] = __phnnChildScale *
            (0, util_2.getFinalDamage)(baseDamage, i, typeEffectiveness, applyBurn, stabMod, finalMod, protect);
    }
    result.damage = childDamage ? [damage, childDamage] : damage;`,
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
	{
		file: 'gen12.js',
		find: `        move.bp = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20;
        desc.moveBP = move.bp;`,
		replace: `        move.bp = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20;
        if ((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && typeof globalThis.__phnnCalc.flailPower === 'function') {
            move.bp = globalThis.__phnnCalc.flailPower(attacker.curHP(), attacker.maxHP());
        }
        desc.moveBP = move.bp;`,
	},
	{
		file: 'gen12.js',
		find: '    baseDamage = Math.min(997, baseDamage) + 2;',
		replace: '    baseDamage = (gen.num === 2 ? Math.max(1, Math.min(997, baseDamage)) : Math.min(997, baseDamage)) + 2;',
	},
	{
		file: '../desc.js',
		find: `    if (!defender.hasAbility('Magic Guard') && TRAPPING.includes(move.name) &&
        (gen.num === 0 || gen.num > 1)) {`,
		replace: `    if (!defender.hasAbility('Magic Guard') && TRAPPING.includes(move.name) &&
        (gen.num === 0 || gen.num > 1) && !((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && globalThis.__phnnCalc.noTrappingDamage)) {`,
	},
	{
		file: '../desc.js',
		find: '        toxicDamage = Math.floor((toxicCounter * maxHP) / 16);',
		replace: "        toxicDamage = (((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && globalThis.__phnnCalc.toxicTick) ? globalThis.__phnnCalc.toxicTick(toxicCounter, maxHP) : Math.floor((toxicCounter * maxHP) / 16));",
	},
	{
		file: '../desc.js',
		find: '            toxicDamage += Math.floor(((toxicCounter + i) * maxHP) / 16);',
		replace: "            toxicDamage += (((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && globalThis.__phnnCalc.toxicTick) ? globalThis.__phnnCalc.toxicTick((toxicCounter + i), maxHP) : Math.floor(((toxicCounter + i) * maxHP) / 16));",
	},
	{
		file: '../desc.js',
		find: '        lastTurnEot -= Math.floor(((toxicCounter + (hits - 1)) * maxHP) / 16);',
		replace: "        lastTurnEot -= (((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && globalThis.__phnnCalc.toxicTick) ? globalThis.__phnnCalc.toxicTick((toxicCounter + (hits - 1)), maxHP) : Math.floor(((toxicCounter + (hits - 1)) * maxHP) / 16));",
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
