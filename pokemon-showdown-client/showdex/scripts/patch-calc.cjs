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
		find: `function calculateRBYGSC(gen, attacker, defender, move, field, mods) {
    var _a;
`,
		replace: `function calculateRBYGSC(gen, attacker, defender, move, field, mods) {
    var _a;
    if ((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && typeof globalThis.__phnnCalc.spaceworld === 'function') {
        return globalThis.__phnnCalc.spaceworld(gen, attacker, defender, move, field, mods);
    }
`,
		done: 'return globalThis.__phnnCalc.spaceworld(gen, attacker, defender, move, field, mods);',
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
	{
		file: '../items.js',
		find: "function getMultiAttack(item) {\n    if (item.includes('Memory')) {",
		replace: "function getMultiAttack(item) {\n    if (item === 'Question Memory') {\n        return '???';\n    }\n    if (item.includes('Memory')) {",
	},
];

const SUPERSEDED_MARKERS = [
	['globalThis.__phnnCalc.critModifier) || 1.5)', 'globalThis.__phnnCalc.critModifier'],
	["attacker.hasItem('Polkadot Bow'))) ? 4506 : 4915)", "attacker.hasItem('Polkadot Bow'))) ? 4506"],
	['const __phnnChildScale', 'const __phnnChildScale'],
	['globalThis.__phnnCalc.toxicTick(toxicCounter, maxHP)', 'globalThis.__phnnCalc.toxicTick(toxicCounter, maxHP)'],
	['globalThis.__phnnCalc.toxicTick((toxicCounter + i), maxHP)', 'globalThis.__phnnCalc.toxicTick((toxicCounter + i), maxHP)'],
	['globalThis.__phnnCalc.toxicTick((toxicCounter + (hits - 1)), maxHP)', 'globalThis.__phnnCalc.toxicTick((toxicCounter + (hits - 1)), maxHP)'],
];

for (const patch of PATCHES) {
	for (const [needle, marker] of SUPERSEDED_MARKERS) {
		if (patch.replace.includes(needle)) patch.done = marker;
	}
}

