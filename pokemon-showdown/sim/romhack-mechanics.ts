export type Fraction = [number, number];
export type Range = [number, number];
export type WeatherKey = 'rain' | 'sun' | 'sand' | 'hail';
export type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export interface RomHackItemParams {
	powerBoost?: number;
	accuracyMod?: number;
	accuracyMinus255?: number;
	chance?: Fraction;
	healFraction?: Fraction;
	healFlat?: number;
	critStages?: number;
}

export interface RomHackAbilityParams {
	damageFraction?: Fraction;
	healFraction?: Fraction;
	chance?: Fraction;
}

export interface RomHackMechanics {
	critChances?: Fraction[];
	critMultiplier?: number;
	stab?: number;
	damageRoll?: { min: number, max: number, den: number };
	damageLevelDivisor?: number;
	damageDivisor?: number;
	statStages?: Fraction[];
	accuracyStages?: Fraction[];
	multiHit?: [number, number, number, number];
	protectRates?: Fraction[];
	natureMultipliers?: { plus?: Fraction, minus?: Fraction };
	natures?: { [natureId: string]: { plus?: StatKey, minus?: StatKey } };

	weatherTurns?: { rain?: number, sun?: number, sand?: number, hail?: number };
	weatherRockTurns?: { rain?: number, sun?: number, sand?: number, hail?: number };
	abilityWeatherTurns?: number;
	weatherMoveModifiers?: { weather: 'rain' | 'sun', type: string, multiplier: number }[];
	sandDamage?: Fraction;
	hailDamage?: Fraction;
	sandImmuneTypes?: string[];

	sleepTurns?: Range;
	restSleepTurns?: number;
	confusionTurns?: Range;
	confusionSelfHitChance?: Fraction;
	confusionSelfHitPower?: number;
	attractChance?: Fraction;
	fullParalysisChance?: Fraction;
	paralysisSpeed?: number;
	burnAttack?: number;
	thawChance?: Fraction;
	burnDamage?: Fraction;
	poisonDamage?: Fraction;
	toxicStep?: Fraction;

	leechSeedDamage?: Fraction;
	bindDamage?: Fraction;
	nightmareDamage?: Fraction;
	curseDamage?: Fraction;
	spikesDamage?: Fraction;
	ingrainHeal?: Fraction;

	screenTurns?: { reflect?: number, lightscreen?: number, safeguard?: number, mist?: number };
	screenClayTurns?: number;
	trapTurns?: Range;
	trapTurnsGripClaw?: number;
	tauntTurns?: Range;
	disableTurns?: Range;
	encoreTurns?: Range;
	uproarTurns?: Range;
	thrashTurns?: Range;
	bideTurns?: Range;
	perishCount?: number;
	futureSightTurns?: number;

	healMoveFraction?: Fraction;
	recoilFractions?: { quarter?: Fraction, third?: Fraction, half?: Fraction };
	struggleRecoil?: Fraction;
	substituteCost?: Fraction;
	wishHeal?: Fraction;
	bellyDrumCost?: Fraction;
	curseCost?: Fraction;
	superFangFraction?: Fraction;
	presentHeal?: Fraction;
	sonicBoomDamage?: number;
	dragonRageDamage?: number;
	thunderAccuracy?: { rain?: number | true, sun?: number | true };
	weatherHeal?: Fraction[];
	focusEnergyCritStages?: number;
	flailPower?: [number, number][];
	magnitudePower?: [number, number, number][];
	presentPower?: [number, number][];

	highCritMoves?: string[];
	gen1Crit?: { normal?: number, high?: number, focusEnergy?: number, focusEnergyHigh?: number, cap?: 255 | 256 };
	miss1in256?: boolean;
	healFailsAtGap255?: boolean;
	invulnerabilityGlitch?: boolean;
	category?: { basis: 'type', specialTypes: string[] } | { basis: 'move', specialMoves: string[] };
	trapHits?: [number, number, number, number];

	items?: { [itemId: string]: RomHackItemParams };
	abilities?: { [abilityId: string]: RomHackAbilityParams };
}

export interface RomHackEngineTables {
	multiHitSample?: number[];
	accPercent?: number[];
	accUp?: number[];
	accNeg?: number[];
	accDown?: number[];
}

export interface RomHackMechanicsInstall {
	mechanics: RomHackMechanics;
	engine: RomHackEngineTables;
	applied: string[];
	unapplied: string[];
}

type Handler = (this: any, ...args: any[]) => any;
type Table = { [k: string]: any };

const GROUPS = ['weatherTurns', 'weatherRockTurns', 'screenTurns', 'natureMultipliers', 'recoilFractions',
	'thunderAccuracy', 'gen1Crit', 'natures'];
const DEEP_GROUPS = ['items', 'abilities'];

