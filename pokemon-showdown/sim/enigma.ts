import { toID } from './dex-data';
import type { Item } from './dex-items';

export type EnigmaParamKind = 'hp' | 'pp' | 'healdiv' | 'pinch' | 'evasion' | 'quickclaw' | 'flinch' |
	'typeboost' | 'focusband' | 'shellbell';

export interface EnigmaParse {
	preset?: string;
	base?: Item;
	param?: number;
	canonical: string;
}

export const ENIGMA_FORMATS = [
	'gen3bhaaa', 'gen9nonerfsstandard', 'gen9nonerfsextended', 'gen9nonerfscustomdisguises',
];

export const ENIGMA_REMOVERS: { gen3: string[], later: string[] } = {
	gen3: ['knockoff'],
	later: ['knockoff', 'incinerate', 'corrosivegas'],
};

export const ENIGMA_EXCLUDED_IDS: { [id: string]: string } = {
	mail: 'has no held effect',
	rustedsword: 'is tied to a forme change',
	rustedshield: 'is tied to a forme change',
	legendplate: 'is tied to a forme change',
};

export const ENIGMA_GEN3_EFFECT: { [id: string]: number } = {
	oranberry: 1, berryjuice: 1, sitrusberry: 1, cheriberry: 2, chestoberry: 3, pechaberry: 4, rawstberry: 5,
	aspearberry: 6, leppaberry: 7, persimberry: 8, lumberry: 9, figyberry: 10, wikiberry: 11, magoberry: 12,
	aguavberry: 13, iapapaberry: 14, liechiberry: 15, ganlonberry: 16, salacberry: 17, petayaberry: 18,
	apicotberry: 19, lansatberry: 20, starfberry: 21, brightpowder: 22, laxincense: 22, whiteherb: 23,
	machobrace: 24, quickclaw: 26, mentalherb: 28, choiceband: 29, kingsrock: 30, silverpowder: 31, souldew: 34,
	deepseatooth: 35, deepseascale: 36, focusband: 39, scopelens: 41, metalcoat: 42, leftovers: 43,
	dragonscale: 44, lightball: 45, softsand: 46, hardstone: 47, miracleseed: 48, blackglasses: 49,
	blackbelt: 50, magnet: 51, mysticwater: 52, seaincense: 52, sharpbeak: 53, poisonbarb: 54, nevermeltice: 55,
	spelltag: 56, twistedspoon: 57, charcoal: 58, dragonfang: 59, silkscarf: 60, upgrade: 61, shellbell: 62,
	luckypunch: 63, metalpowder: 64, thickclub: 65, stick: 66,
};

export const ENIGMA_GEN3_BASES = Object.keys(ENIGMA_GEN3_EFFECT);

export const ENIGMA_PARAM_KINDS: { [id: string]: { kind: EnigmaParamKind, stock: number } } = {
	oranberry: { kind: 'hp', stock: 10 },
	berryjuice: { kind: 'hp', stock: 20 },
	sitrusberry: { kind: 'hp', stock: 30 },
	leppaberry: { kind: 'pp', stock: 10 },
	figyberry: { kind: 'healdiv', stock: 8 },
	wikiberry: { kind: 'healdiv', stock: 8 },
	magoberry: { kind: 'healdiv', stock: 8 },
	aguavberry: { kind: 'healdiv', stock: 8 },
	iapapaberry: { kind: 'healdiv', stock: 8 },
	liechiberry: { kind: 'pinch', stock: 4 },
	ganlonberry: { kind: 'pinch', stock: 4 },
	salacberry: { kind: 'pinch', stock: 4 },
	petayaberry: { kind: 'pinch', stock: 4 },
	apicotberry: { kind: 'pinch', stock: 4 },
	lansatberry: { kind: 'pinch', stock: 4 },
	starfberry: { kind: 'pinch', stock: 4 },
	brightpowder: { kind: 'evasion', stock: 10 },
	laxincense: { kind: 'evasion', stock: 5 },
	quickclaw: { kind: 'quickclaw', stock: 20 },
	kingsrock: { kind: 'flinch', stock: 10 },
	silverpowder: { kind: 'typeboost', stock: 10 },
	metalcoat: { kind: 'typeboost', stock: 10 },
	softsand: { kind: 'typeboost', stock: 10 },
	hardstone: { kind: 'typeboost', stock: 10 },
	miracleseed: { kind: 'typeboost', stock: 10 },
	blackglasses: { kind: 'typeboost', stock: 10 },
	blackbelt: { kind: 'typeboost', stock: 10 },
	magnet: { kind: 'typeboost', stock: 10 },
	mysticwater: { kind: 'typeboost', stock: 10 },
	seaincense: { kind: 'typeboost', stock: 5 },
	sharpbeak: { kind: 'typeboost', stock: 10 },
	poisonbarb: { kind: 'typeboost', stock: 10 },
	nevermeltice: { kind: 'typeboost', stock: 10 },
	spelltag: { kind: 'typeboost', stock: 10 },
	twistedspoon: { kind: 'typeboost', stock: 10 },
	charcoal: { kind: 'typeboost', stock: 10 },
	dragonfang: { kind: 'typeboost', stock: 10 },
	silkscarf: { kind: 'typeboost', stock: 10 },
	focusband: { kind: 'focusband', stock: 10 },
	shellbell: { kind: 'shellbell', stock: 8 },
};