const HACK_HELPERS = `const PHNN_HACK = { live: null, rolls: null, stages: null, weather: null };
function phnnHackPositive(value, max) {
    return typeof value === 'number' && isFinite(value) && value > 0 && value <= max;
}
function phnnHackWhole(value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
}
function phnnHackFraction(value) {
    return Array.isArray(value) && value.length === 2 &&
        typeof value[0] === 'number' && isFinite(value[0]) && value[0] >= 0 &&
        phnnHackPositive(value[1], 1e9);
}
function phnnHackReadRolls(roll) {
    if (!roll || !phnnHackWhole(roll.min) || !phnnHackWhole(roll.max) || !phnnHackWhole(roll.den))
        return null;
    if (roll.min < 1 || roll.max < roll.min || roll.den < 1 || roll.max - roll.min > 255)
        return null;
    const repeat = Math.ceil(16 / (roll.max - roll.min + 1));
    const values = [];
    for (let r = roll.min; r <= roll.max; r++) {
        for (let k = 0; k < repeat; k++)
            values.push(r);
    }
    return { values, den: roll.den };
}
function phnnHackReadStages(table) {
    if (!Array.isArray(table) || table.length !== 13)
        return null;
    const stages = [];
    for (let i = 0; i < 13; i++) {
        if (!phnnHackFraction(table[i]) || table[i][0] <= 0)
            return null;
        stages.push([table[i][0], table[i][1]]);
    }
    if (stages[6][0] !== stages[6][1])
        return null;
    return stages;
}
function phnnHackReadWeather(rows) {
    if (!Array.isArray(rows))
        return null;
    const list = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || (row.weather !== 'rain' && row.weather !== 'sun') || typeof row.type !== 'string' ||
            !phnnHackPositive(row.multiplier, 16)) {
            return null;
        }
        list.push(row);
    }
    return list;
}
function phnnHackEnter(gen) {
    const profile = (typeof globalThis !== 'undefined') && globalThis.__phnnRomHack;
    const mechanics = profile && profile.mechanics;
    const live = mechanics && typeof mechanics === 'object' && !Array.isArray(mechanics) &&
        gen && profile.gen === gen.num ? mechanics : null;
    PHNN_HACK.live = live;
    PHNN_HACK.rolls = live ? phnnHackReadRolls(live.damageRoll) : null;
    PHNN_HACK.stages = live ? phnnHackReadStages(live.statStages) : null;
    PHNN_HACK.weather = live ? phnnHackReadWeather(live.weatherMoveModifiers) : null;
    return live;
}
exports.phnnHackEnter = phnnHackEnter;
function phnnHackMultiplier(key, stock) {
    const value = PHNN_HACK.live ? PHNN_HACK.live[key] : undefined;
    return phnnHackPositive(value, 16) ? value : stock;
}
exports.phnnHackMultiplier = phnnHackMultiplier;
function phnnHackHas(key) {
    return !!PHNN_HACK.live && phnnHackPositive(PHNN_HACK.live[key], 16);
}
exports.phnnHackHas = phnnHackHas;
function phnnHackModify(value, multiplier) {
    const modifier = Math.floor(multiplier * 4096);
    return Math.floor((OF32(value * modifier) + 2047) / 4096);
}
exports.phnnHackModify = phnnHackModify;
function phnnHackApply(key, value, stock) {
    return phnnHackHas(key) ? phnnHackModify(value, phnnHackMultiplier(key, 1)) : stock;
}
exports.phnnHackApply = phnnHackApply;
function phnnHackFloor(key, value, stock) {
    return phnnHackHas(key) ? Math.floor(value * phnnHackMultiplier(key, 1)) : stock;
}
exports.phnnHackFloor = phnnHackFloor;
function phnnHackStabApply(value, stabMod) {
    return phnnHackHas('stab') && stabMod === phnnHackMultiplier('stab', 0)
        ? phnnHackModify(value, stabMod) : Math.floor(value * stabMod);
}
exports.phnnHackStabApply = phnnHackStabApply;
function phnnHackRollCount(stock) {
    return PHNN_HACK.rolls ? PHNN_HACK.rolls.values.length : stock;
}
exports.phnnHackRollCount = phnnHackRollCount;
function phnnHackRollValue(i, stockMin) {
    return PHNN_HACK.rolls ? PHNN_HACK.rolls.values[i] : stockMin + i;
}
exports.phnnHackRollValue = phnnHackRollValue;
function phnnHackRollDen(stock) {
    return PHNN_HACK.rolls ? PHNN_HACK.rolls.den : stock;
}
exports.phnnHackRollDen = phnnHackRollDen;
function phnnHackStageStat(stat, mod) {
    const stages = PHNN_HACK.stages;
    if (!stages || !phnnHackWhole(mod) || mod < -6 || mod > 6)
        return undefined;
    return Math.floor((stat * stages[6 + mod][0]) / stages[6 + mod][1]);
}
exports.phnnHackStageStat = phnnHackStageStat;
function phnnHackItemBoost(item) {
    const items = PHNN_HACK.live ? PHNN_HACK.live.items : undefined;
    const entry = items && typeof items === 'object' && item ? items[(0, util_1.toID)(item)] : undefined;
    return entry && phnnHackPositive(entry.powerBoost, 16) ? entry.powerBoost : undefined;
}
function phnnHackItemMod(item, stock) {
    const boost = phnnHackItemBoost(item);
    return boost === undefined ? stock : Math.floor(boost * 4096);
}
exports.phnnHackItemMod = phnnHackItemMod;
function phnnHackItemApply(item, value, stock) {
    const boost = phnnHackItemBoost(item);
    return boost === undefined ? stock : phnnHackModify(value, boost);
}
exports.phnnHackItemApply = phnnHackItemApply;
function phnnHackItemFloor(item, value, stock) {
    const boost = phnnHackItemBoost(item);
    return boost === undefined ? stock : Math.floor(value * boost);
}
exports.phnnHackItemFloor = phnnHackItemFloor;
function phnnHackWeather(weather, type) {
    const rows = PHNN_HACK.weather;
    const key = weather === 'Sun' ? 'sun' : weather === 'Rain' ? 'rain' : '';
    if (!rows || !key)
        return undefined;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].weather === key && rows[i].type === type)
            return rows[i].multiplier;
    }
    return 1;
}
exports.phnnHackWeather = phnnHackWeather;
function phnnHackHpFraction(path, maxHP, stock) {
    let value = PHNN_HACK.live;
    const keys = path.split('.');
    for (let i = 0; i < keys.length && value; i++)
        value = value[keys[i]];
    if (!phnnHackFraction(value) || value[0] <= 0)
        return stock;
    return Math.floor((maxHP * value[0]) / value[1]);
}
exports.phnnHackHpFraction = phnnHackHpFraction;
`;