function isObject(value: any): value is Table {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function romHackMechanicsLeaves(mechanics: any): string[] {
	const leaves: string[] = [];
	if (!isObject(mechanics)) return leaves;
	for (const key in mechanics) {
		const value = mechanics[key];
		if (value === undefined || value === null) continue;
		if (GROUPS.includes(key) && isObject(value)) {
			for (const sub in value) leaves.push(`${key}.${sub}`);
		} else if (DEEP_GROUPS.includes(key) && isObject(value)) {
			for (const id in value) {
				if (!isObject(value[id])) continue;
				for (const param in value[id]) leaves.push(`${key}.${id}.${param}`);
			}
		} else {
			leaves.push(key);
		}
	}
	return leaves;
}

function isInt(value: any, min: number, max = 65535): value is number {
	return Number.isInteger(value) && value >= min && value <= max;
}
function isFraction(value: any): value is Fraction {
	return Array.isArray(value) && value.length === 2 && isInt(value[0], 0, 0xFFFFFFFF) && isInt(value[1], 1, 0xFFFFFFFF);
}
function isChance(value: any): value is Fraction {
	return isFraction(value) && value[0] <= value[1];
}
function isPart(value: any): value is Fraction {
	return isFraction(value) && value[0] >= 1 && value[0] <= value[1];
}
function isRange(value: any, min: number): value is Range {
	return Array.isArray(value) && value.length === 2 && isInt(value[0], min, 255) && isInt(value[1], value[0], 255);
}
function isMultiplier(value: any, min: number, max: number): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function isWeights(value: any): value is [number, number, number, number] {
	return Array.isArray(value) && value.length === 4 && value.every(w => isInt(w, 0, 1000)) &&
		value.reduce((a, b) => a + b, 0) > 0 && value.reduce((a, b) => a + b, 0) <= 4000;
}
function isStageTable(value: any): value is Fraction[] {
	return Array.isArray(value) && value.length === 13 && value.every(f => isFraction(f) && f[0] >= 1) &&
		value[6][0] === value[6][1];
}
function isIdList(value: any): value is string[] {
	return Array.isArray(value) && value.every(v => typeof v === 'string');
}

function swap(obj: any, name: string, make: (prev: Handler) => Handler) {
	const own = Object.prototype.hasOwnProperty.call(obj, name);
	const prev = obj[name];
	obj[name] = make(prev);
	return () => {
		if (own) {
			obj[name] = prev;
		} else {
			delete obj[name];
		}
	};
}

function scoped(orig: Handler, setup: (battle: any, args: any[]) => (() => void)[]): Handler {
	return function (this: any, ...args: any[]) {
		const undo = setup(this, args);
		try {
			return orig.apply(this, args);
		} finally {
			for (const fn of undo) fn();
		}
	};
}

function firstCall(
	method: 'randomChance' | 'random' | 'damage' | 'heal', orig: Handler,
	pick: (battle: any, args: any[], callArgs: any[]) => any[] | null | undefined
): Handler {
	return scoped(orig, (battle, args) => {
		let done = false;
		return [swap(battle, method, prev => function (this: any, ...callArgs: any[]) {
			if (!done) {
				done = true;
				const replaced = pick(battle, args, callArgs);
				if (replaced) return prev.apply(this, replaced);
			}
			return prev.apply(this, callArgs);
		})];
	});
}

function firstAmount(
	method: 'damage' | 'heal', orig: Handler, amount: (battle: any, args: any[], stock: number) => number | undefined
): Handler {
	return firstCall(method, orig, (battle, args, callArgs) => {
		const value = amount(battle, args, callArgs[0]);
		if (value === undefined) return null;
		return [value, ...callArgs.slice(1)];
	});
}

function firstChance(orig: Handler, chance: Fraction, inverted = false): Handler {
	return firstCall('randomChance', orig, () => (inverted ? [chance[1] - chance[0], chance[1]] : [chance[0], chance[1]]));
}

function modifierWrap(orig: Handler, value: number, subtract = false): Handler {
	return function (this: any, input: any, ...rest: any[]) {
		const before = this.event?.modifier;
		const result = orig.call(this, input, ...rest);
		if (this.event && this.event.modifier !== before) {
			this.event.modifier = before;
			return this.chainModify(value);
		}
		if (typeof result === 'number' && typeof input === 'number' && result !== input) {
			return subtract ? input - value : input * value;
		}
		return result;
	};
}

function fixedDuration(orig: Handler | undefined): Handler {
	return function (this: any, ...args: any[]) {
		const state = this.effectState;
		const duration = state?.duration;
		const result = orig ? orig.apply(this, args) : undefined;
		if (state && duration !== undefined) state.duration = duration;
		return result;
	};
}

function weightSample(weights: number[]) {
	const sample: number[] = [];
	for (let i = 0; i < 4; i++) {
		for (let n = 0; n < weights[i]; n++) sample.push(i + 2);
	}
	return sample;
}

const WEATHERS: [WeatherKey, string, string][] = [
	['rain', 'raindance', 'damprock'], ['sun', 'sunnyday', 'heatrock'], ['sand', 'sandstorm', 'smoothrock'],
	['hail', 'hail', 'icyrock'], ['hail', 'snowscape', 'icyrock'],
];
const POWER_HANDLERS = ['onBasePower', 'onModifyDamage', 'onModifyDamagePhase1', 'onModifyDamagePhase2',
	'onModifyAtk', 'onModifySpA'];
const ACCURACY_HANDLERS = ['onModifyAccuracy', 'onSourceModifyAccuracy'];
const FIGY_FAMILY = ['figyberry', 'wikiberry', 'magoberry', 'aguavberry', 'iapapaberry'];

export function installRomHackMechanics(gen: number, data: Table, raw: unknown): RomHackMechanicsInstall {
	const source: Table = isObject(raw) ? raw : {};
	const mechanics: Table = {};
	const engine: RomHackEngineTables = {};
	const applied: string[] = [];

	let conditionsOwned = false;
	let scriptsOwned = false;
	const conditions = () => {
		if (!conditionsOwned) {
			data.Conditions = { ...data.Conditions };
			conditionsOwned = true;
		}
		return data.Conditions as Table;
	};
	const scripts = () => {
		if (!scriptsOwned) {
			data.Scripts = { ...data.Scripts };
			scriptsOwned = true;
		}
		return data.Scripts as Table;
	};
	const keep = (path: string, value: any) => {
		const parts = path.split('.');
		let node = mechanics;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!isObject(node[parts[i]])) node[parts[i]] = {};
			node = node[parts[i]];
		}
		node[parts[parts.length - 1]] = value;
		applied.push(path);
	};
	const wrapIn = (table: Table, id: string, name: string, wrap: (orig: Handler) => Handler) => {
		const entry = table[id];
		if (!entry || typeof entry[name] !== 'function') return false;
		table[id] = { ...entry, [name]: wrap(entry[name]) };
		return true;
	};
	const wrapCondition = (id: string, name: string, wrap: (orig: Handler) => Handler) =>
		wrapIn(conditions(), id, name, wrap);
	const moveCondition = (id: string) => {
		const move = data.Moves[id];
		return move && isObject(move.condition) ? move.condition as Table : null;
	};
	const patchMoveCondition = (id: string, patch: Table) => {
		data.Moves[id] = { ...data.Moves[id], condition: { ...data.Moves[id].condition, ...patch } };
	};
	const wrapMoveCondition = (id: string, name: string, wrap: (orig: Handler) => Handler) => {
		const condition = moveCondition(id);
		if (!condition || typeof condition[name] !== 'function') return false;
		patchMoveCondition(id, { [name]: wrap(condition[name]) });
		return true;
	};

	const m = source as RomHackMechanics;

	if (gen >= 2 && Array.isArray(m.critChances) && m.critChances.length >= 1 && m.critChances.length <= 16 &&
		m.critChances.every(isChance)) {
		keep('critChances', m.critChances.map(f => [f[0], f[1]]));
	}
	if (gen >= 2 && isMultiplier(m.critMultiplier, 1, 8)) keep('critMultiplier', m.critMultiplier);
	if (isMultiplier(m.stab, 1, 8)) keep('stab', m.stab);

	if (isObject(m.damageRoll) && isInt(m.damageRoll.min, 1) && isInt(m.damageRoll.max, m.damageRoll.min) &&
		isInt(m.damageRoll.den, 1)) {
		const roll = { min: m.damageRoll.min, max: m.damageRoll.max, den: m.damageRoll.den };
		if (gen >= 3) {
			scripts().randomizer = function (this: any, baseDamage: number) {
				const tr = this.trunc;
				return tr(tr(baseDamage * this.random(roll.min, roll.max + 1)) / roll.den);
			};
		}
		keep('damageRoll', roll);
	}

	if (isStageTable(m.statStages)) {
		keep('statStages', m.statStages.map(f => [f[0], f[1]]));
	}
	if (isStageTable(m.accuracyStages)) {
		const table = m.accuracyStages.map(f => f[0] / f[1]);
		engine.accPercent = table.map(v => v * 100);
		engine.accUp = [0, 1, 2, 3, 4, 5, 6].map(k => table[6 + k]);
		engine.accNeg = [0, 1, 2, 3, 4, 5, 6].map(k => table[6 - k]);
		engine.accDown = [0, 1, 2, 3, 4, 5, 6].map(k => 1 / table[6 - k]);
		keep('accuracyStages', m.accuracyStages.map(f => [f[0], f[1]]));
	}
	if (isWeights(m.multiHit)) {
		engine.multiHitSample = weightSample(m.multiHit);
		keep('multiHit', m.multiHit.slice());
	}

	if (gen >= 3 && Array.isArray(m.protectRates) && m.protectRates.length >= 2 && m.protectRates.length <= 32 &&
		m.protectRates.every(isChance) && isObject(data.Conditions.stall)) {
		const rates = m.protectRates.map(f => [f[0], f[1]]);
		const stall = conditions().stall;
		const origStart: Handler | undefined = stall.onStart;
		const origRestart: Handler | undefined = stall.onRestart;
		conditions().stall = {
			...stall,
			onStart(this: any, ...args: any[]) {
				const result = origStart ? origStart.apply(this, args) : undefined;
				this.effectState.romHackUses = 1;
				return result;
			},
			onRestart(this: any, ...args: any[]) {
				const result = origRestart ? origRestart.apply(this, args) : undefined;
				this.effectState.romHackUses = (this.effectState.romHackUses || 1) + 1;
				this.effectState.duration = 2;
				return result;
			},
			onStallMove(this: any, pokemon: any) {
				const rate = rates[Math.min(this.effectState.romHackUses || 1, rates.length - 1)];
				const success = this.randomChance(rate[0], rate[1]);
				if (!success) delete pokemon.volatiles['stall'];
				return success;
			},
		};
		keep('protectRates', rates);
	}

	if (gen >= 3 && isObject(m.natureMultipliers)) {
		const plus = isFraction(m.natureMultipliers.plus) && m.natureMultipliers.plus[0] >= 1 ? m.natureMultipliers.plus : null;
		const lowered = m.natureMultipliers.minus;
		const minus = isFraction(lowered) && lowered[0] >= 1 ? lowered : null;
		if (plus || minus) {
			const plusPercent = plus ? plus[0] * 100 / plus[1] : 110;
			const minusPercent = minus ? minus[0] * 100 / minus[1] : 90;
			const table = scripts();
			const inherited: Handler | undefined = table.statModify;
			table.statModify = function (this: any, baseStats: any, set: any, statName: string) {
				const stock: Handler = inherited || Object.getPrototypeOf(this).statModify;
				const nature = this.dex.natures.get(set.nature);
				if (statName === 'hp' || (nature.plus !== statName && nature.minus !== statName)) {
					return stock.call(this, baseStats, set, statName);
				}
				const tr = this.trunc;
				let stat = stock.call(this, baseStats, { ...set, nature: '' }, statName);
				if (nature.plus === statName) {
					stat = this.ruleTable.has('overflowstatmod') ? Math.min(stat, 595) : stat;
					stat = tr(tr(stat * plusPercent, 16) / 100);
				} else {
					stat = this.ruleTable.has('overflowstatmod') ? Math.min(stat, 728) : stat;
					stat = tr(tr(stat * minusPercent, 16) / 100);
				}
				return stat;
			};
			if (plus) keep('natureMultipliers.plus', [plus[0], plus[1]]);
			if (minus) keep('natureMultipliers.minus', [minus[0], minus[1]]);
		}
	}
	if (gen >= 3 && isObject(m.natures)) {
		const stats = ['atk', 'def', 'spa', 'spd', 'spe'];
		let owned = false;
		for (const id in m.natures) {
			const change = m.natures[id];
			const stock = data.Natures[id];
			if (!stock || !isObject(change)) continue;
			if (change.plus !== undefined && !stats.includes(change.plus)) continue;
			if (change.minus !== undefined && !stats.includes(change.minus)) continue;
			if (!owned) {
				data.Natures = { ...data.Natures };
				owned = true;
			}
			const nature: Table = { name: stock.name };
			if (change.plus && change.minus && change.plus !== change.minus) {
				nature.plus = change.plus;
				nature.minus = change.minus;
			}
			data.Natures[id] = nature;
			keep(`natures.${id}`, { ...change });
		}
	}

	if (gen >= 2) {
		const turns: Table = isObject(m.weatherTurns) ? m.weatherTurns : {};
		const rockTurns: Table = gen >= 4 && isObject(m.weatherRockTurns) ? m.weatherRockTurns : {};
		const abilityTurns = gen >= 3 && isInt(m.abilityWeatherTurns, 0, 255) ? m.abilityWeatherTurns : undefined;
		let abilityApplied = false;
		for (const [key, id, rock] of WEATHERS) {
			if (key === 'hail' && gen < 3) continue;
			const condition = data.Conditions[id];
			if (!isObject(condition) || condition.effectType !== 'Weather') continue;
			const plain: number | undefined = isInt(turns[key], 1, 255) ? turns[key] : undefined;
			const withRock: number | undefined = isInt(rockTurns[key], 1, 255) ? rockTurns[key] : undefined;
			if (plain === undefined && withRock === undefined && abilityTurns === undefined) continue;
			const origDuration: Handler | undefined = condition.durationCallback;
			const stockDuration: number = condition.duration;
			const stock = function (this: any, args: any[]) {
				return origDuration ? origDuration.apply(this, args) : stockDuration;
			};
			const patch: Table = {
				durationCallback(this: any, ...args: any[]) {
					const base = stock.call(this, args);
					if (args[1]?.hasItem(rock)) return withRock ?? base;
					if (args[2]?.effectType === 'Ability') return base;
					return plain ?? base;
				},
			};
			if (plain !== undefined) patch.duration = plain;
			if (abilityTurns !== undefined && typeof condition.onFieldStart === 'function') {
				const origStart: Handler = condition.onFieldStart;
				patch.onFieldStart = function (this: any, field: any, user: any, effect: any) {
					const result = origStart.call(this, field, user, effect);
					if (effect?.effectType === 'Ability') {
						if (abilityTurns === 0) {
							this.effectState.duration = 0;
						} else if (user?.hasItem(rock)) {
							this.effectState.duration = withRock ?? stock.call(this, [user, user, effect]);
						} else {
							this.effectState.duration = abilityTurns;
						}
					}
					return result;
				};
				abilityApplied = true;
			}
			conditions()[id] = { ...condition, ...patch };
			if (plain !== undefined && !applied.includes(`weatherTurns.${key}`)) keep(`weatherTurns.${key}`, plain);
			if (withRock !== undefined && !applied.includes(`weatherRockTurns.${key}`)) keep(`weatherRockTurns.${key}`, withRock);
		}
		if (abilityApplied) keep('abilityWeatherTurns', abilityTurns);

		if (Array.isArray(m.weatherMoveModifiers) && m.weatherMoveModifiers.every(row => isObject(row) &&
			(row.weather === 'rain' || row.weather === 'sun') && typeof row.type === 'string' &&
			isMultiplier(row.multiplier, 0, 8))) {
			const rows = m.weatherMoveModifiers.map(row => ({ weather: row.weather, type: row.type, multiplier: row.multiplier }));
			let ok = gen === 2;
			if (gen >= 3) {
				for (const [key, id] of [['rain', 'raindance'], ['sun', 'sunnyday']]) {
					ok = wrapCondition(id, 'onWeatherModifyDamage', orig => function (this: any, damage, attacker, defender, move) {
						if (move.id === 'hydrosteam') return orig.call(this, damage, attacker, defender, move);
						if (defender.effectiveWeather() !== id) return;
						const row = rows.find(r => r.weather === key && r.type === move.type);
						if (row && row.multiplier !== 1) return this.chainModify(row.multiplier);
					}) || ok;
				}
			}
			if (ok) keep('weatherMoveModifiers', rows);
		}
		if (isPart(m.sandDamage)) {
			const [n, d] = m.sandDamage;
			if (wrapCondition('sandstorm', 'onWeather', orig => firstAmount('damage', orig,
				(battle, args) => args[0].baseMaxhp * n / d))) keep('sandDamage', [n, d]);
		}
		if (gen >= 3 && isPart(m.hailDamage)) {
			const [n, d] = m.hailDamage;
			if (wrapCondition('hail', 'onWeather', orig => firstAmount('damage', orig,
				(battle, args) => args[0].baseMaxhp * n / d))) keep('hailDamage', [n, d]);
		}
	}

	const sleepOffset = gen === 1 ? 0 : 1;
	if (isRange(m.sleepTurns, 1)) {
		const [min, max] = m.sleepTurns;
		if (wrapCondition('slp', 'onStart', orig => firstCall('random', orig,
			() => [min + sleepOffset, max + sleepOffset + 1]))) keep('sleepTurns', [min, max]);
	}
	if (isInt(m.restSleepTurns, 1, 255) && data.Moves.rest && typeof data.Moves.rest.onHit === 'function') {
		keep('restSleepTurns', m.restSleepTurns);
	}
	if (isRange(m.confusionTurns, 1)) {
		const [min, max] = m.confusionTurns;
		if (wrapCondition('confusion', 'onStart', orig => firstCall('random', orig, (battle, args, callArgs) => {
			const low = callArgs[0] > 2 ? Math.max(callArgs[0], min + 1) : min + 1;
			return [low, Math.max(low + 1, max + 2)];
		}))) keep('confusionTurns', [min, max]);
	}
	if (isChance(m.confusionSelfHitChance)) {
		const chance: Fraction = [m.confusionSelfHitChance[0], m.confusionSelfHitChance[1]];
		if (wrapCondition('confusion', 'onBeforeMove', orig => firstChance(orig, chance, gen <= 6))) {
			keep('confusionSelfHitChance', chance);
		}
	}
	if (isInt(m.confusionSelfHitPower, 1, 255)) {
		const power = m.confusionSelfHitPower;
		if (gen === 1) {
			keep('confusionSelfHitPower', power);
		} else if (wrapCondition('confusion', 'onBeforeMove', orig => scoped(orig, battle => [
			swap(battle.actions, 'getDamage', prev => function (this: any, user: any, target: any, move: any, ...rest: any[]) {
				if (typeof move === 'number') {
					move = power;
				} else if (move?.isConfusionSelfHit) {
					move.basePower = power;
				}
				return prev.call(this, user, target, move, ...rest);
			}),
			swap(battle.actions, 'getConfusionDamage', prev => function (this: any, user: any) {
				return prev.call(this, user, power);
			}),
		]))) {
			keep('confusionSelfHitPower', power);
		}
	}
	if (gen >= 2 && isChance(m.attractChance)) {
		const chance: Fraction = [m.attractChance[0], m.attractChance[1]];
		if (wrapMoveCondition('attract', 'onBeforeMove', orig => firstChance(orig, chance))) keep('attractChance', chance);
	}
	if (isChance(m.fullParalysisChance)) {
		const chance: Fraction = [m.fullParalysisChance[0], m.fullParalysisChance[1]];
		if (wrapCondition('par', 'onBeforeMove', orig => firstChance(orig, chance))) keep('fullParalysisChance', chance);
	}
	if (isMultiplier(m.paralysisSpeed, 0.01, 1)) {
		const speed = m.paralysisSpeed;
		if (gen <= 2) {
			keep('paralysisSpeed', speed);
		} else if (gen <= 4) {
			if (wrapCondition('par', 'onModifySpe', orig => modifierWrap(orig, speed))) keep('paralysisSpeed', speed);
		} else if (wrapCondition('par', 'onModifySpe', () => function (this: any, spe: number, pokemon: any) {
			spe = this.finalModify(spe);
			if (!pokemon.hasAbility('quickfeet')) spe = Math.floor(spe * speed);
			return spe;
		})) {
			keep('paralysisSpeed', speed);
		}
	}
	if (isMultiplier(m.burnAttack, 0.01, 1)) keep('burnAttack', m.burnAttack);
	if (gen >= 2 && isChance(m.thawChance)) {
		const chance: Fraction = [m.thawChance[0], m.thawChance[1]];
		if (wrapCondition('frz', gen === 2 ? 'onResidual' : 'onBeforeMove', orig => firstChance(orig, chance))) {
			keep('thawChance', chance);
		}
	}

	const toxicStep = isPart(m.toxicStep) ? m.toxicStep : null;
	for (const [key, id] of [['burnDamage', 'brn'], ['poisonDamage', 'psn']] as const) {
		const fraction = isPart(m[key]) ? m[key] : null;
		if (gen >= 3) {
			if (!fraction) continue;
			if (wrapCondition(id, 'onResidual', orig => firstAmount('damage', orig,
				(battle, args) => args[0].baseMaxhp * fraction[0] / fraction[1]))) keep(key, [fraction[0], fraction[1]]);
			continue;
		}
		if (!fraction && !(gen === 2 && toxicStep)) continue;
		let ok = false;
		for (const name of ['onAfterMoveSelf', 'onAfterSwitchInSelf']) {
			ok = wrapCondition(id, name, orig => firstAmount('damage', orig, (battle, args) => {
				const pokemon = args[0];
				const counter = pokemon.volatiles['residualdmg'];
				if (gen === 1) {
					if (!fraction) return undefined;
					const times = name === 'onAfterMoveSelf' && counter ? counter.counter : 1;
					return battle.clampIntRange(Math.floor(pokemon.maxhp * fraction[0] / fraction[1]), 1) * times;
				}
				if (counter) {
					if (!toxicStep) return undefined;
					return battle.clampIntRange(Math.floor(pokemon.maxhp * toxicStep[0] / toxicStep[1]) * counter.counter, 1);
				}
				if (!fraction) return undefined;
				return battle.clampIntRange(Math.floor(pokemon.maxhp * fraction[0] / fraction[1]), 1);
			})) || ok;
		}
		if (ok && fraction) keep(key, [fraction[0], fraction[1]]);
	}
	if (toxicStep) {
		const [n, d] = toxicStep;
		let ok = false;
		if (gen >= 3) {
			ok = wrapCondition('tox', 'onResidual', orig => firstAmount('damage', orig,
				(battle, args) => battle.clampIntRange(args[0].baseMaxhp * n / d, 1) * battle.effectState.stage));
		} else {
			ok = wrapCondition('tox', 'onAfterMoveSelf', orig => firstAmount('damage', orig, (battle, args) => {
				const counter = args[0].volatiles['residualdmg'];
				return battle.clampIntRange(Math.floor(args[0].maxhp * n / d), 1) * (counter ? counter.counter : 1);
			}));
			ok = wrapCondition('tox', 'onAfterSwitchInSelf', orig => firstAmount('damage', orig,
				(battle, args) => battle.clampIntRange(Math.floor(args[0].maxhp * n / d), 1))) || ok;
		}
		if (ok) keep('toxicStep', [n, d]);
	}

	if (isPart(m.leechSeedDamage)) {
		const [n, d] = m.leechSeedDamage;
		let ok = false;
		if (gen === 1) {
			const amount = (battle: any, args: any[]) => {
				const counter = args[0].volatiles['residualdmg'];
				return battle.clampIntRange(Math.floor(args[0].baseMaxhp * n / d), 1) * (counter ? counter.counter : 1);
			};
			ok = wrapMoveCondition('leechseed', 'onAfterMoveSelf',
				orig => firstAmount('heal', firstAmount('damage', orig, amount), amount));
		} else if (gen === 2) {
			ok = wrapMoveCondition('leechseed', 'onAfterMoveSelf', orig => firstAmount('damage', orig,
				(battle, args) => battle.clampIntRange(args[0].maxhp * n / d, 1)));
		} else {
			ok = wrapMoveCondition('leechseed', 'onResidual', orig => firstAmount('damage', orig,
				(battle, args) => args[0].baseMaxhp * n / d));
		}
		if (ok) keep('leechSeedDamage', [n, d]);
	}
	if (gen >= 2 && isPart(m.bindDamage)) {
		const [n, d] = m.bindDamage;
		const condition = data.Conditions.partiallytrapped;
		if (isObject(condition) && typeof condition.onStart === 'function' && typeof condition.onResidual === 'function' &&
			String(condition.onResidual).includes('boundDivisor')) {
			wrapCondition('partiallytrapped', 'onStart', orig => function (this: any, pokemon: any, user: any, ...rest: any[]) {
				const result = orig.call(this, pokemon, user, ...rest);
				if (this.effectState && !user?.hasItem('bindingband')) this.effectState.boundDivisor = d / n;
				return result;
			});
			keep('bindDamage', [n, d]);
		}
	}
	for (const [key, id] of [['nightmareDamage', 'nightmare'], ['curseDamage', 'curse']] as const) {
		const fraction = m[key];
		if (gen < 2 || !isPart(fraction)) continue;
		if (wrapMoveCondition(id, gen === 2 ? 'onAfterMoveSelf' : 'onResidual', orig => firstAmount('damage', orig,
			(battle, args) => args[0].baseMaxhp * fraction[0] / fraction[1]))) keep(key, [fraction[0], fraction[1]]);
	}
	if (gen >= 3 && isPart(m.ingrainHeal)) {
		const [n, d] = m.ingrainHeal;
		if (wrapMoveCondition('ingrain', 'onResidual', orig => firstAmount('heal', orig,
			(battle, args) => args[0].baseMaxhp * n / d))) keep('ingrainHeal', [n, d]);
	}

	if (gen >= 2) {
		const screens: Table = isObject(m.screenTurns) ? m.screenTurns : {};
		const clay = gen >= 4 && isInt(m.screenClayTurns, 1, 255) ? m.screenClayTurns : undefined;
		let clayApplied = false;
		for (const id of ['reflect', 'lightscreen', 'safeguard', 'mist']) {
			const condition = moveCondition(id);
			if (!condition || typeof condition.duration !== 'number') continue;
			const plain: number | undefined = isInt(screens[id], 1, 255) ? screens[id] : undefined;
			const withClay = id === 'reflect' || id === 'lightscreen' ? clay : undefined;
			if (plain === undefined && withClay === undefined) continue;
			const origDuration: Handler | undefined = condition.durationCallback;
			const stockDuration: number = condition.duration;
			const patch: Table = {
				durationCallback(this: any, target: any, user: any, effect: any) {
					const stock = origDuration ? origDuration.call(this, target, user, effect) : stockDuration;
					if (id === 'safeguard' && user?.hasAbility('persistent')) return stock;
					if ((id === 'reflect' || id === 'lightscreen') && user?.hasItem('lightclay')) return withClay ?? stock;
					return plain ?? stock;
				},
			};
			if (plain !== undefined) patch.duration = plain;
			patchMoveCondition(id, patch);
			if (plain !== undefined) keep(`screenTurns.${id}`, plain);
			if (withClay !== undefined) clayApplied = true;
		}
		if (clayApplied) keep('screenClayTurns', clay);

		const trap = isRange(m.trapTurns, 1) ? m.trapTurns : null;
		const grip = gen >= 4 && isInt(m.trapTurnsGripClaw, 1, 255) ? m.trapTurnsGripClaw : undefined;
		const trapped = data.Conditions.partiallytrapped;
		if ((trap || grip !== undefined) && isObject(trapped) && typeof trapped.durationCallback === 'function') {
			wrapCondition('partiallytrapped', 'durationCallback', orig => function (this: any, target: any, user: any, ...rest: any[]) {
				if (user?.hasItem('gripclaw')) {
					if (grip !== undefined) return grip;
					if (gen >= 4 || !trap) return orig.call(this, target, user, ...rest);
				}
				if (trap) return trap[0] === trap[1] ? trap[0] : this.random(trap[0], trap[1] + 1);
				return orig.call(this, target, user, ...rest);
			});
			if (trap) keep('trapTurns', [trap[0], trap[1]]);
			if (grip !== undefined) keep('trapTurnsGripClaw', grip);
		}
	}
	if (gen === 1 && isWeights(m.trapHits)) {
		const sample = weightSample(m.trapHits);
		if (wrapCondition('partialtrappinglock', 'durationCallback', () => function (this: any) {
			return this.sample(sample);
		})) keep('trapHits', m.trapHits.slice());
	}

	for (const [key, id, minGen] of [
		['tauntTurns', 'taunt', 3], ['disableTurns', 'disable', 2], ['encoreTurns', 'encore', 2], ['uproarTurns', 'uproar', 3],
	] as const) {
		const range = m[key];
		if (!isRange(range, 1)) continue;
		const [min, max] = range;
		if (gen === 1 && id === 'disable') {
			if (wrapMoveCondition('disable', 'onStart', orig => firstCall('random', orig, () => [min, max + 1]))) {
				keep(key, [min, max]);
			}
			continue;
		}
		const condition = moveCondition(id);
		if (gen < minGen || !condition) continue;
		patchMoveCondition(id, {
			durationCallback(this: any) {
				return min === max ? min : this.random(min, max + 1);
			},
			onStart: fixedDuration(typeof condition.onStart === 'function' ? condition.onStart : undefined),
		});
		keep(key, [min, max]);
	}
	if (isRange(m.thrashTurns, 1)) {
		const [min, max] = m.thrashTurns;
		const pick = () => [min, max + 1];
		const ok = gen === 2 ?
			wrapCondition('lockedmove', 'durationCallback', orig => firstCall('random', orig, pick)) :
			wrapCondition('lockedmove', 'onStart', orig => firstCall('random', orig, pick));
		if (ok) keep('thrashTurns', [min, max]);
	}
	if (gen <= 2 && isRange(m.bideTurns, 1)) {
		const [min, max] = m.bideTurns;
		const pick = () => [min, max + 1];
		if (wrapMoveCondition('bide', gen === 1 ? 'onStart' : 'durationCallback', orig => firstCall('random', orig, pick))) {
			keep('bideTurns', [min, max]);
		}
	}

	const healFraction = isPart(m.healMoveFraction) ? m.healMoveFraction : null;
	if (gen === 1) {
		const noGapBug = m.healFailsAtGap255 === false;
		const restTurns: number | undefined = mechanics.restSleepTurns;
		let healed = false;
		let gapFixed = false;
		if (healFraction || noGapBug) {
			for (const id of ['recover', 'softboiled']) {
				const move = data.Moves[id];
				if (!move || typeof move.onHit !== 'function') continue;
				const orig: Handler = healFraction ? firstAmount('heal', move.onHit,
					(battle, args) => Math.floor(args[0].maxhp * healFraction[0] / healFraction[1])) : move.onHit;
				data.Moves[id] = {
					...move,
					onHit(this: any, target: any, ...rest: any[]) {
						if (noGapBug && target.hp !== target.maxhp) {
							const fraction = healFraction || [1, 2];
							this.heal(Math.floor(target.maxhp * fraction[0] / fraction[1]), target, target);
							return;
						}
						return orig.call(this, target, ...rest);
					},
				};
				if (healFraction) healed = true;
				if (noGapBug) gapFixed = true;
			}
		}
		const rest = data.Moves.rest;
		if (rest && typeof rest.onHit === 'function' && (noGapBug || restTurns !== undefined)) {
			const stockRest: Handler = rest.onHit;
			data.Moves.rest = {
				...rest,
				onHit(this: any, target: any, user: any, move: any) {
					if (noGapBug && target.hp !== target.maxhp) {
						if (!target.setStatus('slp', user, move)) return false;
						target.statusState.time = restTurns ?? 2;
						target.statusState.startTime = restTurns ?? 2;
						this.heal(target.maxhp);
						return;
					}
					const undo = restTurns === undefined ? null : swap(this, 'heal', prev => function (this: any, ...args: any[]) {
						if (target.status === 'slp') {
							target.statusState.time = restTurns;
							target.statusState.startTime = restTurns;
						}
						return prev.apply(this, args);
					});
					try {
						return stockRest.call(this, target, user, move);
					} finally {
						if (undo) undo();
					}
				},
			};
			if (noGapBug) gapFixed = true;
		} else if (restTurns !== undefined) {
			delete mechanics.restSleepTurns;
			applied.splice(applied.indexOf('restSleepTurns'), 1);
		}
		if (healed && healFraction) keep('healMoveFraction', [healFraction[0], healFraction[1]]);
		if (gapFixed) keep('healFailsAtGap255', false);

		if (m.invulnerabilityGlitch === false) {
			if (wrapCondition('par', 'onBeforeMove', orig => function (this: any, pokemon: any, ...more: any[]) {
				const undo = swap(this, 'hint', prev => function (this: any, ...args: any[]) {
					if (typeof args[0] === 'string' && args[0].includes('semi-invulnerable')) return;
					return prev.apply(this, args);
				});
				let result;
				try {
					result = orig.call(this, pokemon, ...more);
				} finally {
					undo();
				}
				if (result === false) pokemon.removeVolatile('invulnerability');
				return result;
			})) keep('invulnerabilityGlitch', false);
		}
		if (m.miss1in256 === false) keep('miss1in256', false);
		if (isObject(m.gen1Crit)) {
			for (const name of ['normal', 'high', 'focusEnergy', 'focusEnergyHigh'] as const) {
				const factor = m.gen1Crit[name];
				if (isMultiplier(factor, 0, 256)) keep(`gen1Crit.${name}`, factor);
			}
			if (m.gen1Crit.cap === 256) keep('gen1Crit.cap', 256);
		}

		const stages: Fraction[] | undefined = mechanics.statStages;
		const parSpeed: number | undefined = mechanics.paralysisSpeed;
		const burnAttack: number | undefined = mechanics.burnAttack;
		const pokemonScripts = data.Scripts.pokemon;
		if ((stages || parSpeed !== undefined || burnAttack !== undefined) && isObject(pokemonScripts) &&
			typeof pokemonScripts.boostBy === 'function' && typeof pokemonScripts.modifyStat === 'function') {
			const origBoostBy: Handler = pokemonScripts.boostBy;
			const origModifyStat: Handler = pokemonScripts.modifyStat;
			let boosting = 0;
			scripts().pokemon = {
				...pokemonScripts,
				boostBy(this: any, ...args: any[]) {
					boosting++;
					try {
						return origBoostBy.apply(this, args);
					} finally {
						boosting--;
					}
				},
				modifyStat(this: any, statName: string, modifier: number) {
					if (boosting) {
						if (stages) {
							const stage = stages[this.battle.clampIntRange(this.boosts[statName], -6, 6) + 6];
							modifier = stage[0] / stage[1];
						}
					} else if (statName === 'spe' && modifier === 0.25 && parSpeed !== undefined) {
						modifier = parSpeed;
					} else if (statName === 'atk' && modifier === 0.5 && burnAttack !== undefined) {
						modifier = burnAttack;
					}
					return origModifyStat.call(this, statName, modifier);
				},
			};
		} else {
			for (const key of ['statStages', 'paralysisSpeed', 'burnAttack']) {
				if (!(key in mechanics)) continue;
				delete mechanics[key];
				applied.splice(applied.indexOf(key), 1);
			}
		}
	} else {
		const restTurns: number | undefined = mechanics.restSleepTurns;
		if (restTurns !== undefined) {
			wrapIn(data.Moves, 'rest', 'onHit', orig => function (this: any, target: any, ...rest: any[]) {
				const undo = swap(this, 'heal', prev => function (this: any, ...args: any[]) {
					if (target.status === 'slp') {
						target.statusState.time = restTurns + 1;
						if ('startTime' in target.statusState) target.statusState.startTime = restTurns + 1;
					}
					return prev.apply(this, args);
				});
				try {
					return orig.call(this, target, ...rest);
				} finally {
					undo();
				}
			});
		}
		if (healFraction) {
			let changed = false;
			for (const id in data.Moves) {
				const heal = data.Moves[id].heal;
				if (!Array.isArray(heal) || heal[0] !== 1 || heal[1] !== 2) continue;
				data.Moves[id] = { ...data.Moves[id], heal: [healFraction[0], healFraction[1]] };
				changed = true;
			}
			if (changed) keep('healMoveFraction', [healFraction[0], healFraction[1]]);
		}
	}

	if (isObject(m.recoilFractions)) {
		const classes: [string, (recoil: number[]) => boolean][] = [
			['quarter', r => r[0] * 4 === r[1]],
			['third', r => (r[0] === 33 && r[1] === 100) || r[0] * 3 === r[1]],
			['half', r => r[0] * 2 === r[1]],
		];
		const fractions = m.recoilFractions as Table;
		const picked: [string, string][] = [];
		for (const id in data.Moves) {
			const recoil = data.Moves[id].recoil;
			if ((id === 'struggle' && gen !== 2) || !Array.isArray(recoil)) continue;
			const found = classes.find(entry => entry[1](recoil));
			if (found && isPart(fractions[found[0]])) picked.push([id, found[0]]);
		}
		for (const [id, name] of picked) {
			const fraction = fractions[name];
			data.Moves[id] = { ...data.Moves[id], recoil: [fraction[0], fraction[1]] };
			if (!applied.includes(`recoilFractions.${name}`)) keep(`recoilFractions.${name}`, [fraction[0], fraction[1]]);
		}
	}
	if (gen === 1 && isPart(m.struggleRecoil) && Array.isArray(data.Moves.struggle?.recoil)) {
		data.Moves.struggle = { ...data.Moves.struggle, recoil: [m.struggleRecoil[0], m.struggleRecoil[1]] };
		keep('struggleRecoil', [m.struggleRecoil[0], m.struggleRecoil[1]]);
	}
	for (const [key, id] of [['sonicBoomDamage', 'sonicboom'], ['dragonRageDamage', 'dragonrage']] as const) {
		const damage = m[key];
		if (!isInt(damage, 1, 65535) || typeof data.Moves[id]?.damage !== 'number') continue;
		data.Moves[id] = { ...data.Moves[id], damage };
		keep(key, damage);
	}

	if (gen <= 2 && isIdList(m.highCritMoves)) {
		const high = gen === 1 ? 2 : 3;
		const listed = new Set(m.highCritMoves);
		for (const id in data.Moves) {
			const move = data.Moves[id];
			if (listed.has(id)) {
				if (move.critRatio !== high && move.category !== 'Status') data.Moves[id] = { ...move, critRatio: high };
			} else if ((move.critRatio || 1) > 1 && move.category !== 'Status' && move.willCrit === undefined) {
				data.Moves[id] = { ...move, critRatio: 1 };
			}
		}
		keep('highCritMoves', m.highCritMoves.slice());
	}
	if (gen <= 3 && isObject(m.category)) {
		const category = m.category as Table;
		const special = category.basis === 'type' && isIdList(category.specialTypes) ? new Set<string>(category.specialTypes) :
			category.basis === 'move' && isIdList(category.specialMoves) ? new Set<string>(category.specialMoves) : null;
		if (special) {
			for (const id in data.Moves) {
				const move = data.Moves[id];
				if (!move.category || move.category === 'Status') continue;
				const wanted = special.has(category.basis === 'type' ? move.type : id) ? 'Special' : 'Physical';
				if (move.category !== wanted) data.Moves[id] = { ...move, category: wanted };
			}
			keep('category', category.basis === 'type' ?
				{ basis: 'type', specialTypes: [...special] } : { basis: 'move', specialMoves: [...special] });
		}
	}

	if (gen >= 2 && isObject(m.items)) {
		for (const id in m.items) {
			const params = m.items[id];
			if (!isObject(params) || !isObject(data.Items[id])) continue;
			const path = `items.${id}`;
			if (isMultiplier(params.powerBoost, 0.1, 8)) {
				const boost = params.powerBoost;
				let ok = false;
				for (const name of POWER_HANDLERS) ok = wrapIn(data.Items, id, name, orig => modifierWrap(orig, boost)) || ok;
				if (ok) keep(`${path}.powerBoost`, boost);
			}
			if (gen >= 3 && isMultiplier(params.accuracyMod, 0.1, 8)) {
				const mod = params.accuracyMod;
				let ok = false;
				for (const name of ACCURACY_HANDLERS) ok = wrapIn(data.Items, id, name, orig => modifierWrap(orig, mod)) || ok;
				if (ok) keep(`${path}.accuracyMod`, mod);
			}
			if (gen === 2 && id === 'brightpowder' && isInt(params.accuracyMinus255, 0, 255)) {
				const minus = params.accuracyMinus255;
				if (wrapIn(data.Items, id, 'onModifyAccuracy', orig => modifierWrap(orig, minus, true))) {
					keep(`${path}.accuracyMinus255`, minus);
				}
			}
			if (isChance(params.chance)) {
				const chance: Fraction = [params.chance[0], params.chance[1]];
				let ok = false;
				if (id === 'quickclaw') {
					ok = gen <= 3;
					for (const name of gen <= 3 ? [] : ['onFractionalPriority', 'onBeforeTurn']) {
						ok = wrapIn(data.Items, id, name, orig => firstChance(orig, chance)) || ok;
					}
				} else if (id === 'focusband') {
					ok = wrapIn(data.Items, id, 'onDamage', orig => firstChance(orig, chance));
				} else if ((id === 'kingsrock' || id === 'razorfang') && gen >= 3) {
					ok = wrapIn(data.Items, id, 'onModifyMove', orig => function (this: any, move: any, ...rest: any[]) {
						const before: any[] = move.secondaries ? move.secondaries.slice() : [];
						const result = orig.call(this, move, ...rest);
						for (const secondary of move.secondaries || []) {
							if (!before.includes(secondary) && secondary.volatileStatus === 'flinch') {
								secondary.chance = 100 * chance[0] / chance[1];
							}
						}
						return result;
					});
				}
				if (ok) keep(`${path}.chance`, chance);
			}
			if (isPart(params.healFraction)) {
				const [n, d] = params.healFraction;
				let ok = false;
				if (id === 'shellbell') {
					ok = gen >= 3 && wrapIn(data.Items, id, 'onAfterMoveSecondarySelf', orig => firstAmount('heal', orig,
						(battle, args) => args[2].totalDamage * n / d));
				} else if (id === 'leftovers') {
					ok = wrapIn(data.Items, id, 'onResidual', orig => firstAmount('heal', orig,
						(battle, args) => args[0].baseMaxhp * n / d));
				} else if ((id === 'sitrusberry' && gen >= 4) || (FIGY_FAMILY.includes(id) && gen >= 3)) {
					ok = wrapIn(data.Items, id, 'onEat', orig => firstAmount('heal', orig,
						(battle, args) => args[0].baseMaxhp * n / d));
				}
				if (ok) keep(`${path}.healFraction`, [n, d]);
			}
			if (isInt(params.healFlat, 1, 65535)) {
				const flat = params.healFlat;
				const allowed = (gen === 2 && (id === 'berry' || id === 'goldberry')) ||
					(gen === 3 && (id === 'oranberry' || id === 'sitrusberry'));
				if (allowed && wrapIn(data.Items, id, 'onEat', orig => firstAmount('heal', orig, () => flat))) {
					keep(`${path}.healFlat`, flat);
				}
			}
		}
	}
	if (gen >= 3 && isObject(m.abilities)) {
		const sites: [string, 'damageFraction' | 'healFraction' | 'chance', string[]][] = [
			['roughskin', 'damageFraction', ['onDamagingHit']],
			['raindish', 'healFraction', ['onWeather', 'onResidual']],
			['waterabsorb', 'healFraction', ['onTryHit']],
			['voltabsorb', 'healFraction', ['onTryHit']],
			['shedskin', 'chance', ['onResidual']],
		];
		for (const [id, kind, handlers] of sites) {
			const value = m.abilities[id]?.[kind];
			if (!isObject(data.Abilities[id]) || !isChance(value) || (kind !== 'chance' && !isPart(value))) continue;
			const fraction: Fraction = [value[0], value[1]];
			let ok = false;
			for (const name of handlers) {
				if (kind === 'chance') {
					ok = wrapIn(data.Abilities, id, name, orig => firstChance(orig, fraction)) || ok;
				} else {
					ok = wrapIn(data.Abilities, id, name, orig => firstAmount(kind === 'damageFraction' ? 'damage' : 'heal', orig,
						(battle, args) => (id === 'roughskin' ? args[2] : args[0]).baseMaxhp * fraction[0] / fraction[1])) || ok;
				}
			}
			if (ok) keep(`abilities.${id}.${kind}`, fraction);
		}
	}

	const unapplied = romHackMechanicsLeaves(source).filter(path => !applied.includes(path));
	return { mechanics: mechanics as RomHackMechanics, engine, applied, unapplied };
}