export const ENIGMA_BOOST_TYPES: { [id: string]: string } = {
	silverpowder: 'Bug', metalcoat: 'Steel', softsand: 'Ground', hardstone: 'Rock', miracleseed: 'Grass',
	blackglasses: 'Dark', blackbelt: 'Fighting', magnet: 'Electric', mysticwater: 'Water', seaincense: 'Water',
	sharpbeak: 'Flying', poisonbarb: 'Poison', nevermeltice: 'Ice', spelltag: 'Ghost', twistedspoon: 'Psychic',
	charcoal: 'Fire', dragonfang: 'Dragon', silkscarf: 'Normal',
};

const ENIGMA_DISLIKED_STAT: { [id: string]: string } = {
	figyberry: 'atk', wikiberry: 'spa', magoberry: 'spe', aguavberry: 'spd', iapapaberry: 'def',
};

export const ENIGMA_PRESETS: { [id: string]: { name: string, base: string, confirmed: boolean } } = {
	pumkinberry: { name: 'Pumkin Berry', base: 'aspearberry', confirmed: true },
	drashberry: { name: 'Drash Berry', base: 'pechaberry', confirmed: true },
	eggantberry: { name: 'Eggant Berry', base: 'mentalherb', confirmed: true },
	stribberry: { name: 'Strib Berry', base: '', confirmed: true },
	chilanberrygen3: { name: 'Chilan Berry (Gen 3)', base: '', confirmed: true },
	nutpeaberry: { name: 'Nutpea Berry', base: '', confirmed: true },
	ginemaberry: { name: 'Ginema Berry', base: 'whiteherb', confirmed: true },
	kuoberry: { name: 'Kuo Berry', base: '', confirmed: true },
	yagoberry: { name: 'Yago Berry', base: 'rawstberry', confirmed: true },
	tougaberry: { name: 'Touga Berry', base: 'persimberry', confirmed: true },
	ninikuberry: { name: 'Niniku Berry', base: '', confirmed: true },
	topoberry: { name: 'Topo Berry', base: '', confirmed: true },
};

const ENIGMA_SUFFIX = 'Cannot be Tricked or stolen; Knock Off removes it.';

function own(table: object, key: string) {
	return Object.prototype.hasOwnProperty.call(table, key);
}

export function isEnigmaPresetId(id: string) {
	return own(ENIGMA_PRESETS, id);
}

export function enigmaParamKind(baseId: string) {
	return own(ENIGMA_PARAM_KINDS, baseId) ? ENIGMA_PARAM_KINDS[baseId] : null;
}