const hackEngine = (file, U, enterFind, enterTail = '') => {
	const call = name => `(0, ${U}.${name})`;
	const out = [{
		file, find: `${enterFind}${enterTail}`, replace: `${enterFind}    ${call('phnnHackEnter')}(gen);\n${enterTail}`,
	}];
	const add = (find, replace, all) => out.push({ file, find, replace, all });
	return { call, add, out };
};

const HACK_PATCHES = [
	{
		file: 'util.js',
		find: '//# sourceMappingURL=util.js.map',
		replace: `${HACK_HELPERS}//# sourceMappingURL=util.js.map`,
		done: 'function phnnHackEnter(gen) {',
	},
	{
		file: 'util.js',
		find: 'function getModifiedStat(stat, mod, gen) {\n',
		replace: `function getModifiedStat(stat, mod, gen) {
    const phnnStaged = phnnHackStageStat(stat, mod);
    if (phnnStaged !== undefined) {
        return gen && (gen.num === 1 || gen.num === 2) ? Math.min(999, Math.max(1, phnnStaged)) : phnnStaged;
    }
`,
	},
	{
		file: 'util.js',
		find: '        speed = Math.floor(OF32(speed * (gen.num >= 7 || gen.num === 0 ? 50 : 25)) / 100);',
		replace: "        speed = Math.floor(OF32(speed * (phnnHackHas('paralysisSpeed') ? Math.round(phnnHackMultiplier('paralysisSpeed', 1) * 100) : (gen.num >= 7 || gen.num === 0 ? 50 : 25))) / 100);",
	},
	{
		file: 'util.js',
		find: '    let damageAmount = Math.floor(OF32(baseAmount * (85 + i)) / 100);',
		replace: '    let damageAmount = Math.floor(OF32(baseAmount * phnnHackRollValue(i, 85)) / phnnHackRollDen(100));',
	},
	{
		file: 'util.js',
		find: '    if (isBurned)\n        damageAmount = Math.floor(damageAmount / 2);',
		replace: "    if (isBurned)\n        damageAmount = phnnHackApply('burnAttack', damageAmount, Math.floor(damageAmount / 2));",
	},
	{
		file: 'util.js',
		find: `    if (pokemon.hasAbility('Adaptability') && pokemon.hasType(move.type)) {
        stabMod += teraType && pokemon.hasOriginalType(teraType) ? 1024 : 2048;
        desc.attackerAbility = pokemon.ability;
    }
    return stabMod;`,
		replace: `    if (pokemon.hasAbility('Adaptability') && pokemon.hasType(move.type)) {
        stabMod += teraType && pokemon.hasOriginalType(teraType) ? 1024 : 2048;
        desc.attackerAbility = pokemon.ability;
    }
    const phnnOriginalStab = pokemon.hasOriginalType(move.type) ||
        (pokemon.hasAbility('Protean', 'Libero') && !pokemon.teraType);
    const phnnTeraStab = teraType === move.type && teraType !== 'Stellar';
    if (phnnHackHas('stab') && (phnnOriginalStab || phnnTeraStab)) {
        stabMod = phnnOriginalStab && phnnTeraStab ? 8192 : Math.floor(phnnHackMultiplier('stab', 1.5) * 4096);
        if (pokemon.hasAbility('Adaptability') && pokemon.hasType(move.type))
            stabMod = stabMod === 8192 ? 9216 : 8192;
    }
    return stabMod;`,
	},
];

{
	const { call, add, out } = hackEngine(
		'gen12.js', 'util_1',
		'function calculateRBYGSC(gen, attacker, defender, move, field, mods) {\n    var _a;\n',
		"    if ((typeof globalThis !== 'undefined') && globalThis.__phnnCalc && typeof globalThis.__phnnCalc.spaceworld === 'function') {\n",
	);
	add(
		'            at = Math.floor(at / 2);\n            desc.isBurned = true;',
		`            at = ${call('phnnHackFloor')}('burnAttack', at, Math.floor(at / 2));\n            desc.isBurned = true;`,
	);
	add(
		'        baseDamage *= 2;\n        desc.isCritical = true;',
		`        baseDamage = ${call('phnnHackFloor')}('critMultiplier', baseDamage, baseDamage * 2);\n        desc.isCritical = true;`,
	);
	add(
		'        baseDamage = Math.floor(baseDamage * 1.1);\n        desc.attackerItem = attacker.item;',
		`        baseDamage = ${call('phnnHackItemFloor')}(attacker.item, baseDamage, Math.floor(baseDamage * 1.1));\n        desc.attackerItem = attacker.item;`,
	);
	add(
		`    if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
        (field.hasWeather('Rain') && move.hasType('Water'))) {
        baseDamage = Math.floor(baseDamage * 1.5);`,
		`    const phnnWeather = ${call('phnnHackWeather')}(field.weather, move.type);
    if (phnnWeather !== undefined) {
        if (phnnWeather !== 1) {
            baseDamage = Math.floor(baseDamage * phnnWeather);
            desc.weather = field.weather;
        }
        if (field.hasWeather('Rain') && move.named('Solar Beam')) {
            baseDamage = Math.floor(baseDamage / 2);
            desc.weather = field.weather;
        }
    }
    else if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
        (field.hasWeather('Rain') && move.hasType('Water'))) {
        baseDamage = Math.floor(baseDamage * 1.5);`,
	);
	add(
		'    if (move.hasType(...attacker.types)) {\n        baseDamage = Math.floor(baseDamage * 1.5);\n    }',
		`    if (move.hasType(...attacker.types)) {
        baseDamage = ${call('phnnHackHas')}('stab')
            ? baseDamage + Math.floor(baseDamage * (${call('phnnHackMultiplier')}('stab', 1.5) - 1))
            : Math.floor(baseDamage * 1.5);
    }`,
	);
	add(
		'    for (let i = 217; i <= 255; i++) {\n',
		`    for (let phnnRoll = 0; phnnRoll < ${call('phnnHackRollCount')}(39); phnnRoll++) {\n        const i = ${call('phnnHackRollValue')}(phnnRoll, 217);\n`,
	);
	add(
		'            for (let damageMultiplier = 217; damageMultiplier <= 255; damageMultiplier++) {\n',
		`            for (let phnnRoll = 0; phnnRoll < ${call('phnnHackRollCount')}(39); phnnRoll++) {\n                const damageMultiplier = ${call('phnnHackRollValue')}(phnnRoll, 217);\n`,
	);
	add('damage[i - 217] = ', 'damage[phnnRoll] = ', true);
	add('damage[damageMultiplier - 217] = ', 'damage[phnnRoll] = ', true);
	add('(baseDamage * i) / 255)', `(baseDamage * i) / ${call('phnnHackRollDen')}(255))`, true);
	add('(baseDamage * damageMultiplier) / 255)', `(baseDamage * damageMultiplier) / ${call('phnnHackRollDen')}(255))`, true);
	HACK_PATCHES.push(...out);
}