export function parseEnigmaId(id: string, lookup: (id: string) => Item | null | undefined): EnigmaParse | null {
	if (isEnigmaPresetId(id)) return { preset: id, canonical: id };
	if (!id.startsWith('enigma') || id.length > 80) return null;
	const rest = id.slice(6);
	const digits = /[0-9]*$/.exec(rest)![0];
	const stem = rest.slice(0, rest.length - digits.length);
	if (!stem) return null;
	let param: number | undefined;
	if (digits) {
		if (!/^(0|[1-9][0-9]{0,2})$/.test(digits)) return null;
		param = Number(digits);
		if (param > 255) return null;
	}
	const base = lookup(stem);
	if (!base?.exists || base.enigmaBase !== undefined) return null;
	if (base.id === 'enigmaberry' || isEnigmaPresetId(base.id) || /[0-9]$/.test(base.id)) return null;
	if (base.id === 'berry' && !digits) return null;
	return { base, param, canonical: 'enigma' + base.id + digits };
}

export function baseItemId(item: { id: string, enigmaBase?: string }): string {
	return item.enigmaBase || item.id;
}

export function heldItemFullname(pokemon: Pokemon, baseId: string, fallback: string): string {
	const item = pokemon.getItem();
	return item.enigmaBase === baseId ? item.fullname : fallback;
}

export function extraItemId(item: Item): string {
	return item.enigmaBase && item.enigmaParam === undefined ? item.enigmaBase : item.id;
}

export function itemClauseKey(item: Item, gen: number): string {
	if (item.enigmaBase !== undefined) return 'enigma' + item.enigmaBase;
	if (item.id === 'enigmaberry' && gen === 3) return 'enigma';
	return item.id;
}

export function enigmaExclusionReason(base: Item): string {
	if (own(ENIGMA_EXCLUDED_IDS, base.id)) return ENIGMA_EXCLUDED_IDS[base.id];
	if (base.isPokeball) return 'has no held effect';
	if (base.megaStone || base.zMove || base.isPrimalOrb) return 'is a Mega Stone, Z-Crystal or Primal Orb';
	return '';
}

export function enigmaGen3Pair(item: Item): string | null {
	let baseId: string;
	if (item.enigmaBase !== undefined) {
		baseId = item.enigmaBase;
	} else if (item.id === 'enigmaberry') {
		baseId = '';
	} else {
		return null;
	}
	if (!baseId || !own(ENIGMA_GEN3_EFFECT, baseId)) return '0,0';
	const kind = enigmaParamKind(baseId);
	const param = item.enigmaParam !== undefined ? item.enigmaParam : kind ? kind.stock : 0;
	return `${ENIGMA_GEN3_EFFECT[baseId]},${param}`;
}

export function enigmaParamSentence(baseId: string, baseName: string, p: number): string {
	const kind = enigmaParamKind(baseId);
	if (!kind) return '';
	switch (kind.kind) {
	case 'hp':
		return `Restores ${p} HP when at 1/2 max HP or less. Single use.`;
	case 'pp':
		return `Restores ${p} PP to the first of the holder's moves to reach 0 PP. Single use.`;
	case 'healdiv':
		return `Restores ${p ? `1/${p} max` : '1'} HP at 1/2 max HP or less; ` +
			`confuses if the Nature dislikes the flavor. Single use.`;
	case 'pinch':
		if (p === 0) return 'Never activates.';
		if (p === 1) return 'Activates at any HP.';
		return `Activates at 1/${p} max HP or less, with the usual effect of ${baseName}. Single use.`;
	case 'evasion':
		if (p === 100) return 'Attacks that check accuracy always miss the holder.';
		if (p > 100) return 'Attacks that check accuracy either always miss or always hit the holder (Gen 3 overflow).';
		return `The accuracy of attacks against the holder is multiplied by (100 - ${p})%.`;
	case 'quickclaw':
		if (p > 100) return 'Holder always moves first in its priority bracket.';
		return `Each turn, holder has a ${p}% chance to move first in its priority bracket.`;
	case 'flinch':
		if (p >= 100) return `Holder's attacks that King's Rock affects always make the target flinch.`;
		return `Holder's attacks that King's Rock affects have a ${p}% chance to make the target flinch.`;
	case 'typeboost':
		return `Holder's ${ENIGMA_BOOST_TYPES[baseId]}-type attacks are multiplied by (100 + ${p})/100.`;
	case 'focusband':
		if (p >= 100) return 'Holder always survives an attack that would KO it with 1 HP.';
		return `Holder has a ${p}% chance to survive an attack that would KO it with 1 HP.`;
	case 'shellbell':
		if (p === 0) return 'After an attack, holder gains 1 HP.';
		return `After an attack, holder gains 1/${p} of the damage dealt.`;
	}
}