{
	const { call, add, out } = hackEngine(
		'gen3.js', 'util_1',
		'function calculateADV(gen, attacker, defender, move, field, mods) {\n    var _a, _b;\n',
	);
	add(
		'    for (let i = 85; i <= 100; i++) {\n        damage[i - 85] = Math.max(1, Math.floor((baseDamage * i) / 100));',
		`    for (let phnnRoll = 0; phnnRoll < ${call('phnnHackRollCount')}(16); phnnRoll++) {\n        damage[phnnRoll] = Math.max(1, Math.floor((baseDamage * ${call('phnnHackRollValue')}(phnnRoll, 85)) / ${call('phnnHackRollDen')}(100)));`,
	);
	add(
		`            for (let i = 85; i <= 100; i++) {
                const newFinalDamage = Math.max(1, Math.floor((newBaseDmg * i) / 100));
                damageArray[i - 85] = newFinalDamage;`,
		`            for (let phnnRoll = 0; phnnRoll < ${call('phnnHackRollCount')}(16); phnnRoll++) {
                const newFinalDamage = Math.max(1, Math.floor((newBaseDmg * ${call('phnnHackRollValue')}(phnnRoll, 85)) / ${call('phnnHackRollDen')}(100)));
                damageArray[phnnRoll] = newFinalDamage;`,
	);
	add(
		'        at = Math.floor(at * 1.1);\n        desc.attackerItem',
		`        at = ${call('phnnHackItemApply')}(attacker.item, at, Math.floor(at * 1.1));\n        desc.attackerItem`,
	);
	add(
		'        at = Math.floor(at * 1.05);\n        desc.attackerItem',
		`        at = ${call('phnnHackItemApply')}(attacker.item, at, Math.floor(at * 1.05));\n        desc.attackerItem`,
	);
	add(
		'        baseDamage = Math.floor(baseDamage / 2);\n        desc.isBurned = true;',
		`        baseDamage = ${call('phnnHackApply')}('burnAttack', baseDamage, Math.floor(baseDamage / 2));\n        desc.isBurned = true;`,
	);
	add(
		`    if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
        (field.hasWeather('Rain') && move.hasType('Water'))) {
        baseDamage = Math.floor(baseDamage * 1.5);`,
		`    const phnnWeather = ${call('phnnHackWeather')}(field.weather, move.type);
    if (phnnWeather !== undefined) {
        if (phnnWeather !== 1) {
            baseDamage = ${call('phnnHackModify')}(baseDamage, phnnWeather);
            desc.weather = field.weather;
        }
        if (move.named('Solar Beam') && field.hasWeather('Rain', 'Sand', 'Hail')) {
            baseDamage = Math.floor(baseDamage / 2);
            desc.weather = field.weather;
        }
    }
    else if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
        (field.hasWeather('Rain') && move.hasType('Water'))) {
        baseDamage = Math.floor(baseDamage * 1.5);`,
	);
	add(
		'        baseDamage *= 2;\n        desc.isCritical = true;',
		`        baseDamage = ${call('phnnHackApply')}('critMultiplier', baseDamage, baseDamage * 2);\n        desc.isCritical = true;`,
	);
	add(
		'    if (move.hasType(...attacker.types)) {\n        baseDamage = Math.floor(baseDamage * 1.5);\n    }',
		`    if (move.hasType(...attacker.types)) {\n        baseDamage = ${call('phnnHackApply')}('stab', baseDamage, Math.floor(baseDamage * 1.5));\n    }`,
	);
	HACK_PATCHES.push(...out);
}

{
	const { call, add, out } = hackEngine(
		'gen4.js', 'util_1',
		'function calculateDPP(gen, attacker, defender, move, field, mods) {\n    // #region Initial\n    var _a, _b, _c;\n',
	);
	add(
		'baseDamage = Math.floor(baseDamage * 0.5);\n        desc.isBurned = true;',
		`baseDamage = ${call('phnnHackApply')}('burnAttack', baseDamage, Math.floor(baseDamage * 0.5));\n        desc.isBurned = true;`,
	);
	add(
		'baseDamage = Math.floor(baseDamage * 0.5);\n                desc.isBurned = true;',
		`baseDamage = ${call('phnnHackApply')}('burnAttack', baseDamage, Math.floor(baseDamage * 0.5));\n                desc.isBurned = true;`,
	);
	add('            stabMod = 1.5;', `            stabMod = ${call('phnnHackMultiplier')}('stab', 1.5);`);
	add('for (let i = 0; i < 16; i++) {', `for (let i = 0; i < ${call('phnnHackRollCount')}(16); i++) {`, true);
	add(
		'Math.floor((baseDamage * (85 + i)) / 100);',
		`Math.floor((baseDamage * ${call('phnnHackRollValue')}(i, 85)) / ${call('phnnHackRollDen')}(100));`,
		true,
	);
	add('damage[i] = Math.floor(damage[i] * stabMod);', `damage[i] = ${call('phnnHackStabApply')}(damage[i], stabMod);`);
	add('newFinalDamage = Math.floor(newFinalDamage * stabMod);', `newFinalDamage = ${call('phnnHackStabApply')}(newFinalDamage, stabMod);`);
	add(
		'        basePower = Math.floor(basePower * 1.1);\n        desc.attackerItem = attacker.item;',
		`        basePower = ${call('phnnHackItemApply')}(attacker.item, basePower, Math.floor(basePower * 1.1));\n        desc.attackerItem = attacker.item;`,
	);
	add(
		'        basePower = Math.floor(basePower * 1.2);\n        desc.attackerItem = attacker.item;',
		`        basePower = ${call('phnnHackItemApply')}(attacker.item, basePower, Math.floor(basePower * 1.2));\n        desc.attackerItem = attacker.item;`,
	);
	add(
		`    if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
        (field.hasWeather('Rain') && move.hasType('Water'))) {
        baseDamage = Math.floor(baseDamage * 1.5);`,
		`    const phnnWeather = ${call('phnnHackWeather')}(field.weather, move.type);
    if (phnnWeather !== undefined) {
        if (phnnWeather !== 1) {
            baseDamage = ${call('phnnHackModify')}(baseDamage, phnnWeather);
            desc.weather = field.weather;
        }
        if (move.named('Solar Beam') && field.hasWeather('Rain', 'Sand', 'Hail')) {
            baseDamage = Math.floor(baseDamage * 0.5);
            desc.weather = field.weather;
        }
    }
    else if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
        (field.hasWeather('Rain') && move.hasType('Water'))) {
        baseDamage = Math.floor(baseDamage * 1.5);`,
	);
	add(
		'        else {\n            baseDamage *= 2;\n        }\n        desc.isCritical = isCritical;',
		`        else {\n            baseDamage = ${call('phnnHackApply')}('critMultiplier', baseDamage, baseDamage * 2);\n        }\n        desc.isCritical = isCritical;`,
	);
	add(
		'        baseDamage = Math.floor(baseDamage * 1.3);\n        desc.attackerItem',
		`        baseDamage = ${call('phnnHackItemFloor')}(attacker.item, baseDamage, Math.floor(baseDamage * 1.3));\n        desc.attackerItem`,
	);
	add(
		'    const simpleMod = Math.min(6, Math.max(-6, mod * 2));\n',
		`    const simpleMod = Math.min(6, Math.max(-6, mod * 2));\n    const phnnStaged = ${call('phnnHackStageStat')}(stat, simpleMod);\n    if (phnnStaged !== undefined)\n        return phnnStaged;\n`,
	);
	HACK_PATCHES.push(...out);
}

{
	const { call, add, out } = hackEngine(
		'gen56.js', 'util_2',
		'function calculateBWXY(gen, attacker, defender, move, field, mods) {\n    // #region Initial\n    var _a, _b, _c;\n',
	);
	add('for (let i = 0; i < 16; i++) {', `for (let i = 0; i < ${call('phnnHackRollCount')}(16); i++) {`, true);
	add(
		'    if (attacker.item && (0, items_1.getItemBoostType)(attacker.item) === move.type) {\n        bpMods.push(4915);',
		`    if (attacker.item && (0, items_1.getItemBoostType)(attacker.item) === move.type) {\n        bpMods.push(${call('phnnHackItemMod')}(attacker.item, 4915));`,
	);
	add('        bpMods.push(4505);\n        desc.attackerItem', `        bpMods.push(${call('phnnHackItemMod')}(attacker.item, 4505));\n        desc.attackerItem`);
	add('        finalMods.push(4915);\n        desc.attackerItem', `        finalMods.push(${call('phnnHackItemMod')}(attacker.item, 4915));\n        desc.attackerItem`);
	add('        finalMods.push(5324);\n        desc.attackerItem', `        finalMods.push(${call('phnnHackItemMod')}(attacker.item, 5324));\n        desc.attackerItem`);
	add(
		`    if ((field.hasWeather('Sun', 'Harsh Sunshine') && move.hasType('Fire')) ||
        (field.hasWeather('Rain', 'Heavy Rain') && move.hasType('Water'))) {
        baseDamage = (0, util_2.pokeRound)((0, util_2.OF32)(baseDamage * 6144) / 4096);`,
		`    const phnnWeather = ${call('phnnHackWeather')}(field.weather, move.type);
    if (phnnWeather !== undefined) {
        if (phnnWeather !== 1) {
            baseDamage = ${call('phnnHackModify')}(baseDamage, phnnWeather);
            desc.weather = field.weather;
        }
    }
    else if ((field.hasWeather('Sun', 'Harsh Sunshine') && move.hasType('Fire')) ||
        (field.hasWeather('Rain', 'Heavy Rain') && move.hasType('Water'))) {
        baseDamage = (0, util_2.pokeRound)((0, util_2.OF32)(baseDamage * 6144) / 4096);`,
	);
	add(
		'baseDamage * (gen.num > 5 ? 1.5 : 2)));',
		`baseDamage * ${call('phnnHackMultiplier')}('critMultiplier', gen.num > 5 ? 1.5 : 2)));`,
	);
	HACK_PATCHES.push(...out);
}