function makeVeto(baseTake: any, id: string) {
	return function (this: Battle, item: Item, pokemon: Pokemon, source: Pokemon, move?: ActiveMove) {
		if (item.id !== id) return;
		if (baseTake === false) return false;
		if (typeof baseTake === 'function' && baseTake.call(this, item, pokemon, source, move) === false) return false;
		const active = this.activeMove;
		if (active && ENIGMA_REMOVERS[this.gen === 3 ? 'gen3' : 'later'].includes(active.id) &&
			pokemon !== this.activePokemon) return;
		return false;
	};
}

function triggerKey(base: AnyObject) {
	if (typeof base.onResidual === 'function') return 'onResidual';
	if (typeof base.onUpdate === 'function') return 'onUpdate';
	return '';
}

function paramHandlers(base: AnyObject, name: string, p: number): AnyObject {
	const kind = enigmaParamKind(base.id);
	const out: AnyObject = {};
	if (!kind) return out;
	const fullname = 'item: ' + name;
	switch (kind.kind) {
	case 'hp': {
		if (typeof base.onEat === 'function') {
			out.onEat = function (this: Battle, pokemon: Pokemon) {
				this.heal(p);
			};
			if (base.onTryEatItem !== undefined) {
				out.onTryEatItem = function (this: Battle, item: Item, pokemon: Pokemon) {
					if (p && !this.runEvent('TryHeal', pokemon, null, this.effect, p)) return false;
				};
			}
		} else {
			const key = triggerKey(base);
			if (key) {
				out[key] = function (this: Battle, pokemon: Pokemon) {
					if (pokemon.hp <= pokemon.maxhp / 2) {
						if ((!p || this.runEvent('TryHeal', pokemon, null, this.effect, p)) && pokemon.useItem()) {
							this.heal(p);
						}
					}
				};
			}
		}
		break;
	}
	case 'pp': {
		out.onEat = function (this: Battle, pokemon: Pokemon) {
			const moveSlot = pokemon.moveSlots.find(slot => slot.pp === 0) ||
				pokemon.moveSlots.find(slot => slot.pp < slot.maxpp);
			if (!moveSlot) return;
			moveSlot.pp = Math.min(moveSlot.pp + p, moveSlot.maxpp);
			this.add('-activate', pokemon, fullname, moveSlot.move, '[consumed]');
		};
		break;
	}
	case 'healdiv': {
		const stat = ENIGMA_DISLIKED_STAT[base.id];
		const amount = (pokemon: Pokemon) => Math.max(1, p ? Math.floor(pokemon.baseMaxhp / p) : 0);
		out.onEat = function (this: Battle, pokemon: Pokemon) {
			this.heal(amount(pokemon));
			if (pokemon.getNature().minus === stat) {
				pokemon.addVolatile('confusion');
			}
		};
		if (base.onTryEatItem !== undefined) {
			out.onTryEatItem = function (this: Battle, item: Item, pokemon: Pokemon) {
				if (!this.runEvent('TryHeal', pokemon, null, this.effect, amount(pokemon))) return false;
			};
		}
		break;
	}
	case 'pinch': {
		const key = triggerKey(base);
		if (key) {
			out[key] = function (this: Battle, pokemon: Pokemon) {
				if (p && pokemon.hp <= Math.floor(pokemon.maxhp / p)) pokemon.eatItem();
			};
		}
		break;
	}
	case 'evasion': {
		out.onModifyAccuracy = function (this: Battle, accuracy: number) {
			if (typeof accuracy !== 'number') return;
			let result = Math.trunc(accuracy * (100 - p) / 100);
			if (result < 0) result += 65536;
			return result || 0;
		};
		break;
	}
	case 'quickclaw': {
		if (typeof base.onFractionalPriority === 'function') {
			out.onFractionalPriority = function (
				this: Battle, priority: number, pokemon: Pokemon, target: Pokemon, move: ActiveMove
			) {
				if (move.category === "Status" && pokemon.hasAbility("myceliummight")) return;
				if (priority <= 0 && this.random(65536) < Math.floor(65535 * p / 100)) {
					this.add('-activate', pokemon, fullname);
					return 0.1;
				}
			};
		}
		break;
	}
	case 'flinch': {
		const baseModify = base.onModifyMove;
		if (typeof baseModify === 'function') {
			out.onModifyMove = function (this: Battle, move: ActiveMove, pokemon: Pokemon, target: Pokemon) {
				const before = move.secondaries ? move.secondaries.length : 0;
				baseModify.call(this, move, pokemon, target);
				if (!move.secondaries || move.secondaries.length <= before) return;
				const added = move.secondaries[move.secondaries.length - 1];
				if (added.volatileStatus !== 'flinch') return;
				if (p === 0) {
					move.secondaries.pop();
				} else {
					added.chance = p;
				}
			};
		}
		break;
	}
	case 'typeboost': {
		const type = ENIGMA_BOOST_TYPES[base.id];
		for (const key of ['onBasePower', 'onModifyAtk', 'onModifySpA']) {
			if (typeof base[key] !== 'function') continue;
			out[key] = function (this: Battle, value: number, user: Pokemon, target: Pokemon, move: ActiveMove) {
				if (move?.type === type) {
					return this.chainModify([100 + p, 100]);
				}
			};
		}
		break;
	}
	case 'focusband': {
		out.onDamage = function (this: Battle, damage: number, target: Pokemon, source: Pokemon, effect: Effect) {
			if (this.randomChance(p, 100) && damage >= target.hp && effect && effect.effectType === 'Move') {
				this.add('-activate', target, fullname);
				return target.hp - 1;
			}
		};
		break;
	}
	case 'shellbell': {
		out.onAfterMoveSecondarySelf = function (this: Battle, pokemon: Pokemon, target: Pokemon, move: ActiveMove) {
			if (move.totalDamage && !pokemon.forceSwitchFlag) {
				this.heal(Math.max(1, p ? Math.floor(move.totalDamage / p) : 0), pokemon);
			}
		};
		break;
	}
	}
	return out;
}

export function buildEnigmaData(
	parsed: EnigmaParse, getBase: (id: string) => Item, baseShortDesc: (item: Item) => string
): AnyObject | null {
	let base = parsed.base || null;
	let name: string;
	const preset = parsed.preset ? ENIGMA_PRESETS[parsed.preset] : null;
	if (preset) {
		name = preset.name;
		base = preset.base ? getBase(preset.base) : null;
		if (base && (!base.exists || base.enigmaBase !== undefined)) base = null;
	} else {
		if (!base) return null;
		name = 'Enigma ' + base.name + (parsed.param !== undefined ? ` (${parsed.param})` : '');
	}
	const data: AnyObject = base ? { ...base } : { num: 208, gen: 3 };
	delete data.id;
	delete data.fullname;
	data.name = name;
	data.exists = true;
	data.enigmaBase = base ? base.id : '';
	data.enigmaParam = preset ? undefined : parsed.param;
	data.enigmaPreset = preset ? true : undefined;
	if (base && !preset && parsed.param !== undefined) {
		Object.assign(data, paramHandlers(base, name, parsed.param));
	}
	data.onTakeItemPriority = -10;
	data.onTakeItem = makeVeto(base ? (base as AnyObject).onTakeItem : undefined, toID(name));
	if (preset) {
		data.spritenum = 124;
		data.isBerry = true;
		data.isNonstandard = 'Unobtainable';
		const effect = base ? `Acts as ${base.name}. ${baseShortDesc(base)}` : 'No effect when held.';
		data.shortDesc = `e-Reader berry (Gen 3). ${effect} ${ENIGMA_SUFFIX}`;
		data.desc = data.shortDesc;
	} else if (base) {
		const sentence = parsed.param !== undefined && enigmaParamKind(base.id) ?
			enigmaParamSentence(base.id, base.name, parsed.param) : baseShortDesc(base);
		data.shortDesc = `Enigma item: acts as ${base.name}. ${sentence ? sentence + ' ' : ''}${ENIGMA_SUFFIX}`;
		data.desc = data.shortDesc;
	}
	return data;
}