{
	const { call, add, out } = hackEngine(
		'gen789.js', 'util_2',
		'function calculateSMSSSV(gen, attacker, defender, move, field, mods) {\n    // #region Initial\n    var _a, _b;\n',
	);
	add('for (let i = 0; i < 16; i++) {', `for (let i = 0; i < ${call('phnnHackRollCount')}(16); i++) {`, true);
	add(
		"attacker.hasItem('Polkadot Bow'))) ? 4506 : 4915);",
		`attacker.hasItem('Polkadot Bow'))) ? 4506 : ${call('phnnHackItemMod')}(attacker.item, 4915));`,
	);
	add('        bpMods.push(4505);\n        desc.attackerItem', `        bpMods.push(${call('phnnHackItemMod')}(attacker.item, 4505));\n        desc.attackerItem`);
	add('        finalMods.push(4915);\n        desc.attackerItem', `        finalMods.push(${call('phnnHackItemMod')}(attacker.item, 4915));\n        desc.attackerItem`);
	add('        finalMods.push(5324);\n        desc.attackerItem', `        finalMods.push(${call('phnnHackItemMod')}(attacker.item, 5324));\n        desc.attackerItem`);
	add(
		`    const isMegaSol = attacker.hasAbility('Mega Sol');
    if ((field.hasWeather('Sun') || isMegaSol) &&
        move.named('Hydro Steam') &&`,
		`    const isMegaSol = attacker.hasAbility('Mega Sol');
    const phnnWeather = isMegaSol || move.named('Hydro Steam')
        ? undefined : ${call('phnnHackWeather')}(field.weather, move.type);
    if (phnnWeather !== undefined) {
        if (phnnWeather !== 1 && !defender.hasItem('Utility Umbrella')) {
            baseDamage = ${call('phnnHackModify')}(baseDamage, phnnWeather);
            desc.weather = field.weather;
        }
    }
    else if ((field.hasWeather('Sun') || isMegaSol) &&
        move.named('Hydro Steam') &&`,
	);
	add(
		'globalThis.__phnnCalc.critModifier) || 1.5)));',
		`globalThis.__phnnCalc.critModifier) || ${call('phnnHackMultiplier')}('critMultiplier', 1.5))));`,
	);
	HACK_PATCHES.push(...out);
}

HACK_PATCHES.push(...hackEngine(
	'champions.js', 'util_2',
	'function calculateChampions(gen, attacker, defender, move, field) {\n    // #region Initial\n',
).out);

{
	const fraction = '(0, util_2.phnnHackHpFraction)';
	const add = (find, replace) => HACK_PATCHES.push({ file: '../desc.js', find, replace });
	add(
		'    const eot = getEndOfTurn(gen, attacker, defender, move, field);',
		'    (0, util_2.phnnHackEnter)(gen);\n    const eot = getEndOfTurn(gen, attacker, defender, move, field);',
	);
	add(
		"            damage -= Math.floor(defender.maxHP() / (gen.num === 2 ? 8 : 16));\n            texts.push('sandstorm damage');",
		`            damage -= ${fraction}('sandDamage', defender.maxHP(), Math.floor(defender.maxHP() / (gen.num === 2 ? 8 : 16)));\n            texts.push('sandstorm damage');`,
	);
	add(
		"            damage -= Math.floor(defender.maxHP() / 16);\n            texts.push('hail damage');",
		`            damage -= ${fraction}('hailDamage', defender.maxHP(), Math.floor(defender.maxHP() / 16));\n            texts.push('hail damage');`,
	);
	add(
		"        damage += Math.floor(defender.maxHP() / 16);\n        texts.push('Leftovers recovery');",
		`        damage += ${fraction}('items.leftovers.healFraction', defender.maxHP(), Math.floor(defender.maxHP() / 16));\n        texts.push('Leftovers recovery');`,
	);
	add(
		"            damage -= Math.floor(defender.maxHP() / (gen.num === 0 || gen.num >= 2 ? 8 : 16));\n            texts.push('Leech Seed damage');",
		`            damage -= ${fraction}('leechSeedDamage', defender.maxHP(), Math.floor(defender.maxHP() / (gen.num === 0 || gen.num >= 2 ? 8 : 16)));\n            texts.push('Leech Seed damage');`,
	);
	add(
		'        let recovery = Math.floor(attacker.maxHP() / (gen.num === 0 || gen.num >= 2 ? 8 : 16));',
		`        let recovery = ${fraction}('leechSeedDamage', attacker.maxHP(), Math.floor(attacker.maxHP() / (gen.num === 0 || gen.num >= 2 ? 8 : 16)));`,
	);
	add(
		"            damage -= Math.floor(defender.maxHP() / (gen.num === 1 ? 16 : 8));\n            texts.push('poison damage');",
		`            damage -= ${fraction}('poisonDamage', defender.maxHP(), Math.floor(defender.maxHP() / (gen.num === 1 ? 16 : 8)));\n            texts.push('poison damage');`,
	);
	add(
		"            damage -= Math.floor(defender.maxHP() / (gen.num < 2 || gen.num > 6 ? 16 : 8));\n            texts.push('burn damage');",
		`            damage -= ${fraction}('burnDamage', defender.maxHP(), Math.floor(defender.maxHP() / (gen.num < 2 || gen.num > 6 ? 16 : 8)));\n            texts.push('burn damage');`,
	);
	add(
		`            damage -= gen.num === 0 || gen.num > 5
                ? Math.floor(defender.maxHP() / 8) : Math.floor(defender.maxHP() / 16);`,
		`            damage -= ${fraction}('bindDamage', defender.maxHP(), gen.num === 0 || gen.num > 5
                ? Math.floor(defender.maxHP() / 8) : Math.floor(defender.maxHP() / 16));`,
	);
	add(
		'globalThis.__phnnCalc.toxicTick(toxicCounter, maxHP) : Math.floor((toxicCounter * maxHP) / 16));',
		`globalThis.__phnnCalc.toxicTick(toxicCounter, maxHP) : ${fraction}('toxicStep', toxicCounter * maxHP, Math.floor((toxicCounter * maxHP) / 16)));`,
	);
	add(
		'globalThis.__phnnCalc.toxicTick((toxicCounter + i), maxHP) : Math.floor(((toxicCounter + i) * maxHP) / 16));',
		`globalThis.__phnnCalc.toxicTick((toxicCounter + i), maxHP) : ${fraction}('toxicStep', (toxicCounter + i) * maxHP, Math.floor(((toxicCounter + i) * maxHP) / 16)));`,
	);
	add(
		'globalThis.__phnnCalc.toxicTick((toxicCounter + (hits - 1)), maxHP) : Math.floor(((toxicCounter + (hits - 1)) * maxHP) / 16));',
		`globalThis.__phnnCalc.toxicTick((toxicCounter + (hits - 1)), maxHP) : ${fraction}('toxicStep', (toxicCounter + (hits - 1)) * maxHP, Math.floor(((toxicCounter + (hits - 1)) * maxHP) / 16)));`,
	);
}

PATCHES.push(...HACK_PATCHES);

const MOVED = [
	{
		file: 'gen12.js',
		from: '        return globalThis.__phnnCalc.spaceworld(gen, attacker, defender, move, field, mods);\n    }\n    (0, util_1.phnnHackEnter)(gen);\n',
		to: '        return globalThis.__phnnCalc.spaceworld(gen, attacker, defender, move, field, mods);\n    }\n',
	},
];

for (const { file, from, to } of MOVED) {
	const target = path.join(DIST, file);
	const src = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';

	if (src.includes(from)) {
		fs.writeFileSync(target, src.replace(from, () => to));
		console.log('patch-calc:', file, 'moved');
	}
}

let ok = true;

for (const { file, find, replace, all, done } of PATCHES) {
	const target = path.join(DIST, file);

	if (!fs.existsSync(target)) {
		console.error('patch-calc: missing', target);
		ok = false;
		continue;
	}

	let src = fs.readFileSync(target, 'utf8');

	if (src.includes(replace) || (done && src.includes(done))) {
		console.log('patch-calc:', file, 'already patched');
		continue;
	}

	if (!src.includes(find)) {
		console.error('patch-calc:', file, 'anchor not found (upstream changed?)');
		ok = false;
		continue;
	}

	src = all ? src.split(find).join(replace) : src.replace(find, () => replace);
	fs.writeFileSync(target, src);
	console.log('patch-calc:', file, 'patched');
}

if (!ok) {
	process.exitCode = 1;
}
