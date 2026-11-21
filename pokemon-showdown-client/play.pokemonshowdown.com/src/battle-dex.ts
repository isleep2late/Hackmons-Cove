/**
 * Pokemon Showdown Dex
 *
 * Roughly equivalent to sim/dex.js in a Pokemon Showdown server, but
 * designed for use in browsers rather than in Node.
 *
 * This is a generic utility library for Pokemon Showdown code: any
 * code shared between the replay viewer and the client usually ends up
 * here.
 *
 * Licensing note: PS's client has complicated licensing:
 * - The client as a whole is AGPLv3
 * - The battle replay/animation engine (battle-*.ts) by itself is MIT
 *
 * Compiled into battledata.js which includes all dependencies
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license MIT
 */

import { Pokemon, type ServerPokemon } from "./battle";
import {
	BattleAvatarNumbers, BattleBaseSpeciesChart, BattlePokemonIconIndexes, BattlePokemonIconIndexesLeft,
	Ability, Item, Move, Species, PureEffect, BattleFormat, type FormatData, type ID, type NatureEffect, type Type,
} from "./battle-dex-data";
import type * as DexData from "./battle-dex-data";
import type { Teams } from "./battle-teams";
import { Config } from "./client-main";
import { BattleLog } from "./battle-log";

export declare namespace Dex {
	/* eslint-disable @typescript-eslint/no-shadow */
	export type Ability = DexData.Ability;
	export type Item = DexData.Item;
	export type Move = DexData.Move;
	export type Species = DexData.Species;
	export type Format = DexData.BattleFormat;
	export type Type = DexData.Type;
	export type Nature = DexData.Nature;
	export type PureEffect = DexData.PureEffect;
	export type Effect = DexData.Effect;
	export type ID = DexData.ID;
	/* eslint-enable @typescript-eslint/no-shadow */
	export type StatName = DexData.StatName;
	export type StatNameExceptHP = DexData.StatNameExceptHP;
	export type BoostStatName = DexData.BoostStatName;
	export type TypeName = DexData.TypeName;
	export type CategoryName = DexData.CategoryName;
	export type StatusName = DexData.StatusName;
	export type GenderName = DexData.GenderName;
	export type NatureName = DexData.NatureName;
	export type MoveTarget = DexData.MoveTarget;
	export type REGULAR = 0;
	export type WEAK = 1;
	export type RESIST = 2;
	export type IMMUNE = 3;
	export type WeaknessType = REGULAR | WEAK | RESIST | IMMUNE;
	export type StatsTable = { hp: number, atk: number, def: number, spa: number, spd: number, spe: number };
	export type PokemonSet = Teams.PokemonSet;
}
export type { ID };

declare const require: any;
declare const global: any;
declare const process: any;

if (typeof window === 'undefined') {
	// Node
	global.window = global;
} else {
	// browser (possibly NW.js!)
	window.exports = window;
}

window.nodewebkit = !!(typeof process !== 'undefined' && process.versions?.['node-webkit']);

export function toID(text: any) {
	if (text?.id) {
		text = text.id;
	} else if (text?.userid) {
		text = text.userid;
	}
	if (typeof text !== 'string' && typeof text !== 'number') return '' as ID;
	return `${text}`.toLowerCase().replace(/[^a-z0-9]+/g, '') as ID;
}

export function toUserid(text: any) {
	return toID(text);
}

const TEXT_LANGUAGES = [
	{ code: "en", legacyId: "english", name: "English", fullName: "English" },
	{ code: "de", legacyId: "german", name: "Deutsch", fullName: "Deutsch (German)" },
	{ code: "es", legacyId: "spanish", name: "Español", fullName: "Español (Spanish)" },
	{ code: "fr", legacyId: "french", name: "Français", fullName: "Français (French)" },
	{ code: "it", legacyId: "italian", name: "Italiano", fullName: "Italiano (Italian)" },
	{ code: "nl", legacyId: "dutch", name: "Nederlands", fullName: "Nederlands (Dutch)" },
	{ code: "pt", legacyId: "portuguese", name: "Português", fullName: "Português (Portuguese)" },
	{ code: "tr", legacyId: "turkish", name: "Türkçe", fullName: "Türkçe (Turkish)" },
	{ code: "hi", legacyId: "hindi", name: "हिंदी", fullName: "हिंदी (Hindi)" },
	{ code: "ja", legacyId: "japanese", name: "日本語", fullName: "日本語 (Japanese)" },
	{ code: "zh-cn", legacyId: "simplifiedchinese", name: "简体中文", fullName: "简体中文 (Simplified Chinese)" },
	{ code: "zh-tw", legacyId: "traditionalchinese", name: "繁體中文", fullName: "繁體中文 (Traditional Chinese)" },
	{ code: "ko", legacyId: "korean", name: "한국어", fullName: "한국어 (Korean)" },
];
type Language = typeof TEXT_LANGUAGES[number];
const TEXT_LANGUAGE_TABLE: Record<string, Language> = {};
for (const lang of TEXT_LANGUAGES) {
	TEXT_LANGUAGE_TABLE[toID(lang.code)] = lang;
	TEXT_LANGUAGE_TABLE[lang.code] = lang;
	TEXT_LANGUAGE_TABLE[lang.legacyId] = lang;
	TEXT_LANGUAGE_TABLE[lang.name] = lang;
	TEXT_LANGUAGE_TABLE[lang.name.toLowerCase()] = lang;
}
TEXT_LANGUAGE_TABLE['en-afd'] = {
	code: "en-afd", legacyId: "english", name: "English (AFD)", fullName: "English (AFD)",
};

type TranslatableEffect = Species | Item | Ability | Move | NatureEffect | Type;

const TEXT_TABLES = {
	Item: 'Items',
	Ability: 'Abilities',
	Move: 'Moves',
} as const;

interface ClientEffectTextEntry extends BattleTextEntry {
	name: string;
	desc: string;
	shortDesc: string;
	baseSpecies: string;
	forme: string | null;
}

interface ClientDexText {
	getLanguage(): string;
	getBrowserLanguage(): string;
	languages(): Language[];
	findLanguage(lang: string): Language | null;
	get(effect: TranslatableEffect, lang?: string): ClientEffectTextEntry;
}

function translate(strings: TemplateStringsArray, ...values: unknown[]): string;
function translate(text: string | TranslatableEffect, context?: string): string;
function translate(strings: TemplateStringsArray | string | TranslatableEffect, ...values: unknown[]): string {
	if (typeof strings !== 'string' && 'effectType' in strings) {
		return typeof BattleText === 'undefined' ? strings.name : Dex.text.get(strings).name;
	}

	let source: string;
	let context = '';
	if (typeof strings === 'string') {
		source = strings;
		if (values.length) context = values[0] as string;
		values = [];
	} else {
		source = strings[0];
		for (let i = 1; i < strings.length; i++) {
			source += `{${i - 1}}${strings[i]}`;
		}
	}

	const translated = TL.inLanguage(source, Dex.text.getLanguage(), context);
	return translated.replace(/\{(\d+)\}/g, (placeholder, indexText) => {
		const index = Number(indexText);
		return index >= 0 && index < values.length ? String(values[index]) : placeholder;
	});
}

const initialText = typeof BattleText === 'undefined' ? undefined : BattleText.en;

function tagField(tags: BattleTextData['Tags'] | undefined, field: 'name' | 'hint' | 'desc') {
	const table: { [id: string]: string } = {};
	for (const id in tags) {
		const value = tags[id][field];
		if (value) table[id] = value;
	}
	return table;
}

export const TL = Object.assign(translate, {
	inLanguage(source: string, language: string, context = '') {
		const translation = typeof BattleUIText === 'undefined' ? undefined : BattleUIText[language]?.[source];
		const fallback = source.startsWith('[') && source.endsWith(']') ? source.slice(1, -1) : source;
		return (typeof translation === 'string' ? translation : translation?.[context]) ?? fallback;
	},
	/** `TL.label("Ability", "Intimidate")` === `"Ability: Intimidate"` */
	label(label: string, value?: unknown) {
		const labelText = TL`${label}: `;
		return value === undefined ? labelText : labelText + String(value as any);
	},
	orList(items: readonly string[]) {
		if (items.length <= 1) return items.join();
		if (items.length === 2) {
			return TL`${items[0]} or ${items[1]}`;
		}
		let list = items[0];
		for (const item of items.slice(1, -1)) list += TL`, ${item}`;
		const last = items[items.length - 1];
		return list + TL`, or ${last}`;
	},
	andList(items: readonly string[]) {
		if (items.length <= 1) return items.join();
		if (items.length === 2) {
			return TL`${items[0]} and ${items[1]}`;
		}
		let list = items[0];
		for (const item of items.slice(1, -1)) list += TL`, ${item}`;
		const last = items[items.length - 1];
		return list + TL`, and ${last}`;
	},
	/** Asian translations use "person" counters, so don't use this for non-people */
	cappedUserList(items: readonly string[], cap: number) {
		if (items.length > cap + 1) {
			let list = items[0];
			for (const item of items.slice(1, cap)) list += TL`, ${item}`;
			const others = items.length - cap;
			return list + TL`, and ${others} others`;
		}
		return TL.andList(items);
	},
	type: initialText?.TypeNames || {},
	nature: initialText?.NatureNames || {},
	gender: initialText?.GenderNames || {},
	egggroup: initialText?.EggGroupNames || {},
	tag: tagField(initialText?.Tags, 'name'),
	tagHint: tagField(initialText?.Tags, 'hint'),
	color: initialText?.ColorNames || {},
	status: initialText?.StatusNames || {},
	target: initialText?.TargetNames || {},
	stat: initialText?.StatNames || {},
	statShort: initialText?.StatShortNames || {},
	statMedium: initialText?.StatMediumNames || {},
});

function updateTranslatedNames(lang: string) {
	if (lang !== Dex.text.getLanguage()) return;
	if (typeof BattleText === 'undefined') return;
	const english = BattleText.en;
	const text = BattleText[lang] || english;
	if (!text) return;
	TL.type = text.TypeNames || english?.TypeNames || {};
	TL.nature = text.NatureNames || english?.NatureNames || {};
	TL.gender = text.GenderNames || english?.GenderNames || {};
	TL.egggroup = text.EggGroupNames || english?.EggGroupNames || {};
	TL.tag = tagField(text.Tags || english?.Tags, 'name');
	TL.tagHint = tagField(text.Tags || english?.Tags, 'hint');
	TL.color = text.ColorNames || english?.ColorNames || {};
	TL.status = text.StatusNames || english?.StatusNames || {};
	TL.target = text.TargetNames || english?.TargetNames || {};
	TL.stat = text.StatNames || english?.StatNames || {};
	TL.statShort = text.StatShortNames || english?.StatShortNames || {};
	TL.statMedium = text.StatMediumNames || english?.StatMediumNames || {};
}

function assignTextFields(target: BattleTextEntry, source: BattleTextEntry) {
	for (const [key, value] of Object.entries(source)) {
		if (value !== null) target[key] = value;
	}
}

type OtherNameTable =
	'TypeNames' | 'NatureNames' | 'GenderNames' |
	'EggGroupNames' | 'ColorNames' |
	'StatNames' | 'StatMediumNames' | 'StatShortNames';

function getOtherName(table: OtherNameTable, name: string, lang: string): string {
	return BattleText[lang]?.[table]?.[name] || BattleText.en?.[table]?.[name] || name;
}

/**
 * Does actually match ClientEffectTextEntry exactly.
 */
function getTextEntry(effect: TranslatableEffect, modid: string, gen: number, lang: string): ClientEffectTextEntry {
	if (effect.effectType === 'Species') {
		const entry = BattleText[lang]?.Pokedex?.[effect.id] || BattleText.en?.Pokedex?.[effect.id];
		return {
			name: entry?.name || effect.name,
			baseSpecies: entry?.baseSpecies || effect.baseSpecies,
			forme: entry?.forme || null,
		} as ClientEffectTextEntry;
	}
	if (effect.effectType === 'Type') {
		return { name: getOtherName('TypeNames', effect.name, lang) } as ClientEffectTextEntry;
	}
	if (effect.effectType === 'Nature') {
		return { name: getOtherName('NatureNames', effect.name, lang) } as ClientEffectTextEntry;
	}
	const tableName = TEXT_TABLES[effect.effectType];
	const english = BattleText.en?.[tableName]?.[effect.id] || {};
	const localized = BattleText[lang]?.[tableName]?.[effect.id] || {};
	const entry = {} as ClientEffectTextEntry;
	assignTextFields(entry, english);
	assignTextFields(entry, localized);
	for (let i = 1; i < Dex.gen; i++) {
		const genName = `gen${i}`;
		const englishGen = english[genName];
		const localizedGen = localized[genName];
		if (typeof englishGen === 'object' || typeof localizedGen === 'object') {
			const genEntry: BattleTextEntry = {};
			if (englishGen && typeof englishGen === 'object') assignTextFields(genEntry, englishGen);
			if (localizedGen && typeof localizedGen === 'object') assignTextFields(genEntry, localizedGen);
			entry[genName] = genEntry;
		}
	}
	for (let i = Dex.gen - 1; i >= gen; i--) {
		const genName = `gen${i}`;
		const englishGen = english[genName];
		const localizedGen = localized[genName];
		if (englishGen && typeof englishGen === 'object') assignTextFields(entry, englishGen);
		if (localizedGen && typeof localizedGen === 'object') assignTextFields(entry, localizedGen);
	}
	if (!/^gen\d+$/.test(modid)) {
		const englishMod = english[modid];
		const localizedMod = localized[modid];
		if (englishMod && typeof englishMod === 'object') assignTextFields(entry, englishMod);
		if (localizedMod && typeof localizedMod === 'object') assignTextFields(entry, localizedMod);
	}
	// FORK CONTENT HAS NO data/text ENTRY, SO FALL BACK TO THE INLINE DESCRIPTION.
	//
	// The server's DexText.get() has exactly this fallback (pokemon-showdown/sim/dex-text.ts) and
	// the client's copy of it does not, which is why /dt printed a description for Shadow Blast or
	// TM01 while the teambuilder's description column was blank for all 95 fork moves and 73 fork
	// items. Descriptions moved out of data/moves.js into data/text/en.js when the client adopted
	// upstream's translation rework, and data/text is built only from the server's data/text/*.ts
	// plus build-translations' CLIENT_MODS list - neither of which carries anything the fork added.
	//
	// This only fires when the text tables produced NOTHING for the effect, so a real translation
	// always wins and localized clients are unaffected for every move that actually has one.
	if (typeof entry.desc !== 'string' && typeof entry.shortDesc !== 'string') {
		const inlineText = effect as { desc?: string, shortDesc?: string };
		if (inlineText.desc || inlineText.shortDesc) {
			entry.desc = inlineText.desc || inlineText.shortDesc!;
			entry.shortDesc = inlineText.shortDesc || inlineText.desc!;
		}
	}
	if (typeof entry.name !== 'string') entry.name = effect.name;
	if (typeof entry.desc !== 'string') entry.desc = typeof entry.shortDesc === 'string' ? entry.shortDesc : '';
	if (typeof entry.shortDesc !== 'string') entry.shortDesc = entry.desc;
	return entry;
}

type Comparable = number | string | boolean | Comparable[] | { reverse: Comparable };
export const PSUtils = new class {
	/**
	 * Like string.split(delimiter), but only recognizes the first `limit`
	 * delimiters (default 1).
	 *
	 * `"1 2 3 4".split(" ", 2) => ["1", "2"]`
	 *
	 * `splitFirst("1 2 3 4", " ", 1) => ["1", "2 3 4"]`
	 *
	 * Returns an array of length exactly limit + 1.
	 */
	splitFirst(str: string, delimiter: string, limit = 1) {
		let splitStr: string[] = [];
		while (splitStr.length < limit) {
			let delimiterIndex = str.indexOf(delimiter);
			if (delimiterIndex >= 0) {
				splitStr.push(str.slice(0, delimiterIndex));
				str = str.slice(delimiterIndex + delimiter.length);
			} else {
				splitStr.push(str);
				str = '';
			}
		}
		splitStr.push(str);
		return splitStr;
	}

	/**
	 * Compares two variables; intended to be used as a smarter comparator.
	 * The two variables must be the same type (TypeScript will not check this).
	 *
	 * - Numbers are sorted low-to-high, use `-val` to reverse
	 * - Strings are sorted A to Z case-semi-insensitively, use `{reverse: val}` to reverse
	 * - Booleans are sorted true-first (REVERSE of casting to numbers), use `!val` to reverse
	 * - Arrays are sorted lexically in the order of their elements
	 *
	 * In other words: `[num, str]` will be sorted A to Z, `[num, {reverse: str}]` will be sorted Z to A.
	 */
	compare(a: Comparable, b: Comparable): number {
		if (typeof a === 'number') {
			return a - (b as number);
		}
		if (typeof a === 'string') {
			return a.localeCompare(b as string);
		}
		if (typeof a === 'boolean') {
			return (a ? 1 : 2) - (b ? 1 : 2);
		}
		if (Array.isArray(a)) {
			for (let i = 0; i < a.length; i++) {
				const comparison = PSUtils.compare(a[i], (b as Comparable[])[i]);
				if (comparison) return comparison;
			}
			return 0;
		}
		if (a.reverse) {
			return PSUtils.compare((b as { reverse: string }).reverse, a.reverse);
		}
		throw new Error(`Passed value ${a as any} is not comparable`);
	}
	/**
	 * Sorts an array according to the callback's output on its elements.
	 *
	 * The callback's output is compared according to `PSUtils.compare` (in
	 * particular, it supports arrays so you can sort by multiple things).
	 */
	sortBy<T>(array: T[], callback: (a: T) => Comparable): T[];
	/**
	 * Sorts an array according to `PSUtils.compare`. (Correctly sorts numbers,
	 * unlike `array.sort`)
	 */
	sortBy<T extends Comparable>(array: T[]): T[];
	sortBy<T>(array: T[], callback?: (a: T) => Comparable) {
		if (!callback) return (array as any[]).sort(PSUtils.compare);
		return array.sort((a, b) => PSUtils.compare(callback(a), callback(b)));
	}
	normalizeError(err: any): string {
		const stack = err.stack || '';
		const messagePrefix = `${err.name}: ${err.message}`;

		// Firefox doesn't put the error message inside the stack trace,
		// but Chrome/Safari does
		if (stack && !stack.startsWith(messagePrefix)) {
			return `${messagePrefix}\n${stack}`;
		}
		return stack || messagePrefix;
	}
};

/**
 * Sanitize a room ID by removing anything that isn't alphanumeric or `-`.
 * Shouldn't actually do anything except against malicious input.
 */
export function toRoomid(roomid: string) {
	return roomid.replace(/[^a-zA-Z0-9-]+/g, '').toLowerCase();
}

export function toName(name: any) {
	if (typeof name !== 'string' && typeof name !== 'number') return '';
	name = `${name}`.replace(/[|\s[\],\u202e]+/g, ' ').trim();
	if (name.length > 18) name = name.substr(0, 18).trim();

	// remove zalgo
	name = name.replace(
		/[\u0300-\u036f\u0483-\u0489\u0610-\u0615\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06ED\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{3,}/g,
		''
	);
	name = name.replace(/[\u239b-\u23b9]/g, '');

	return name;
}

export interface SpriteData {
	w: number;
	h: number;
	y?: number;
	gen?: number;
	url?: string;
	rawHTML?: string;
	pixelated?: boolean;
	isFrontSprite?: boolean;
	cryurl?: string;
	shiny?: boolean;
}

export interface TeambuilderSpriteData {
	x: number;
	y: number;
	h?: number;
	spriteDir: string;
	spriteid: string;
	shiny?: boolean;
	pixelated?: boolean;
	customPrefix?: string;
	ext?: string;
}

const SW97_SPRITE_SIZES: {[id: string]: number} = {
	tsubomitto: 112, madaamu: 112, norowara: 96, tsuinzu: 96, purakkusu: 112,
	pending03: 112, pending05: 112, pending06: 112, pending10: 112,
	abrasw: 80, aerodactylsw: 112, alakazamsw: 112, ampharossw: 112, anchorage: 96, animon: 96,
	aqua: 96, aquaria: 112, arboksw: 112, arcaninesw: 112, articunosw: 112, ballerine: 80,
	beedrillsw: 112, bellboyant: 96, bellossomsw: 112, bellsproutsw: 80, belmitt: 112, blastoisesw: 112,
	blisseysw: 112, bobo: 112, bomseel: 96, booby: 96, bulbasaursw: 80, butterfreesw: 112,
	caterpiesw: 80, chanseysw: 96, charizardsw: 112, charmandersw: 80, charmeleonsw: 96, chiks: 80,
	clefablesw: 96, clefairysw: 80, cleffasw: 80, cloystersw: 112, cruz: 80, cubonesw: 80,
	dewgongsw: 112, diglettsw: 80, dittosw: 80, dodriosw: 112, doduosw: 80, donphansw: 112,
	dragonairsw: 96, dragonitesw: 112, dratinisw: 80, drowzeesw: 96, dugtriosw: 112, dynabear: 112,
	eeveesw: 80, ekanssw: 80, eksing: 112, electabuzzsw: 96, electiger: 112, electrodesw: 80,
	elekidsw: 80, enteisw: 112, espeonsw: 96, exeggcutesw: 112, exeggutorsw: 112, farfetchdsw: 96,
	fearowsw: 112, flaaffysw: 96, flambear: 80, flareonsw: 96, gastlysw: 112, gelania: 112,
	gengarsw: 96, geodudesw: 80, gift: 96, girafarigsw: 112, gloomsw: 96, golbatsw: 112,
	goldeensw: 96, golducksw: 112, golemsw: 96, golppy: 80, gongu: 80, gravelersw: 96,
	grimersw: 80, grimey: 80, grotess: 96, growlithesw: 80, gyaradossw: 112, hanamogura: 96,
	hanaryu: 112, happa: 80, hauntersw: 96, hitmonchansw: 96, hitmonleesw: 112, hitmontopsw: 112,
	hoohsw: 112, hoothootsw: 80, hoppipsw: 80, horseasw: 80, houndoomsw: 112, houndoursw: 96,
	hypnosw: 112, igglybuffsw: 80, ivysaursw: 96, jigglypuffsw: 80, jolteonsw: 96, jumpluffsw: 112,
	jynxsw: 96, kabutopssw: 96, kabutosw: 80, kadabrasw: 96, kakunasw: 80, kangaskhansw: 112,
	kingdrasw: 112, kinglersw: 112, koffingsw: 96, krabbysw: 80, kurstraw: 96, laprassw: 112,
	leafeo: 96, ledybasw: 96, lickitungsw: 112, likk: 112, machampsw: 112, machokesw: 112,
	machopsw: 80, madame: 112, magikarpsw: 96, magmarsw: 96, magnemitesw: 80, magnetonsw: 96,
	mankeysw: 80, mantinesw: 96, marillsw: 80, marowaksw: 96, meowsy: 80, meowthsw: 80,
	metapodsw: 80, mewsw: 80, mewtwosw: 112, miltanksw: 96, minicorn: 80, mitsuboshi: 96,
	mizuuo: 96, moltressw: 112, mrmimesw: 96, muksw: 112, murkrowsw: 96, natusw: 80,
	nidokingsw: 112, nidoqueensw: 112, nidoranfsw: 80, nidoranmsw: 80, nidorinasw: 96, nidorinosw: 96,
	ninetalessw: 112, numpuff: 112, octillerysw: 96, oddishsw: 80, omanytesw: 80, omastarsw: 96,
	onixsw: 112, pachimee: 80, painter: 112, pangshi: 112, paon: 80, para: 80,
	parasectsw: 112, parassw: 80, persiansw: 112, pichusw: 80, pidgeotsw: 112, pidgeottosw: 96,
	pidgeysw: 80, pikachusw: 80, pinsirsw: 112, plux: 112, politoedsw: 112, poliwagsw: 80,
	poliwhirlsw: 96, poliwrathsw: 112, ponytasw: 96, porygon2sw: 96, porygonsw: 96, primeapesw: 112,
	psyducksw: 80, puddi: 80, puku: 80, raichusw: 112, raikousw: 112, rapidashsw: 112,
	raticatesw: 96, rattatasw: 80, remoraidsw: 80, rhydonsw: 112, rhyhornsw: 112, rinring: 80,
	sandshrewsw: 80, sandslashsw: 96, scizorsw: 112, scythersw: 112, seadrasw: 96, seakingsw: 112,
	seelsw: 96, shelldersw: 80, shibirefugu: 112, skarmorysw: 112, skiploomsw: 96, slowbrosw: 112, slowkingsw: 112,
	slowpokesw: 80, smoochumsw: 80, sneaselsw: 80, snorlaxsw: 112, snubbullsw: 96, spearowsw: 80,
	spinaraksw: 80, squirtlesw: 80, starmiesw: 96, staryusw: 96, steelixsw: 112, suicunesw: 112,
	sunmola1: 80, sunny: 96, tail: 80, tangel: 80, tangelasw: 96, taurossw: 112,
	tentacoolsw: 80, tentacruelsw: 96, tigrette: 80, togepisw: 80, trifox: 80, turbann: 96,
	twinz: 96, twohead: 112, umbreonsw: 96, unownsw: 80, vaporeonsw: 96, venomothsw: 112,
	venonatsw: 80, venusaursw: 112, victreebelsw: 112, vileplumesw: 112, volbear: 96, voltorbsw: 80,
	vulpixsw: 96, wartortlesw: 96, warwolf: 112, weedlesw: 80, weepinbellsw: 96, weezingsw: 112,
	wigglytuffsw: 96, wolfman: 80, xatusw: 96, zapdossw: 112, zubatsw: 80,
};

const SW97_FINAL_NAME_ART: { [id: string]: string } = {
	chikorita: 'happa', bayleef: 'hanamogura', meganium: 'hanaryu', noctowl: 'bobo', mareep: 'pachimee',
	qwilfish: 'puku', quagsire: 'mizuuo', ariados: 'twohead', sunflora: 'sunny', phanpy: 'paon',
	smeargle: 'painter', ledian: 'mitsuboshi', delibird: 'gift', aipom: 'tail',
};

function sw97ArtId(id: string, mod?: string) {
	if (mod !== 'gen2spaceworld') return id;
	if (SW97_SPRITE_SIZES[id + 'sw']) return id + 'sw';
	if (SW97_FINAL_NAME_ART[id]) return SW97_FINAL_NAME_ART[id];
	return id;
}

const GLITCH_SPRITE_SIZES: {[id: string]: number} = {
	'00fc': 96, '019c': 96, '3trainerpok': 112, '44hy': 112, '44ybf': 112, '44yf8': 112,
	'44yfe': 80, '4894': 96, '4b848': 112, '4c2': 112, '4cf': 112, '4dd': 96,
	'4h': 112, '4h4': 112, '4h4hi': 112, '4hi': 112, '4mn': 112, '4yc5': 96,
	'6': 96, '7g': 112, '7pkmnv': 112, '8b48': 112, '8c9': 112, '8de': 112,
	'8p': 112, '8ycc': 112, '9': 112, '94': 112, '94h': 112, a: 112,
	ac0: 96, aea: 112, af3: 96, af6: 96, agd4: 96, bd7: 112,
	bda: 112, bhyd1: 112, bycd: 112, bydb: 112, byf1: 112, c1: 112,
	clowercase: 96, crystal00: 112, crystalfc: 112, crystalfe: 112, crystalff: 112, cuppercase: 112,
	d2: 112, d4: 112, d9: 112, decamark: 96, e2: 112, e3: 112,
	e6: 112, f0: 112, f4: 112, f5: 112, fq: 112, g: 96,
	ggyc8: 112, gj1: 112, glitchca: 112, glitchd7: 96, glitchdb: 112, glitchdc: 96,
	glitche4: 96, glitcheb: 112, glitchec: 112, glitchfa: 112, gmp: 96, gs00: 112,
	gsfc: 112, gsfe: 112, gsff: 112, h: 96, h4p: 112, h4to89: 112,
	hi: 96, hpok: 112, i: 112, lf2: 112, lf3: 112, lm4: 112,
	m: 96, m00: 112, mfe: 80, mff: 112, missingno: 112, missingnoyellow: 112,
	mng: 112, mpu: 112, ng: 112, ngmp: 112, o: 112, opkmn4x: 112,
	p4e7: 112, p4yeb: 96, pc4sh: 112, pcb: 96, pd5: 112, pid: 112,
	pkmna: 112, pkmnapkmnfpkmnk: 112, pkmnc5: 112, pkmnd8: 112, pkmndc: 112, pkmnde: 112,
	pkmndf: 112, pkmnf7: 112, pkmnn: 80, pkmnpce: 112, pkmnpd6: 112, pkmnpkmn: 112,
	pkmnpkmnt: 112, pkmnrpkmn: 112, pokwtrainer: 112, ppkmnp: 112, pt: 112, pycb: 112,
	pyf4: 112, pyf5: 112, q: 112, r: 112, r4: 112, rr4: 112,
	trainer: 112, uc8: 112, uyc7: 112, v: 112, wgd: 112, xc: 112,
	xx: 96, yc1: 112, yd0: 112, yd3: 112, yd5: 112, yda: 112,
	yec: 112, yee: 96, yf2: 112, yf9: 112, yfa: 96, z: 112,
	z4: 112,
};

type EnigmaParsed = { id: string, base: string, param?: number, preset?: boolean };

export const Enigma = new class {
	readonly formats = ['gen3bhaaa', 'gen9nonerfsstandard', 'gen9nonerfsextended', 'gen9nonerfscustomdisguises'];
	readonly excludedIds: { [id: string]: string } = {
		mail: 'has no held effect',
		rustedsword: 'is tied to a forme change',
		rustedshield: 'is tied to a forme change',
		legendplate: 'is tied to a forme change',
	};
	readonly gen3Bases = (
		'oranberry berryjuice sitrusberry cheriberry chestoberry pechaberry rawstberry aspearberry leppaberry ' +
		'persimberry lumberry figyberry wikiberry magoberry aguavberry iapapaberry liechiberry ganlonberry ' +
		'salacberry petayaberry apicotberry lansatberry starfberry brightpowder laxincense whiteherb machobrace ' +
		'quickclaw mentalherb choiceband kingsrock silverpowder souldew deepseatooth deepseascale focusband ' +
		'scopelens metalcoat leftovers dragonscale lightball softsand hardstone miracleseed blackglasses ' +
		'blackbelt magnet mysticwater seaincense sharpbeak poisonbarb nevermeltice spelltag twistedspoon ' +
		'charcoal dragonfang silkscarf upgrade shellbell luckypunch metalpowder thickclub stick'
	).split(' ');
	readonly paramKinds: { [id: string]: { kind: string, stock: number, type?: string } } = {
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
		silverpowder: { kind: 'typeboost', stock: 10, type: 'Bug' },
		metalcoat: { kind: 'typeboost', stock: 10, type: 'Steel' },
		softsand: { kind: 'typeboost', stock: 10, type: 'Ground' },
		hardstone: { kind: 'typeboost', stock: 10, type: 'Rock' },
		miracleseed: { kind: 'typeboost', stock: 10, type: 'Grass' },
		blackglasses: { kind: 'typeboost', stock: 10, type: 'Dark' },
		blackbelt: { kind: 'typeboost', stock: 10, type: 'Fighting' },
		magnet: { kind: 'typeboost', stock: 10, type: 'Electric' },
		mysticwater: { kind: 'typeboost', stock: 10, type: 'Water' },
		seaincense: { kind: 'typeboost', stock: 5, type: 'Water' },
		sharpbeak: { kind: 'typeboost', stock: 10, type: 'Flying' },
		poisonbarb: { kind: 'typeboost', stock: 10, type: 'Poison' },
		nevermeltice: { kind: 'typeboost', stock: 10, type: 'Ice' },
		spelltag: { kind: 'typeboost', stock: 10, type: 'Ghost' },
		twistedspoon: { kind: 'typeboost', stock: 10, type: 'Psychic' },
		charcoal: { kind: 'typeboost', stock: 10, type: 'Fire' },
		dragonfang: { kind: 'typeboost', stock: 10, type: 'Dragon' },
		silkscarf: { kind: 'typeboost', stock: 10, type: 'Normal' },
		focusband: { kind: 'focusband', stock: 10 },
		shellbell: { kind: 'shellbell', stock: 8 },
	};
	readonly presets: { [id: string]: { name: string, base: string, confirmed: boolean } } = {
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
	readonly suffix = 'Cannot be Tricked or stolen; Knock Off removes it.';
	cache: { [modid: string]: { [id: string]: Item | null } } = {};

	realId(id: string): string {
		if (!id || !window.BattleItems) return '';
		if (window.BattleAliases && BattleAliases.hasOwnProperty(id)) id = toID(BattleAliases[id]);
		if (!id) return '';
		for (const candidate of [id, `${id}berry`]) {
			const data = BattleItems.hasOwnProperty(candidate) ? BattleItems[candidate] : null;
			if (data && data.exists !== false) return candidate;
		}
		return '';
	}
	parse(id: string): EnigmaParsed | null {
		if (this.presets.hasOwnProperty(id)) {
			return { id, base: this.presets[id].base, preset: true };
		}
		if (!id.startsWith('enigma') || this.realId(id)) return null;
		const match = /^(.*?)([0-9]*)$/.exec(id.slice(6))!;
		const digits = match[2];
		if (digits && (!/^(0|[1-9][0-9]{0,2})$/.test(digits) || Number(digits) > 255)) return null;
		const base = this.realId(match[1]);
		if (!base || base === 'enigmaberry' || /[0-9]$/.test(base) || (base === 'berry' && !digits)) return null;
		return { id: `enigma${base}${digits}`, base, param: digits ? Number(digits) : undefined };
	}
	baseId(id: string): string {
		if (!id.startsWith('enigma') && !this.presets.hasOwnProperty(id)) return id;
		const parsed = this.parse(id);
		return parsed ? (parsed.base || id) : id;
	}
	isCandidate(id: string) {
		return id.startsWith('enigma') || this.presets.hasOwnProperty(id);
	}
	get(
		id: string, dex: { modid: string, gen: number, items: { get: (name: string) => Item }, text: ClientDexText }
	): Item | null {
		if (!this.isCandidate(id) || !window.BattleItems) return null;
		const cache = this.cache[dex.modid] ||= Object.create(null) as { [id: string]: Item | null };
		if (id in cache) return cache[id];
		const parsed = this.parse(id);
		let item: Item | null = null;
		if (parsed && !(parsed.preset && dex.gen < 3)) {
			if (parsed.id in cache) {
				item = cache[parsed.id];
			} else {
				item = this.derive(parsed, dex);
				cache[parsed.id] = item;
			}
		}
		cache[id] = item;
		return item;
	}
	derive(
		parsed: EnigmaParsed, dex: { items: { get: (name: string) => Item }, text: ClientDexText }
	): Item {
		const base = parsed.base ? dex.items.get(parsed.base) : null;
		const baseText = base ? dex.text.get(base) : null;
		const preset = parsed.preset ? this.presets[parsed.id] : null;
		const name = preset ? preset.name : this.name(base!.name, parsed.param);
		const lead = preset ? 'e-Reader berry (Gen 3). Acts' : 'Enigma item: acts';
		const describe = (text: string) => {
			if (!base) return `e-Reader berry (Gen 3). No effect when held. ${this.suffix}`;
			const sentence = parsed.param === undefined || !this.kind(base.id) ?
				text : this.sentence(base.id, base.name, parsed.param);
			return `${lead} as ${base.name}. ${sentence ? `${sentence} ` : ''}${this.suffix}`;
		};
		const pending = preset && !preset.confirmed ? ' Its real effect is awaiting confirmation.' : '';
		const data: any = {
			...base,
			name,
			exists: true,
			shortDesc: describe(baseText?.shortDesc || '') + pending,
			desc: describe(baseText?.shortDesc || '') + pending,
			enigmaBase: parsed.base,
			enigmaParam: parsed.param,
		};
		if (preset) {
			data.enigmaPreset = true;
			data.spritenum = 124;
			data.isBerry = true;
			data.isNonstandard = 'Unobtainable';
			data.gen = 3;
			data.megaStone = null;
			data.zMove = null;
		}
		return new Item(parsed.id as ID, name, data);
	}
	name(baseName: string, param?: number | null) {
		return `Enigma ${baseName}${param === undefined || param === null ? '' : ` (${param})`}`;
	}
	kind(baseId: string) {
		return this.paramKinds.hasOwnProperty(baseId) ? this.paramKinds[baseId] : null;
	}
	sentence(baseId: string, baseName: string, n: number | 'N'): string {
		const entry = this.kind(baseId);
		if (!entry) return '';
		const num = typeof n === 'number' ? n : -1;
		switch (entry.kind) {
		case 'hp':
			return `Restores ${n} HP when at 1/2 max HP or less. Single use.`;
		case 'pp':
			return `Restores ${n} PP to the first of the holder's moves to reach 0 PP. Single use.`;
		case 'healdiv':
			return `Restores ${num === 0 ? '1 HP' : `1/${n} max HP`} at 1/2 max HP or less; ` +
				`confuses if the Nature dislikes the flavor. Single use.`;
		case 'pinch':
			if (num === 0) return `Never activates.`;
			if (num === 1) return `Activates at any HP.`;
			return `Activates at 1/${n} max HP or less, with the usual effect of ${baseName}. Single use.`;
		case 'evasion':
			if (num === 100) return `Attacks that check accuracy always miss the holder.`;
			if (num > 100) {
				return `Attacks that check accuracy either always miss or always hit the holder (Gen 3 overflow).`;
			}
			return `The accuracy of attacks against the holder is multiplied by (100 - ${n})%.`;
		case 'quickclaw':
			if (num > 100) return `Holder always moves first in its priority bracket.`;
			return `Each turn, holder has a ${n}% chance to move first in its priority bracket.`;
		case 'flinch':
			if (num >= 100) return `Holder's attacks that King's Rock affects always make the target flinch.`;
			return `Holder's attacks that King's Rock affects have a ${n}% chance to make the target flinch.`;
		case 'typeboost':
			return `Holder's ${entry.type || ''}-type attacks are multiplied by (100 + ${n})/100.`;
		case 'focusband':
			if (num >= 100) return `Holder always survives an attack that would KO it with 1 HP.`;
			return `Holder has a ${n}% chance to survive an attack that would KO it with 1 HP.`;
		case 'shellbell':
			if (num === 0) return `After an attack, holder gains 1 HP.`;
			return `After an attack, holder gains 1/${n} of the damage dealt.`;
		}
		return '';
	}
	rules(formatid: string | null | undefined) {
		const id = toID((formatid || '').split('@@@')[0]);
		const enabled = this.formats.includes(id);
		return { enabled, gen3: enabled && id === 'gen3bhaaa', params: enabled };
	}
	ineligible(base: Item | null | undefined, formatid: string | null | undefined): string {
		const rules = this.rules(formatid);
		if (!rules.enabled) return 'Enigma items are not allowed in this format.';
		if (!base?.exists) return 'Pick an item first.';
		if (base.enigmaBase !== undefined || base.id === 'enigmaberry' || base.id === 'berry' || /[0-9]$/.test(base.id)) {
			return `${base.name} cannot be an Enigma item.`;
		}
		if (rules.gen3) {
			if (base.gen > 3) return `${base.name} does not exist in Generation 3.`;
			if (!this.gen3Bases.includes(base.id)) {
				return `${base.name} has no Generation 3 hold effect for an Enigma Berry to copy.`;
			}
			return '';
		}
		let reason = this.excludedIds.hasOwnProperty(base.id) ? this.excludedIds[base.id] : '';
		if (!reason && base.isPokeball) reason = 'has no held effect';
		if (!reason && (base.megaStone || base.zMove || base.isPrimalOrb)) {
			reason = 'is a Mega Stone, Z-Crystal or Primal Orb';
		}
		return reason ? `${base.name} cannot be an Enigma item because it ${reason}.` : '';
	}
	intent(text: string | null | undefined): { enigma: boolean, param?: number } {
		const id = toID(text);
		if (!id.startsWith('enigma') || 'enigmaberry'.startsWith(id)) return { enigma: false };
		const item = this.get(id, Dex);
		if (item) return { enigma: !item.enigmaPreset, param: item.enigmaParam };
		const digits = /([0-9]+)\s*\)?\s*$/.exec(text || '')?.[1];
		const param = digits && /^(0|[1-9][0-9]{0,2})$/.test(digits) && Number(digits) <= 255 ? Number(digits) : undefined;
		return { enigma: true, param };
	}
	carry(previous: (string | null | undefined)[], picked: string, formatid: string | null | undefined): string {
		if (!picked || !this.rules(formatid).enabled) return picked;
		const base = Dex.items.get(picked);
		if (!base.exists || base.enigmaBase !== undefined) return picked;
		let intent = { enigma: false } as { enigma: boolean, param?: number };
		for (const text of previous) {
			intent = this.intent(text);
			if (intent.enigma) break;
		}
		if (!intent.enigma || this.ineligible(base, formatid)) return picked;
		return this.name(base.name, this.kind(base.id) ? intent.param : undefined);
	}
	state(
		itemName: string | null | undefined, formatid: string | null | undefined,
		dex: { items: { get: (name: string) => Item } }
	) {
		const rules = this.rules(formatid);
		const item = itemName ? dex.items.get(itemName) : null;
		const held = item?.exists ? item : null;
		const isEnigma = !!held && held.enigmaBase !== undefined && !held.enigmaPreset;
		const base = isEnigma ? dex.items.get(held.enigmaBase) : held;
		const reason = isEnigma ? '' : this.ineligible(held, formatid);
		const kind = isEnigma && rules.params ? this.kind(base!.id) : null;
		return {
			rules, item: held, base, isEnigma, reason, kind, param: isEnigma ? held.enigmaParam : undefined,
			placeholder: kind ? (rules.gen3 ? `stock: ${kind.stock}` : 'engine default') : '',
			hint: kind ? this.sentence(base!.id, base!.name, 'N') : '',
		};
	}
	toggle(
		itemName: string | null | undefined, checked: boolean, formatid: string | null | undefined,
		dex: { items: { get: (name: string) => Item } }
	): string | null {
		const state = this.state(itemName, formatid, dex);
		if (!state.base || state.item?.enigmaPreset) return null;
		if (!checked) return state.base.name;
		if (state.isEnigma) return state.item!.name;
		return state.reason ? null : this.name(state.base.name);
	}
	withParam(
		itemName: string | null | undefined, raw: string, formatid: string | null | undefined,
		dex: { items: { get: (name: string) => Item } }
	): string | null {
		const state = this.state(itemName, formatid, dex);
		if (!state.isEnigma || !state.kind) return null;
		const text = raw.trim();
		if (!text) return this.name(state.base!.name);
		if (!/^(0|[1-9][0-9]{0,2})$/.test(text) || Number(text) > 255) return null;
		return this.name(state.base!.name, Number(text));
	}
	fitCanvas: HTMLCanvasElement | null = null;
	textWidth(text: string, px: number): number {
		if (typeof document === 'undefined') return 0;
		const canvas = this.fitCanvas ||= document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (!context) return 0;
		context.font = `${px}px Verdana, Helvetica, Arial, sans-serif`;
		return context.measureText(text).width;
	}
	fitStyle(text: string | null | undefined, width = 108, px = 12): string {
		if (!text || !this.isCandidate(toID(text))) return '';
		const needed = this.textWidth(text, px);
		if (needed <= width) return '';
		return `font-size:${Math.max(7, Math.floor(px * 10 * width / needed) / 10)}px`;
	}
	isLongName(text: string | null | undefined, width: number, px: number): boolean {
		return !!text && this.isCandidate(toID(text)) && this.textWidth(text, px) > width;
	}
	presetRows(query: string, formatid: string | null | undefined): [string, string][] {
		if (!this.rules(formatid).enabled) return [];
		const rows: [string, string][] = [];
		for (const id in this.presets) {
			const preset = this.presets[id];
			if (!preset.confirmed) continue;
			const words = preset.name.split(' ');
			if (query && !id.startsWith(query) && !words.some(word => toID(word).startsWith(query))) continue;
			rows.push(['item', id]);
		}
		if (rows.length) rows.unshift(['header', 'e-Reader Berries']);
		return rows;
	}
	searchQuery(query: string, formatid: string | null | undefined): string {
		if (!this.rules(formatid).enabled) return query;
		const id = toID(query);
		if (!id.startsWith('enigma') || 'enigmaberry'.startsWith(id)) return query;
		return query.replace(/^\s*enigma\s*/i, '').replace(/\s*\(?\s*[0-9]+\s*\)?\s*$/, '');
	}
};

export const Dex = new class implements ModdedDex {
	readonly enigma = Enigma;
	enigmaRules(formatid: string | null | undefined) {
		return Enigma.rules(formatid);
	}
	readonly Ability = Ability;
	readonly Item = Item;
	readonly Move = Move;
	readonly Species = Species;

	readonly gen = 9;
	readonly modid = 'gen9' as ID;
	readonly cache = null!;

	readonly REGULAR = 0;
	readonly WEAK = 1;
	readonly RESIST = 2;
	readonly IMMUNE = 3;

	readonly statNames: readonly Dex.StatName[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
	readonly statNamesExceptHP: readonly Dex.StatNameExceptHP[] = ['atk', 'def', 'spa', 'spd', 'spe'];

	pokeballs: string[] | null = null;

	resourcePrefix = (() => {
		let prefix = '';
		if (window.document?.location?.protocol !== 'http:') prefix = 'https:';
		const host = window.Config ? (Config.routes.resourceServer || Config.routes.client) : 'play.pokemonshowdown.com';
		return `${prefix}//${host}/`;
	})();

	fxPrefix = (() => {
		const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
		const host = window.Config ? (Config.routes.resourceServer || Config.routes.client) : 'play.pokemonshowdown.com';
		return `${protocol}//${host}/fx/`;
	})();

	loadedSpriteData = { xy: 1, bw: 0 };
	loadedTextData: { [lang: string]: 1 | Promise<void> } = { en: 1 };
	moddedDexes: { [mod: string]: ModdedDex } = {};

	/**
	 * April Fools' Day setting:
	 * * `true` = FULL, all jokes on
	 * * `'sprites'` = SPRITES, only sprites and taunts
	 * * `false | null | undefined` = OFF
	 */
	afdMode?: boolean | 'sprites';

	mod(modid: ID): ModdedDex {
		if (modid === 'gen9') return this;
		if (!window.BattleTeambuilderTable) return this;
		if (modid in this.moddedDexes) {
			return this.moddedDexes[modid];
		}
		this.moddedDexes[modid] = new ModdedDex(modid);
		return this.moddedDexes[modid];
	}
	forGen(gen: number) {
		if (!gen) return this;
		return this.mod(`gen${gen}` as ID);
	}
	formats = {
		cache: Object.create(null) as { [id: string]: BattleFormat },
		get(name: string): BattleFormat {
			const id = toID(name);
			this.cache[id] ||= new BattleFormat(name, window.BattleFormats?.[id]);
			return this.cache[id];
		},
		load(data: { [id: string]: FormatData }): { [id: string]: BattleFormat } {
			// Update in-place so retained references get updated too
			for (const id in this.cache) {
				Object.assign(this.cache[id], new BattleFormat(this.cache[id].name, data[id]));
			}
			const formats: { [id: string]: BattleFormat } = {};
			for (const id in data) {
				const format = this.cache[id] ||= new BattleFormat(data[id].name, data[id]);
				formats[id] = format;
			}
			return formats;
		},
	};
	formatGen(format: string) {
		return this.formats.get(format).gen;
	}
	forFormat(format: string) {
		return this.mod(this.formats.get(format).mod);
	}

	resolveAvatar(avatar: string): string {
		if (window.BattleAvatarNumbers && avatar in BattleAvatarNumbers) {
			avatar = BattleAvatarNumbers[avatar];
		}
		if (avatar.startsWith('#')) {
			return Dex.resourcePrefix + 'sprites/trainers-custom/' + toID(avatar.substr(1)) + '.png';
		}
		if (avatar.includes('.')) {
			const prefix = (window.document?.location?.protocol === 'http:') ? '' : 'https:';
			return `${prefix}//${Config.routes.client}/avatars/${encodeURIComponent(avatar).replace(/%3F/g, '?')}`;
		}
		return Dex.resourcePrefix + 'sprites/trainers/' + Dex.sanitizeName(avatar || 'unknown') + '.png';
	}

	/**
	 * This is used to sanitize strings from data files like `moves.js` and
	 * `teambuilder-tables.js`.
	 *
	 * This makes sure untrusted strings can't wreak havoc if someone forgets to
	 * escape it before putting it in HTML.
	 *
	 * None of these characters belong in these files, anyway. (They can be used
	 * in move descriptions, but those are served from `text.js`, which are
	 * definitely always treated as unsanitized.)
	 */
	sanitizeName(name: any) {
		if (!name) return '';
		return ('' + name)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
			.slice(0, 50);
	}

	prefs(prop: string) {
		// @ts-expect-error this is what I get for calling it Storage...
		return window.Storage?.prefs ? window.Storage.prefs(prop) : window.PS?.prefs?.[prop];
	}

	text: ClientDexText = {
		getLanguage(text?: string) {
			let lang = Dex.prefs('language') || Dex.prefs('serversettings')?.language;
			if (lang) lang = TEXT_LANGUAGE_TABLE[lang]?.code;

			// oldclient doesn't autodetect language
			lang ||= window.PS ? this.getBrowserLanguage() : 'en';
			if (Dex.afdMode === true && lang === 'en') return 'en-afd';
			return lang;
		},
		getBrowserLanguage() {
			if (typeof navigator === 'undefined') return 'en';
			const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
			for (let language of languages) {
				language = language.toLowerCase().replace(/_/g, '-');
				if (language === 'zh' || language.startsWith('zh-')) {
					return /(?:^|-)(?:hant|tw|hk|mo)(?:-|$)/.test(language) ? 'zh-tw' : 'zh-cn';
				}
				const baseLanguage = language.split('-')[0];
				if (baseLanguage in TEXT_LANGUAGE_TABLE) return baseLanguage;
			}
			return 'en';
		},
		languages() {
			return TEXT_LANGUAGES;
		},
		findLanguage(lang: string) {
			return TEXT_LANGUAGE_TABLE[lang.toLowerCase()] || TEXT_LANGUAGE_TABLE[toID(lang)] || null;
		},
		get: (effect: TranslatableEffect, lang = Dex.text.getLanguage()) => {
			return getTextEntry(effect, 'gen9', 9, lang);
		},
	};

	getShortName(name: string) {
		let shortName = name.replace(/[^A-Za-z0-9]+$/, '');
		if (shortName.includes('(')) {
			shortName += name.slice(shortName.length).replace(/[^()]+/g, '').replace(/\(\)/g, '');
		}
		return shortName;
	}

	getEffect(name: string | null | undefined): PureEffect | Item | Ability | Move {
		name = (name || '').trim();
		if (name.substr(0, 5) === 'item:') {
			return Dex.items.get(name.substr(5).trim());
		} else if (name.substr(0, 8) === 'ability:') {
			return Dex.abilities.get(name.substr(8).trim());
		} else if (name.substr(0, 5) === 'move:') {
			return Dex.moves.get(name.substr(5).trim());
		}
		let id = toID(name);
		return new PureEffect(id, name);
	}

	moves = {
		get: (nameOrMove: string | Move | null | undefined): Move => {
			if (nameOrMove && typeof nameOrMove !== 'string') {
				// TODO: don't accept Moves here
				return nameOrMove;
			}
			let name = nameOrMove || '';
			const ppMatch = /(.*)\s+\((\d+|inf)(?:\/(\d+))?\)$/i.exec(name);
			if (ppMatch) name = ppMatch[1];
			let id = toID(name);
			if (window.BattleAliases && id in BattleAliases) {
				name = BattleAliases[id];
				id = toID(name);
			}
			if (!window.BattleMovedex) window.BattleMovedex = {};
			let data = window.BattleMovedex[id];
			if (data && typeof data.exists === 'boolean') return data;

			if (!data && id.substr(0, 11) === 'hiddenpower' && id.length > 11) {
				let [, hpWithType, hpPower] = /([a-z]*)([0-9]*)/.exec(id)!;
				data = {
					...(window.BattleMovedex[hpWithType] || {}),
					basePower: Number(hpPower) || 60,
				};
			}
			if (!data && id.substr(0, 6) === 'return' && id.length > 6) {
				data = {
					...(window.BattleMovedex['return'] || {}),
					basePower: Number(id.slice(6)),
				};
			}
			if (!data && id.substr(0, 11) === 'frustration' && id.length > 11) {
				data = {
					...(window.BattleMovedex['frustration'] || {}),
					basePower: Number(id.slice(11)),
				};
			}

			if (!data) data = { exists: false };
			let move = new Move(id, name, data);
			window.BattleMovedex[id] = move;
			return move;
		},
	};

	getGen3Category(type: string) {
		return [
			'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Psychic', 'Dark', 'Dragon',
		].includes(type) ? 'Special' : 'Physical';
	}

	items = {
		get: (nameOrItem: string | Item | null | undefined): Item => {
			if (nameOrItem && typeof nameOrItem !== 'string') {
				// TODO: don't accept Items here
				return nameOrItem;
			}
			let name = nameOrItem || '';
			let id = toID(nameOrItem);
			if (window.BattleAliases && id in BattleAliases) {
				name = BattleAliases[id];
				id = toID(name);
			}
			if (!window.BattleItems) window.BattleItems = {};
			const enigma = Enigma.get(id, this);
			if (enigma) return enigma;
			let data = window.BattleItems[id];
			if (data && typeof data.exists === 'boolean') return data;
			if (!data) data = { exists: false };
			let item = new Item(id, name, data);
			window.BattleItems[id] = item;
			return item;
		},
	};

	abilities = {
		get: (nameOrAbility: string | Ability | null | undefined): Ability => {
			if (nameOrAbility && typeof nameOrAbility !== 'string') {
				// TODO: don't accept Abilities here
				return nameOrAbility;
			}
			let name = nameOrAbility || '';
			let id = toID(nameOrAbility);
			if (window.BattleAliases && id in BattleAliases) {
				name = BattleAliases[id];
				id = toID(name);
			}
			if (!window.BattleAbilities) window.BattleAbilities = {};
			let data = window.BattleAbilities[id];
			if (data && typeof data.exists === 'boolean') return data;
			if (!data) data = { exists: false };
			let ability = new Ability(id, name, data);
			window.BattleAbilities[id] = ability;
			return ability;
		},
	};

	species = {
		get: (nameOrSpecies: string | Species | null | undefined): Species => {
			if (nameOrSpecies && typeof nameOrSpecies !== 'string') {
				// TODO: don't accept Species' here
				return nameOrSpecies;
			}
			let name = nameOrSpecies || '';
			let id = toID(nameOrSpecies);
			let formid = id;
			if (!window.BattlePokedexAltForms) window.BattlePokedexAltForms = {};
			if (formid in window.BattlePokedexAltForms) return window.BattlePokedexAltForms[formid];
			if (window.BattleAliases && id in BattleAliases) {
				name = BattleAliases[id];
				id = toID(name);
			} else if (window.BattlePokedex && !(id in BattlePokedex) && window.BattleBaseSpeciesChart) {
				for (const baseSpeciesId of BattleBaseSpeciesChart) {
					if (formid.startsWith(baseSpeciesId)) {
						id = baseSpeciesId;
						break;
					}
				}
			}
			if (!window.BattlePokedex) window.BattlePokedex = {};
			let data = window.BattlePokedex[id];

			let species: Species;
			if (data && typeof data.exists === 'boolean') {
				species = data;
			} else {
				if (data?.isCosmeticForme) {
					data = {
						...this.species.get(data.baseSpecies),
						...data,
						baseForme: "",
						otherFormes: null,
						cosmeticFormes: null,
					};
				}
				if (!data) data = { exists: false };
				if (!data.tier && id.endsWith('totem')) {
					data.tier = this.species.get(id.slice(0, -5)).tier;
				}
				if (!data.tier && data.baseSpecies && toID(data.baseSpecies) !== id) {
					data.tier = this.species.get(data.baseSpecies).tier;
				}
				data.nfe = data.id === 'dipplin' || !!(data as Species).evos?.some(evo => {
					const evoSpecies = this.species.get(evo);
					return !evoSpecies.isNonstandard || evoSpecies.isNonstandard === data.isNonstandard ||
						// Pokemon with Hisui evolutions
						evoSpecies.isNonstandard === "Unobtainable";
				});
				species = new Species(id, name, data);
				window.BattlePokedex[id] = species;
			}

			if (species.cosmeticFormes) {
				for (const forme of species.cosmeticFormes) {
					if (toID(forme) === formid) {
						species = new Species(formid, name, {
							...species,
							name: forme,
							forme: forme.slice(species.name.length + 1),
							baseForme: "",
							baseSpecies: species.name,
							otherFormes: null,
						});
						window.BattlePokedexAltForms[formid] = species;
						break;
					}
				}
			}

			return species;
		},
	};

	types = {
		allCache: null as Type[] | null,
		namesCache: null as Dex.TypeName[] | null,
		get: (type: any): Type => {
			if (!type || typeof type === 'string') {
				let id = toID(type) as string;
				if (!id && typeof type === 'string' && type.includes('?')) id = '???' as ID;
				const name = id === '???' ? '???' : id.substr(0, 1).toUpperCase() + id.substr(1);
				type = window.BattleTypeChart?.[id] || {};
				if (type.damageTaken) type.exists = true;
				if (!type.id) type.id = id;
				if (!type.name) type.name = name;
				if (!type.effectType) {
					type.effectType = 'Type';
				}
			}
			return type;
		},
		all: (): readonly Type[] => {
			if (this.types.allCache) return this.types.allCache;
			const types = [];
			for (const id in (window.BattleTypeChart || {})) {
				types.push(Dex.types.get(id));
			}
			if (types.length) this.types.allCache = types;
			return types;
		},
		names: (): readonly Dex.TypeName[] => {
			if (this.types.namesCache) return this.types.namesCache;
			const names = this.types.all().map(type => type.name as Dex.TypeName);
			names.splice(names.indexOf('Stellar'), 1);
			if (names.length) this.types.namesCache = names;
			return names;
		},
		isName: (name: string | null): boolean => {
			const id = toID(name);
			if (name !== id.substr(0, 1).toUpperCase() + id.substr(1)) return false;
			return window.BattleTypeChart?.hasOwnProperty(id);
		},
	};

	hasAbility(species: Species, ability: string) {
		for (const i in species.abilities) {
			if (ability === species.abilities[i as '0']) return true;
		}
		return false;
	}

	loadSpriteData(gen: 'xy' | 'bw') {
		if (this.loadedSpriteData[gen]) return;
		this.loadedSpriteData[gen] = 1;

		let path = $('script[src*="pokedex-mini.js"]').attr('src') || '';
		let qs = '?' + (path.split('?')[1] || '');
		path = ((/.+?(?=data\/pokedex-mini\.js)/.exec(path)) || [])[0] || '';

		let el = document.createElement('script');
		el.src = path + 'data/pokedex-mini-bw.js' + qs;
		document.getElementsByTagName('body')[0].appendChild(el);
	}

	phnnDisguisePalette(realSpecies: Species, mode: 'gen1' | 'sw', shiny?: boolean): string[] | null {
		if (mode === 'gen1') {
			const num = realSpecies.num >= 1 && realSpecies.num <= 151 ? realSpecies.num : 0;
			return PHNN_GEN1_PALETTES[PHNN_GEN1_PAL_IDS[num]] || null;
		}
		let swNum = PHNN_SW_DEXNUMS[realSpecies.id];
		if (swNum === undefined) swNum = PHNN_SW_DEXNUMS[realSpecies.id.replace(/sw$/, '')];
		if (swNum === undefined && realSpecies.num >= 1 && realSpecies.num <= 151) swNum = realSpecies.num;
		if (swNum === undefined) swNum = 0;
		let palId = PHNN_SW_PAL_IDS[swNum] || 15;
		if (shiny && PHNN_SW_PALETTES[palId + 10]) palId += 10;
		return PHNN_SW_PALETTES[palId] || null;
	}

	phnnRecolorSprite(url: string, palette: string[], onReady?: () => void): string | null {
		const key = url + '|' + palette.join('');
		const cached = phnnDisguiseRecolorCache[key];
		if (cached) return cached === 'FAIL' ? null : cached;
		phnnDisguiseRecolorCache[key] = 'PENDING';
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d')!;
				ctx.drawImage(img, 0, 0);
				const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const px = data.data;
				const pal = palette.map(hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
				let min = 255;
				let max = 0;
				for (let i = 0; i < px.length; i += 4) {
					if (px[i + 3] < 128) continue;
					const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
					if (lum < min) min = lum;
					if (lum > max) max = lum;
				}
				const range = Math.max(1, max - min);
				for (let i = 0; i < px.length; i += 4) {
					if (px[i + 3] < 128) continue;
					const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
					const tt = (lum - min) / range;
					const c = pal[tt >= 0.78 ? 0 : tt >= 0.45 ? 1 : tt >= 0.12 ? 2 : 3];
					px[i] = c[0];
					px[i + 1] = c[1];
					px[i + 2] = c[2];
				}
				ctx.putImageData(data, 0, 0);
				phnnDisguiseRecolorCache[key] = canvas.toDataURL();
			} catch {
				phnnDisguiseRecolorCache[key] = 'FAIL';
			}
			if (onReady) onReady();
		};
		img.onerror = () => {
			phnnDisguiseRecolorCache[key] = 'FAIL';
			if (onReady) onReady();
		};
		img.src = url;
		return null;
	}

	phnnDisguiseModeForBattle(battle: any): 'gen1' | 'sw' | null {
		if (!battle) return null;
		const tier: string = battle.tier || '';
		if (!tier.includes('Disguises')) return null;
		if (tier.includes('SpaceWorld')) return 'sw';
		if (battle.gen === 1) return 'gen1';
		return null;
	}

	phnnBuildDisguiseSprite(realName: string, disguiseName: string, mode: 'gen1' | 'sw', shiny: boolean, isFront: boolean, options: AnyObject) {
		const realSpecies = this.species.get(realName);
		const disguiseSpecies = this.species.get(disguiseName);
		if (!disguiseSpecies.exists || disguiseSpecies.id === realSpecies.id) return null;
		const sd = this.getSpriteData(disguiseName, isFront, options);
		if (!sd || !sd.url) return null;
		if (mode === 'gen1' && sd.gen && sd.gen > 2) return null;
		let artUrl = sd.url;
		if (mode === 'gen1') {
			const m = /sprites\/(gen1-back)\/([^/]+\.png)$/.exec(artUrl);
			if (m) {
				const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
				const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
				artUrl = `${protocol}//${host}/sprites/${m[1]}/${m[2]}`;
			}
		}
		const palette = this.phnnDisguisePalette(realSpecies, mode, shiny);
		if (palette) {
			const tinted = this.phnnRecolorSprite(artUrl, palette);
			sd.url = tinted || artUrl;
		} else {
			sd.url = artUrl;
		}
		return sd;
	}

	phnnDisguiseSpriteData(mon: Pokemon, isFront: boolean, options: AnyObject) {
		const side: any = (mon as any).side;
		const battle = side?.battle;
		if (!battle || side.isFar) return null;
		const mode = this.phnnDisguiseModeForBattle(battle);
		if (!mode) return null;
		const my: any[] = battle.myPokemon || [];
		const monAny: any = mon;
		const entry = my.find(p => p?.disguise && p.ident === monAny.ident && p.details === monAny.details) ||
			my.find(p => p?.disguise && p.ident === monAny.ident);
		if (!entry) return null;
		return this.phnnBuildDisguiseSprite(mon.getSpeciesForme(), entry.disguise, mode, !!monAny.shiny, isFront, options);
	}

	phnnPrewarmDisguises(battle: any) {
		const mode = this.phnnDisguiseModeForBattle(battle);
		if (!mode) return;
		for (const entry of battle.myPokemon || []) {
			if (!entry?.disguise || !entry.details) continue;
			const realName = entry.details.split(',')[0];
			const shiny = entry.details.includes(', shiny');
			this.phnnBuildDisguiseSprite(realName, entry.disguise, mode, shiny, false, { gen: battle.gen });
		}
	}


	loadTextData(lang = this.text.getLanguage()): Promise<void> {
		const text = typeof BattleText === 'undefined' ? undefined : BattleText;
		updateTranslatedNames(lang);
		if (text?.[lang]) {
			return Promise.resolve();
		}
		// in case the initial English failed to load
		if (this.loadedTextData[lang] === 1) delete this.loadedTextData[lang];
		if (typeof document === 'undefined') return Promise.resolve();
		const existing = this.loadedTextData[lang];
		if (existing) return existing === 1 ? Promise.resolve() : existing;

		const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
			const el = document.createElement('script');
			el.src = src;
			el.onload = () => resolve();
			el.onerror = () => reject(new Error(`Failed to load text data from ${src}`));
			document.getElementsByTagName('body')[0].appendChild(el);
		});
		const cachebuster = Config.translationCachebuster ? `?${Config.translationCachebuster}` : '';
		const textURL = Config.testclient ? `data/text/${lang}.js` : `${this.resourcePrefix}data/text/${lang}.js`;
		let loading = loadScript(textURL + cachebuster);
		if (Config.testclient) {
			loading = loading.catch(() =>
				loadScript(`https://play.pokemonshowdown.com/data/text/${lang}.js${cachebuster}`)
			);
		}
		loading = loading.then(() => updateTranslatedNames(lang)).catch(() => {
			delete this.loadedTextData[lang];
			updateTranslatedNames(lang);
		});
		this.loadedTextData[lang] = loading;
		return loading;
	}
	getSpriteData(pokemon: Pokemon | Species | string, isFront: boolean, options: {
		gen?: number,
		shiny?: boolean,
		gender?: Dex.GenderName,
		afd?: boolean,
		noScale?: boolean,
		mod?: string,
		dynamax?: boolean,
	} = { gen: 6 }) {
		if (pokemon instanceof Pokemon && !isFront) {
			const phnnDisguised = this.phnnDisguiseSpriteData(pokemon, isFront, options);
			if (phnnDisguised) return phnnDisguised;
		}
		if (RomHacks.battleSprites) {
			let hackId = '';
			let hackShiny = options.shiny;
			if (pokemon instanceof Pokemon) {
				hackId = toID(pokemon.volatiles.transform?.[1]?.speciesForme || pokemon.volatiles.formechange?.[1] ||
					pokemon.getSpeciesForme());
				hackShiny = pokemon.shiny;
			} else {
				hackId = toID(typeof pokemon === 'string' ? pokemon : pokemon.id);
			}
			const hackUrl = RomHacks.sprite((isFront ? 'front' : 'back') + (hackShiny ? '-shiny' : ''), hackId);
			if (hackUrl) {
				const hackSize = ({ 56: 112, 64: 128, 80: 120, 96: 96 } as any)[RomHacks.active.sprites.size || 64] || 128;
				return {
					gen: 3, w: hackSize, h: hackSize, y: 0, url: hackUrl, pixelated: true, isFrontSprite: isFront,
					cryurl: '', shiny: hackShiny,
				};
			}
		}
		const mechanicsGen = options.gen || 6;
		let isDynamax = !!options.dynamax;
		if (pokemon instanceof Pokemon) {
			if (pokemon.volatiles.transform) {
				options.shiny = pokemon.volatiles.transform[2];
				options.gender = pokemon.volatiles.transform[3];
			} else {
				options.shiny = pokemon.shiny;
				options.gender = pokemon.gender;
			}
			let isGigantamax = false;
			if (pokemon.volatiles.dynamax) {
				if (pokemon.volatiles.dynamax[1]) {
					isGigantamax = true;
				} else if (options.dynamax !== false) {
					isDynamax = true;
				}
			}
			pokemon = pokemon.getSpeciesForme() + (isGigantamax ? '-Gmax' : '');
		}
		const species = Dex.species.get(pokemon);
		const phnnSpriteMeta: {[id: string]: any} = {
			arceusshadow: { fw: 120, fh: 120, fpx: false, back: 1, bw: 110, bh: 124, shinyFront: 1, sfw: 131, sfh: 170, shinyBack: 1, sbw: 110, sbh: 124, battle: 1, btw: 125, bth: 135 },
			arceusquestion: { fw: 105, fh: 120, fpx: false, back: 1, bw: 124, bh: 112, shinyFront: 1, sfw: 105, sfh: 120, shinyBack: 1, sbw: 124, sbh: 112 },
			lugiashadow: { fw: 134, fh: 119, fpx: true, back: 1, bw: 134, bh: 123 },
			mewtwoshadow: { fw: 120, fh: 120, fpx: false, back: 1, bw: 124, bh: 117, shinyFront: 1, sfw: 130, sfh: 130, shinyBack: 1, battle: 1, btw: 135, bth: 130 },
			mewtwoshadowmegax: { fw: 120, fh: 120, fpx: false, back: 1, bw: 93, bh: 132, shinyFront: 1, sfw: 140, sfh: 140, shinyBack: 1, battle: 1, btw: 100, bth: 142 },
			mewtwoarmored: { fw: 120, fh: 120, fpx: false, back: 1, bw: 95, bh: 155, shinyFront: 1, sfw: 120, sfh: 135, shinyBack: 1, battle: 1, btw: 120, bth: 135 },
			jynxmega: { fw: 113, fh: 91, fpx: false, back: 1, bw: 110, bh: 86 },
			hakamoototem: { fw: 120, fh: 120, fpx: false },
			wishiwashitotem: { fw: 120, fh: 120, fpx: false },
		};
		const sw97Id = sw97ArtId(species.id, options.mod);
		if (SW97_SPRITE_SIZES[sw97Id] && !(options.shiny && sw97Id !== species.id)) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			const useBack = !isFront;
			const size = useBack ? 96 : SW97_SPRITE_SIZES[sw97Id];
			return {
				gen: mechanicsGen,
				w: size, h: size, y: 0,
				url: `${protocol}//${host}/sprites/sw97/${sw97Id}${useBack ? '-back' : ''}.png`,
				pixelated: true,
				isFrontSprite: isFront,
				cryurl: '',
				shiny: !!options.shiny,
			};
		}
		if (GLITCH_SPRITE_SIZES[species.id]) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			const size = GLITCH_SPRITE_SIZES[species.id];
			return {
				gen: mechanicsGen,
				w: size, h: size, y: 0,
				url: `${protocol}//${host}/sprites/glitch/${species.id}${!isFront ? '-back' : ''}.png`,
				pixelated: true,
				isFrontSprite: isFront,
				cryurl: '',
				shiny: !!options.shiny,
			};
		}
		const phnnMeta = phnnSpriteMeta[species.id] || (window as any).PhnnLocalSprites?.spriteMeta?.[species.id];
		if (phnnMeta) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			const useBack = !isFront && !!phnnMeta.back;
			let file: string, w: number, h: number, px: boolean;
			if (useBack) {
				file = (options.shiny && phnnMeta.shinyBack) ? `${species.id}-shiny-back` : `${species.id}-back`;
				w = phnnMeta.bw; h = phnnMeta.bh; px = true;
			} else if (options.shiny && phnnMeta.shinyFront) {
				file = `${species.id}-shiny`; w = phnnMeta.sfw || phnnMeta.fw; h = phnnMeta.sfh || phnnMeta.fh; px = !!phnnMeta.fpx;
			} else if (!options.shiny && phnnMeta.battle) {
				file = `${species.id}-battle`; w = phnnMeta.btw || phnnMeta.fw; h = phnnMeta.bth || phnnMeta.fh; px = false;
			} else {
				file = species.id; w = phnnMeta.fw; h = phnnMeta.fh; px = !!phnnMeta.fpx;
			}
			return {
				gen: mechanicsGen,
				w, h, y: 0,
				url: `${protocol}//${host}/${phnnMeta.dir || 'sprites/phnn'}/${file}.${phnnMeta.ext || 'png'}`,
				pixelated: px,
				isFrontSprite: isFront,
				cryurl: species.id === 'jynxmega' ? `${protocol}//${host}/audio/cries/jynx-mega.mp3` : '',
				shiny: !!options.shiny,
			};
		}
		// Gmax sprites are already extremely large, so we don't need to double.
		if (species.name.endsWith('-Gmax')) isDynamax = false;
		let spriteData = {
			gen: mechanicsGen,
			w: 96,
			h: 96,
			y: 0,
			url: Dex.resourcePrefix + 'sprites/',
			pixelated: true,
			isFrontSprite: false,
			cryurl: '',
			shiny: options.shiny,
		};
		let name = species.spriteid;
		let dir;
		let facing;
		if (isFront) {
			spriteData.isFrontSprite = true;
			dir = '';
			facing = 'front';
		} else {
			dir = '-back';
			facing = 'back';
		}

		// Decide which gen sprites to use.
		//
		// There are several different generations we care about here:
		//
		//   - mechanicsGen: the generation number of the mechanics and battle (options.gen)
		//   - graphicsGen: the generation number of sprite/field graphics the user has requested.
		//     This will default to mechanicsGen, but may be altered depending on user preferences.
		//   - spriteData.gen: the generation number of a the specific Pokemon sprite in question.
		//     This defaults to graphicsGen, but if the graphicsGen doesn't have a sprite for the Pokemon
		//     (eg. Darmanitan in graphicsGen 2) then we go up gens until it exists.
		//
		let graphicsGen = mechanicsGen;
		if (Dex.prefs('nopastgens')) graphicsGen = 6;
		if (Dex.prefs('bwgfx') && graphicsGen >= 6) graphicsGen = 5;
		spriteData.gen = Math.max(graphicsGen, Math.min(species.gen, 5));
		const baseDir = ['', 'gen1', 'gen2', 'gen3', 'gen4', 'gen5', '', '', '', ''][spriteData.gen];

		let miscData = null;
		let speciesid = species.id;
		if (species.isTotem || /(alpha|titan)$/.test(species.formeid)) speciesid = toID(name);
		if (window.BattlePokemonSprites) miscData = BattlePokemonSprites[speciesid];
		if (!miscData && window.BattlePokemonSpritesBW) miscData = BattlePokemonSpritesBW[speciesid];
		if (!miscData) miscData = {};

		if (miscData.num !== 0 && miscData.num > -5000) {
			let baseSpeciesid = toID(species.baseSpecies);
			spriteData.cryurl = 'audio/cries/' + baseSpeciesid;
			let formeid = species.formeid;
			const specialFormeCries = [
				'-bloodmoon', '-crowned', '-eternal', '-eternamax', '-four', '-hangry', '-hero', '-lowkey', '-noice', '-primal', '-rapidstrike', '-roaming', '-school', '-sky', '-starter', '-super', '-therian', '-unbound',
			];
			const specialBaseSpeciesCries = [
				'calyrex', 'kyurem', 'cramorant', 'indeedee', 'lycanroc', 'necrozma', 'oinkologne', 'oricorio', 'slowpoke', 'tatsugiri', 'zygarde',
			];
			if (species.isMega ||
				formeid && (specialFormeCries.includes(formeid) || specialBaseSpeciesCries.includes(baseSpeciesid))) {
				if (species.isMega && (baseSpeciesid === 'meowstic' || baseSpeciesid === 'tatsugiri')) {
					spriteData.cryurl += '-mega';
				} else {
					spriteData.cryurl += formeid;
				}
			}
			spriteData.cryurl += '.mp3';
		}
		if (speciesid === 'jynxmega') {
			spriteData.cryurl = `https://${window.Config?.routes?.client || 'play.hackmons.com'}/audio/cries/jynx-mega.mp3`;
		}

		if (options.shiny && mechanicsGen > 1) dir += '-shiny';

		// April Fool's 2014
		if (Dex.afdMode || options.afd) {
			// Explicit false check above means AFD will be off if the user disables it - no matter what
			dir = 'afd' + dir;
			spriteData.url += dir + '/' + name + '.png';
			// Duplicate code but needed to make AFD tinymax work
			// April Fool's 2020
			if (isDynamax && !options.noScale) {
				spriteData.w *= 0.25;
				spriteData.h *= 0.25;
				spriteData.y += -22;
			} else if (species.isTotem && !options.noScale) {
				spriteData.w *= 0.5;
				spriteData.h *= 0.5;
				spriteData.y += -11;
			}
			return spriteData;
		}

		// Mod Cries
		if (options.mod && options.mod !== 'gen2spaceworld') {
			spriteData.cryurl = `sprites/${options.mod}/audio/${toID(species.baseSpecies)}`;
			spriteData.cryurl += '.mp3';
		}

		let animatedSprite = false;
		if (!Dex.prefs('noanim') && !Dex.prefs('nogif') && spriteData.gen >= 5) {
			const animationArray: [AnyObject, string][] = [];
			if (baseDir === '' && window.BattlePokemonSprites) {
				animationArray.push([BattlePokemonSprites[speciesid], '']);
			}
			if (window.BattlePokemonSpritesBW) {
				animationArray.push([BattlePokemonSpritesBW[speciesid], 'gen5']);
			}
			for (const [animationData, animDir] of animationArray) {
				if (!animationData) continue;
				if (animationData[facing + 'f'] && options.gender === 'F') facing += 'f';
				if (!animationData[facing]) continue;
				if (facing.endsWith('f')) name += '-f';
				if (spriteData.gen >= 6) spriteData.pixelated = false;
				dir = animDir + 'ani' + dir;
				spriteData.w = animationData[facing].w;
				spriteData.h = animationData[facing].h;
				spriteData.url += dir + '/' + name + '.gif';
				animatedSprite = true;
				break;
			}
		}
		if (!animatedSprite) {
			// There is no entry or enough data in pokedex-mini.js
			// Handle these in case-by-case basis; either using BW sprites or matching the played gen.
			dir = (baseDir || 'gen5') + dir;

			// Gender differences don't exist prior to Gen 4,
			// so there are no sprites for it
			if (spriteData.gen >= 4 && miscData['frontf'] && options.gender === 'F') {
				name += '-f';
			}

			spriteData.url += dir + '/' + name + '.png';
		}

		if (!options.noScale) {
			if (graphicsGen > 4) {
				// no scaling
			} else if (spriteData.isFrontSprite) {
				spriteData.w *= 2;
				spriteData.h *= 2;
				spriteData.y += -16;
			} else {
				// old gen backsprites are multiplied by 1.5x by the 3D engine
				spriteData.w *= 2 / 1.5;
				spriteData.h *= 2 / 1.5;
				spriteData.y += -11;
			}
			if (spriteData.gen <= 2) spriteData.y += 2;
		}
		if (isDynamax && !options.noScale) {
			spriteData.w *= 2;
			spriteData.h *= 2;
			spriteData.y += -22;
		} else if (species.isTotem && !options.noScale) {
			spriteData.w *= 1.5;
			spriteData.h *= 1.5;
			spriteData.y += -11;
		}

		return spriteData;
	}

	getPokemonIconNum(id: ID, isFemale?: boolean, facingLeft?: boolean) {
		let num = 0;
		if (window.BattlePokemonSprites?.[id]?.num) {
			num = BattlePokemonSprites[id].num;
		} else if (window.BattlePokedex?.[id]?.num) {
			num = BattlePokedex[id].num;
		}
		if (num < 0) num = 0;
		if (num > 1025) num = 0;

		if (window.BattlePokemonIconIndexes?.[id]) {
			num = BattlePokemonIconIndexes[id];
		}

		if (isFemale) {
			if (['unfezant', 'frillish', 'jellicent', 'meowstic', 'pyroar'].includes(id)) {
				num = BattlePokemonIconIndexes[id + 'f'];
			}
		}
		if (facingLeft) {
			if (BattlePokemonIconIndexesLeft[id]) {
				num = BattlePokemonIconIndexesLeft[id];
			}
		}
		return num;
	}

	getPokemonIcon(pokemon: string | Pokemon | ServerPokemon | Dex.PokemonSet | null, facingLeft?: boolean, mod?: string) {
		if (pokemon === 'pokeball') {
			return `background:transparent url(${Dex.resourcePrefix}sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -0px 4px`;
		} else if (pokemon === 'pokeball-statused') {
			return `background:transparent url(${Dex.resourcePrefix}sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -40px 4px`;
		} else if (pokemon === 'pokeball-fainted') {
			return `background:transparent url(${Dex.resourcePrefix}sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -80px 4px;opacity:.4;filter:contrast(0)`;
		} else if (pokemon === 'pokeball-none') {
			return `background:transparent url(${Dex.resourcePrefix}sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -80px 4px`;
		}

		let id = toID(pokemon);
		if (!mod && pokemon && typeof pokemon === 'object') mod = (pokemon as any).side?.battle?.dex?.modid;
		if (!pokemon || typeof pokemon === 'string') pokemon = null;
		// @ts-expect-error safe, but too lazy to cast
		if (pokemon?.speciesForme) id = toID(pokemon.speciesForme);
		// @ts-expect-error safe, but too lazy to cast
		if (pokemon?.species) id = toID(pokemon.species);
		// @ts-expect-error safe, but too lazy to cast
		if (pokemon?.volatiles?.formechange && !pokemon.volatiles.transform) {
			// @ts-expect-error safe, but too lazy to cast
			id = toID(pokemon.volatiles.formechange[1]);
		}
		const hackIcons = RomHacks.battleSprites || RomHacks.builderSprites || (!!mod && mod === RomHacks.modid);
		const hackFainted = (pokemon as any)?.fainted ? ';opacity:.3;filter:grayscale(100%) brightness(.5)' : '';
		if (hackIcons && RomHacks.hasOverworld(id)) {
			return `background:transparent url(${RomHacks.spriteUrl('overworld', id)}) no-repeat scroll center/32px 32px;image-rendering:pixelated${hackFainted}`;
		}
		const hackIconUrl = hackIcons ? RomHacks.sprite('front', id) : '';
		if (hackIconUrl) {
			return `background:transparent url(${hackIconUrl}) no-repeat scroll center;background-size:contain;image-rendering:pixelated${hackFainted}`;
		}
		const phnnIconIds: {[id: string]: number} = {
			arceusshadow: 2, arceusquestion: 2, lugiashadow: 2, mewtwoshadow: 2, mewtwoshadowmegax: 2, mewtwoarmored: 1, jynxmega: 1,
			pokestarspirit: 1,
		};
		const sw97IconId = sw97ArtId(id, mod);
		if (SW97_SPRITE_SIZES[sw97IconId]) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			return `background:transparent url(${protocol}//${host}/sprites/sw97/${sw97IconId}-icon.png) no-repeat scroll center/contain;image-rendering:pixelated`;
		}
		if (GLITCH_SPRITE_SIZES[id]) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			return `background:transparent url(${protocol}//${host}/sprites/glitch/${id}-icon.png) no-repeat scroll center/contain;image-rendering:pixelated`;
		}
		if (phnnIconIds[id]) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			if (phnnIconIds[id] === 2) {
				return `background:transparent url(${protocol}//${host}/sprites/phnn/${id}-icon.png) no-repeat scroll center`;
			}
			return `background:transparent url(${protocol}//${host}/sprites/phnn/${id}-icon.png) no-repeat scroll center/contain;image-rendering:pixelated`;
		}
		const localIcon = (window as any).PhnnLocalSprites?.icons?.[id];
		if (localIcon) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			return `background:transparent url(${protocol}//${host}/${localIcon}) no-repeat scroll center/contain;image-rendering:pixelated`;
		}
		let num = this.getPokemonIconNum(id, pokemon?.gender === 'F', facingLeft);

		let top = Math.floor(num / 12) * 30;
		let left = (num % 12) * 40;
		let fainted = ((pokemon as Pokemon | ServerPokemon)?.fainted ?
			`;opacity:.3;filter:grayscale(100%) brightness(.5)` : ``);
		return `background:transparent url(${Dex.resourcePrefix}sprites/pokemonicons-sheet.png?v22) no-repeat scroll -${left}px -${top}px${fainted}`;
	}

	getTeambuilderSpriteData(pokemon: any, dex: ModdedDex = Dex): TeambuilderSpriteData {
		let gen = dex.gen;
		let id = toID(pokemon.species || pokemon);
		let species = Dex.species.get(id);
		let spriteid: string;
		if (typeof pokemon === 'string') {
			spriteid = species.spriteid || id;
		} else {
			spriteid = pokemon.spriteid;
			if (pokemon.species && !spriteid) {
				spriteid = species.spriteid || id;
			}
		}
		if (species.exists === false) return { spriteDir: 'sprites/gen5', spriteid: '0', x: 10, y: 5, pixelated: true };
		const phnnLocalSpriteIds: {[id: string]: number} = {
			arceusshadow: 1, arceusquestion: 1, mewtwoshadow: 1, mewtwoshadowmegax: 1, mewtwoarmored: 1, lugiashadow: 1, hakamoototem: 1, wishiwashitotem: 1, jynxmega: 1,
		};
		const tbSw97Id = sw97ArtId(species.id, dex.modid);
		if (SW97_SPRITE_SIZES[tbSw97Id] && !(pokemon.shiny && tbSw97Id !== species.id)) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			const size = SW97_SPRITE_SIZES[tbSw97Id];
			return {
				spriteid: tbSw97Id,
				spriteDir: 'sprites/sw97',
				x: Math.max(0, Math.floor((96 - size) / 2)),
				y: Math.max(0, Math.floor((96 - size) / 2)),
				pixelated: true,
				customPrefix: `${protocol}//${host}/`,
			};
		}
		if (GLITCH_SPRITE_SIZES[species.id]) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			const size = GLITCH_SPRITE_SIZES[species.id];
			return {
				spriteid: species.id,
				spriteDir: 'sprites/glitch',
				x: Math.max(0, Math.floor((96 - size) / 2)),
				y: Math.max(0, Math.floor((96 - size) / 2)),
				pixelated: true,
				customPrefix: `${protocol}//${host}/`,
			};
		}
		if (phnnLocalSpriteIds[species.id]) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			const isPixel = species.id === 'lugiashadow';
			const phnnShinyFrontIds: {[id: string]: number} = { arceusshadow: 1, arceusquestion: 1, mewtwoshadow: 1, mewtwoshadowmegax: 1, mewtwoarmored: 1 };
			const useShiny = pokemon.shiny && phnnShinyFrontIds[species.id];
			return {
				spriteid: useShiny ? `${species.id}-shiny` : species.id,
				spriteDir: 'sprites/phnn',
				x: isPixel ? 14 : 10,
				y: isPixel ? 16 : 12,
				h: isPixel ? 76 : 80,
				pixelated: isPixel,
				customPrefix: `${protocol}//${host}/`,
			};
		}
		const localTb = (window as any).PhnnLocalSprites?.teambuilder?.[species.id];
		if (localTb) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			return { ...localTb, customPrefix: `${protocol}//${host}/` };
		}
		if (Dex.afdMode) {
			return {
				spriteid,
				spriteDir: 'sprites/afd',
				shiny: !!pokemon.shiny,
				x: 10,
				y: 5,
			};
		}
		const spriteData: TeambuilderSpriteData = {
			spriteid,
			spriteDir: 'sprites/dex',
			x: -2,
			y: -3,
		};
		if (pokemon.shiny) spriteData.shiny = true;
		if (dex.modid === 'gen7letsgo') gen = 8;
		if (Dex.prefs('nopastgens')) gen = 9;
		if (Dex.prefs('bwgfx') && gen > 5) gen = 5;
		// TODO: refactor after we get home sprites for Z-A Megas and Eternal Floette
		let homeExists = (!species.isNonstandard || !['CAP', 'Custom'].includes(species.isNonstandard) ||
			species.id === "xerneasneutral") && ![
			"floetteeternal", "pichuspikyeared", "pikachubelle", "pikachucosplay", "pikachulibre", "pikachuphd", "pikachupopstar", "pikachurockstar",
		].includes(species.id) && !(species.isMega && species.gen === 9);
		if (gen >= 8 && homeExists) {
			spriteData.spriteDir = 'sprites/home-centered';
			spriteData.x = 8;
			spriteData.y = 10;
			spriteData.h = 96;
			return spriteData;
		}
		let xydexExists = (!species.isNonstandard || species.isNonstandard === 'Past' || species.isNonstandard === 'CAP') || [
			"pikachustarter", "eeveestarter", "meltan", "melmetal", "pokestarufo", "pokestarufo2", "pokestarbrycenman", "pokestarmt", "pokestarmt2", "pokestargiant", "pokestarhumanoid", "pokestarmonster", "pokestarf00", "pokestarf002", "pokestarspirit",
		].includes(species.id);
		if (species.gen >= 8 && species.isNonstandard !== 'CAP') xydexExists = false;
		if (gen >= 6 && xydexExists) {
			if (species.gen >= 7) {
				spriteData.x = -6;
				spriteData.y = -7;
			} else if (id.substr(0, 6) === 'arceus') {
				spriteData.x = -2;
				spriteData.y = 7;
			} else if (id === 'garchomp') {
				spriteData.x = -2;
				spriteData.y = 2;
			} else if (id === 'garchompmega') {
				spriteData.x = -2;
				spriteData.y = 0;
			}
			return spriteData;
		}
		spriteData.spriteDir = 'sprites/gen5';
		if (gen <= 1 && species.gen <= 1) spriteData.spriteDir = 'sprites/gen1';
		else if (gen <= 2 && species.gen <= 2) spriteData.spriteDir = 'sprites/gen2';
		else if (gen <= 3 && species.gen <= 3) spriteData.spriteDir = 'sprites/gen3';
		else if (gen <= 4 && species.gen <= 4) spriteData.spriteDir = 'sprites/gen4';
		spriteData.pixelated = true;
		spriteData.x = 10;
		spriteData.y = 5;
		return spriteData;
	}

	getTeambuilderSprite(pokemon: any, dex?: ModdedDex, xOffset = 0, yOffset = 0, overworldAt?: [number, number]) {
		if (!pokemon) return '';
		if (dex && dex.modid === RomHacks.modid) {
			const hackId = toID(pokemon.species || pokemon);
			const hackUrl = RomHacks.sprite(pokemon.shiny ? 'front-shiny' : 'front', hackId);
			if (hackUrl) {
				if (overworldAt && RomHacks.hasOverworld(hackId)) {
					return `background-image:url(${RomHacks.spriteUrl('overworld', hackId)}),url(${hackUrl});background-position:${overworldAt[0]}px ${overworldAt[1]}px,${10 + xOffset}px ${5 + yOffset}px;background-repeat:no-repeat;background-size:32px 32px,96px;image-rendering:pixelated;`;
				}
				return `background-image:url(${hackUrl});background-position:${10 + xOffset}px ${5 + yOffset}px;background-repeat:no-repeat;background-size:96px;image-rendering:pixelated;`;
			}
		}
		const data = this.getTeambuilderSpriteData(pokemon, dex);
		const shiny = (data.shiny ? '-shiny' : '');
		const resize = (data.h ? `background-size:${data.h}px;` : '');
		const pixelated = (data.pixelated ? `image-rendering:pixelated;` : '');
		const prefix = data.customPrefix || Dex.resourcePrefix;
		return `background-image:url(${prefix}${data.spriteDir}${shiny}/${data.spriteid}.${(data as any).ext || 'png'});background-position:${data.x + xOffset}px ${data.y + yOffset}px;background-repeat:no-repeat;${resize}${pixelated}`;
	}

	getItemIcon(item: any) {
		let num = 0;
		const hackItemId = toID(typeof item === 'string' ? item : item?.name);
		if (hackItemId && (RomHacks.battleSprites || RomHacks.builderSprites) && RomHacks.hasSprite('items', hackItemId)) {
			return `background:transparent url(${RomHacks.spriteUrl('item', hackItemId)}) no-repeat scroll center;background-size:contain;image-rendering:pixelated`;
		}
		if (typeof item === 'string' && window.BattleItems) {
			item = window.BattleItems[toID(item)] || Enigma.get(toID(item), Dex);
		}
		const phnnPlateIcons: {[id: string]: string} = { shadowplate: 'shadowplate-icon', questionmarkplate: 'questionmarkplate-icon', blankplate: 'blankplate-icon', legendplate: 'legendplate-icon', shadowiniumz: 'shadowiniumz', questiniumz: 'questiniumz', shadowcloak: 'shadowcloak', brokendisk: 'brokendisk', apple: 'apple', calmberry: 'calmberry', earth: 'earth', firetail: 'firetail', focusorb: 'focusorb', prettytail: 'prettytail', quickneedle: 'quickneedle', sharpscythe: 'sharpscythe', snakeskin: 'snakeskin', stimulusorb: 'stimulusorb', strangethread: 'strangethread', thundertail: 'thundertail', watertail: 'watertail' };
		const phnnPlateId = phnnPlateIcons[item?.enigmaBase || toID(item?.name)];
		if (phnnPlateId) {
			const protocol = (window.document?.location?.protocol !== 'http:') ? 'https:' : '';
			const host = window.Config ? Config.routes.client : 'beta.hackmons.com';
			return `background:transparent url(${protocol}//${host}/sprites/phnn/${phnnPlateId}.png) no-repeat scroll center;background-size:contain;image-rendering:pixelated`;
		}
		if (item?.spritenum) num = item.spritenum;

		let top = Math.floor(num / 16) * 24;
		let left = (num % 16) * 24;
		return `background:transparent url(${Dex.resourcePrefix}sprites/itemicons-sheet.png?v1) no-repeat scroll -${left}px -${top}px`;
	}

	hasTypeIcon(type: string | null | undefined) {
		const id = toID(type);
		if (!id || id === 'bird') return true;
		const chart = window.BattleTypeChart;
		return !chart || Object.prototype.hasOwnProperty.call(chart, id);
	}
	getTypeBadge(type: string, b?: boolean) {
		const name = String(type);
		const label = BattleLog.escapeHTML(name.length > 6 ? name.slice(0, 6) : name);
		const size = name.length > 5 ? 7 : 8;
		return `<span class="typebadge${b ? ' b' : ''}" title="${BattleLog.escapeHTML(name)} (type added by the ROM hack)" ` +
			`style="display:inline-block;box-sizing:border-box;width:32px;height:14px;border:1px solid #4a4f57;` +
			`border-radius:3px;background:#737b87;color:#fff;font:bold ${size}px/12px Verdana,Arial,sans-serif;` +
			`text-align:center;text-transform:uppercase;text-shadow:none;letter-spacing:0;vertical-align:middle;` +
			`overflow:hidden;white-space:nowrap">${label}</span>`;
	}
	getTypeIcon(type: string | null, b?: boolean, imageOnly?: boolean) { // b is just for utilichart.js
		type = this.types.get(type).name;
		if (!type) type = '???';
		if (!imageOnly && !this.hasTypeIcon(type)) return this.getTypeBadge(type, b);
		let sanitizedType = type.replace(/\?/g, '%3f');
		const alt = BattleLog.escapeHTML(TL.type[type] || type);
		// Shadow is a fork-only type; its icon is not in upstream's sprite set, so it is served
		// from the fork's own host. The alt text is translated and escaped on both paths.
		if (type === 'Shadow') {
			return `<img src="https://play.hackmons.com/sprites/types/${sanitizedType}.png" ` +
				`alt="${alt}" height="14" width="32" class="pixelated${b ? ' b' : ''}" />`;
		}
		return `<img src="${Dex.resourcePrefix}sprites/types/${sanitizedType}.png" alt="${alt}" height="14" width="32" class="pixelated${b ? ' b' : ''}" />`;
	}

	getCategoryIcon(category: string | null) {
		const categoryID = toID(category);
		let sanitizedCategory = '';
		switch (categoryID) {
		case 'physical':
		case 'special':
		case 'status':
			sanitizedCategory = categoryID.charAt(0).toUpperCase() + categoryID.slice(1);
			break;
		default:
			sanitizedCategory = 'undefined';
			break;
		}
		const alt = BattleLog.escapeHTML(TL.tag[categoryID] || sanitizedCategory);
		return `<img src="${Dex.resourcePrefix}sprites/categories/${sanitizedCategory}.png" alt="${alt}" height="14" width="32" class="pixelated" />`;
	}

	getPokeballs() {
		if (this.pokeballs) return this.pokeballs;
		this.pokeballs = [];
		window.BattleItems ||= {};
		for (const data of Object.values(BattleItems)) {
			if (!data.isPokeball) continue;
			this.pokeballs.push(data.name);
		}
		return this.pokeballs;
	}
};

export 
const PHNN_GEN1_PAL_IDS = ['MEW', 'GREEN', 'GREEN', 'GREEN', 'RED', 'RED', 'RED', 'CYAN', 'CYAN', 'CYAN', 'GREEN', 'GREEN', 'CYAN', 'YELLOW', 'YELLOW', 'YELLOW', 'BROWN', 'BROWN', 'BROWN', 'GRAY', 'GRAY', 'BROWN', 'BROWN', 'PURPLE', 'PURPLE', 'YELLOW', 'YELLOW', 'BROWN', 'BROWN', 'BLUE', 'BLUE', 'BLUE', 'PURPLE', 'PURPLE', 'PURPLE', 'PINK', 'PINK', 'RED', 'YELLOW', 'PINK', 'PINK', 'BLUE', 'BLUE', 'GREEN', 'RED', 'RED', 'RED', 'RED', 'PURPLE', 'PURPLE', 'BROWN', 'BROWN', 'YELLOW', 'YELLOW', 'YELLOW', 'CYAN', 'BROWN', 'BROWN', 'BROWN', 'RED', 'BLUE', 'BLUE', 'BLUE', 'YELLOW', 'YELLOW', 'YELLOW', 'GRAY', 'GRAY', 'GRAY', 'GREEN', 'GREEN', 'GREEN', 'CYAN', 'CYAN', 'GRAY', 'GRAY', 'GRAY', 'RED', 'RED', 'PINK', 'PINK', 'GRAY', 'GRAY', 'BROWN', 'BROWN', 'BROWN', 'BLUE', 'BLUE', 'PURPLE', 'PURPLE', 'GRAY', 'GRAY', 'PURPLE', 'PURPLE', 'PURPLE', 'GRAY', 'YELLOW', 'YELLOW', 'RED', 'RED', 'YELLOW', 'YELLOW', 'PINK', 'GREEN', 'GRAY', 'GRAY', 'BROWN', 'BROWN', 'PINK', 'PURPLE', 'PURPLE', 'GRAY', 'GRAY', 'PINK', 'BLUE', 'BROWN', 'CYAN', 'CYAN', 'RED', 'RED', 'RED', 'GRAY', 'PINK', 'GREEN', 'MEW', 'YELLOW', 'RED', 'BROWN', 'GRAY', 'RED', 'BLUE', 'CYAN', 'GRAY', 'GRAY', 'CYAN', 'YELLOW', 'RED', 'GRAY', 'BLUE', 'BLUE', 'BROWN', 'BROWN', 'GRAY', 'PINK', 'BLUE', 'YELLOW', 'RED', 'GRAY', 'BLUE', 'BROWN', 'MEW', 'MEW'];
const PHNN_GEN1_PALETTES: {[k: string]: string[]} = {
	MEW: ['#FFFFFF', '#FFFF00', '#FF0808', '#191919'],
	BLUE: ['#FFFFFF', '#8494FF', '#0008CE', '#191919'],
	RED: ['#FFFFFF', '#FF8C00', '#FF0000', '#191919'],
	CYAN: ['#FFFFFF', '#84D6FF', '#008CFF', '#191919'],
	PURPLE: ['#FFFFFF', '#CE7BFF', '#9C00B5', '#191919'],
	BROWN: ['#FFFFFF', '#EF9452', '#8C4A29', '#191919'],
	GREEN: ['#FFFFFF', '#8CFF5A', '#08B531', '#191919'],
	PINK: ['#FFFFFF', '#FF7B94', '#FF0031', '#191919'],
	YELLOW: ['#FFFFFF', '#FFFF00', '#E67300', '#191919'],
	GRAY: ['#FFFFFF', '#A5BD52', '#5A5A29', '#191919'],
};
const PHNN_SW_PAL_IDS = [15, 21, 21, 21, 17, 17, 17, 18, 18, 18, 21, 21, 18, 23, 23, 23, 20, 20, 20, 24, 24, 20, 20, 19, 19, 23, 23, 20, 20, 16, 16, 16, 19, 19, 19, 22, 22, 17, 23, 22, 22, 16, 16, 21, 17, 17, 17, 17, 19, 19, 20, 20, 23, 23, 23, 18, 20, 20, 20, 17, 16, 16, 16, 23, 23, 23, 24, 24, 24, 21, 21, 21, 18, 18, 24, 24, 24, 17, 17, 22, 22, 24, 24, 20, 20, 20, 16, 16, 19, 19, 24, 24, 19, 19, 19, 24, 23, 23, 17, 17, 23, 23, 22, 21, 24, 24, 20, 20, 22, 19, 19, 24, 24, 22, 16, 20, 18, 18, 17, 17, 17, 24, 22, 21, 15, 23, 17, 20, 24, 17, 16, 18, 24, 24, 18, 23, 17, 24, 16, 16, 20, 20, 24, 22, 16, 23, 17, 24, 16, 20, 15, 15, 21, 21, 21, 17, 17, 17, 18, 18, 18, 20, 20, 22, 22, 23, 17, 21, 21, 18, 16, 16, 23, 22, 22, 18, 20, 20, 17, 22, 18, 18, 16, 19, 17, 19, 19, 24, 24, 20, 23, 18, 20, 19, 23, 20, 23, 20, 20, 21, 22, 15, 21, 17, 17, 23, 24, 24, 24, 16, 17, 20, 20, 20, 21, 23, 22, 22, 15, 23, 17, 19, 21, 20, 17, 17, 23, 23, 20, 20, 19, 16, 22, 21, 20, 17, 17, 20, 20, 24, 22, 24, 16, 23, 17, 18, 20, 17, 23, 20, 20, 21, 15, 15, 15, 15];
const PHNN_SW_PALETTES: {[k: number]: string[]} = {
	15: ['#E6E6E6', '#F7B58C', '#84739C', '#212121'],
	16: ['#E6E6E6', '#94A5DE', '#5A7BBD', '#212121'],
	17: ['#E6E6E6', '#FFA552', '#D65231', '#212121'],
	18: ['#E6E6E6', '#ADCEEF', '#739CCE', '#212121'],
	19: ['#E6E6E6', '#DEB5C5', '#AD7BBD', '#212121'],
	20: ['#E6E6E6', '#E6A57B', '#AD734A', '#212121'],
	21: ['#E6E6E6', '#A5D684', '#4AA55A', '#212121'],
	22: ['#E6E6E6', '#F7B5C5', '#E67BAD', '#212121'],
	23: ['#E6E6E6', '#FFE673', '#D6A500', '#212121'],
	24: ['#E6E6E6', '#D6ADB5', '#7B7B94', '#212121'],
	25: ['#E6E6E6', '#BD9C6B', '#73638C', '#212121'],
	26: ['#E6E6E6', '#8494AD', '#526394', '#212121'],
	27: ['#E6E6E6', '#B57B84', '#8C1029', '#212121'],
	28: ['#E6E6E6', '#7BA5A5', '#298484', '#212121'],
	29: ['#E6E6E6', '#BD7B9C', '#732163', '#212121'],
	30: ['#E6E6E6', '#A58C94', '#946B5A', '#212121'],
	31: ['#E6E6E6', '#BDAD84', '#636352', '#212121'],
	32: ['#E6E6E6', '#ADCEEF', '#F7B5C5', '#212121'],
	33: ['#E6E6E6', '#D6BD84', '#EF734A', '#212121'],
	34: ['#E6E6E6', '#949494', '#525252', '#212121'],
};
const PHNN_SW_DEXNUMS: {[k: string]: number} = { chikorita: 152, bayleef: 153, meganium: 154, flambear: 155, volbear: 156, dynabear: 157, cruz: 158, aqua: 159, aquaria: 160, hoothoot: 161, noctowl: 162, mareep: 163, flaaffy: 164, ampharos: 165, trifox: 166, tangel: 167, gelania: 168, mantine: 169, qwilfish: 170, numpuff: 171, pichu: 172, cleffa: 173, igglybuff: 174, quagsire: 175, natu: 176, xatu: 177, golppy: 178, marill: 179, sunmola1: 180, anchorage: 181, grotess: 182, crobat: 183, para: 184, spinarak: 185, ariados: 186, skarmory: 187, animon: 188, chiks: 189, sunflora: 190, phanpy: 191, donphan: 192, twinz: 193, girafarig: 194, smeargle: 195, meowsy: 196, rinring: 197, bellboyant: 198, politoed: 199, slowking: 200, unown: 201, ledyba: 202, ledian: 203, minicorn: 204, espeon: 205, umbreon: 206, turbann: 207, grimey: 208, remoraid: 209, octillery: 210, tyrogue: 211, hitmontop: 212, puddi: 213, hoppip: 214, skiploom: 215, jumpluff: 216, ballerine: 217, smoochum: 218, elekid: 219, magby: 220, bellossom: 221, belmitt: 222, miltank: 223, bomseel: 224, delibird: 225, tigrette: 226, electiger: 227, madame: 228, kurstraw: 229, pangshi: 230, murkrow: 231, blissey: 232, scizor: 233, plux: 234, houndour: 235, houndoom: 236, wolfman: 237, warwolf: 238, porygon2: 239, likk: 240, steelix: 241, kingdra: 242, raikou: 243, entei: 244, suicune: 245, sneasel: 246, hooh: 247, togepi: 248, snubbull: 249, aipom: 250, leafeo: 251 };
const phnnDisguiseRecolorCache: {[k: string]: string} = {};

class ModdedDex {
	readonly gen: number;
	readonly modid: ID;
	readonly cache = {
		Moves: {} as { [k: string]: Move },
		Items: {} as { [k: string]: Item },
		Abilities: {} as { [k: string]: Ability },
		Species: {} as { [k: string]: Species },
		Types: {} as { [k: string]: Type },
	};
	pokeballs: string[] | null = null;
	constructor(modid: ID) {
		this.modid = modid;
		let gen = parseInt(modid.charAt(3), 10);
		if (this.modid === 'champions') gen = 9;
		if ((modid !== 'champions' && !modid.startsWith('gen')) || !gen) throw new Error("Unsupported modid");
		this.gen = gen;
	}
	text: ClientDexText = {
		getLanguage: () => Dex.text.getLanguage(),
		getBrowserLanguage: () => Dex.text.getBrowserLanguage(),
		languages: () => Dex.text.languages(),
		findLanguage: lang => Dex.text.findLanguage(lang),
		get: (effect: TranslatableEffect, lang = Dex.text.getLanguage()) => {
			return getTextEntry(effect, this.modid, this.gen, lang);
		},
	};
	moves = {
		get: (name: string): Move => {
			const ppMatch = /(.*)\s+\((\d+|inf)(?:\/(\d+))?\)$/i.exec(name);
			if (ppMatch) name = ppMatch[1];
			let id = toID(name);
			if (window.BattleAliases && id in BattleAliases) {
				name = BattleAliases[id];
				id = toID(name);
			}
			if (this.cache.Moves.hasOwnProperty(id)) return this.cache.Moves[id];

			let data = { ...Dex.moves.get(name) };

			for (let i = Dex.gen - 1; i >= this.gen; i--) {
				const table = window.BattleTeambuilderTable[`gen${i}`];
				if (id in table.overrideMoveData) {
					Object.assign(data, table.overrideMoveData[id]);
				}
			}
			const hackMechanics = this.modid !== `gen${this.gen}` ?
				window.BattleTeambuilderTable[this.modid].romHackMechanics : null;
			if (hackMechanics && this.gen <= 3 && data.category !== 'Status' && data.type !== 'Shadow') {
				data.category = Dex.getGen3Category(data.type);
			}
			if (this.modid !== `gen${this.gen}`) {
				const table = window.BattleTeambuilderTable[this.modid];
				if (id in table.overrideMoveData) {
					Object.assign(data, table.overrideMoveData[id]);
				}
				if (this.modid === 'gen2spaceworld' && id !== 'hiddenpower' && id.startsWith('hiddenpower') &&
					table.overrideMoveData.hiddenpower) {
					const hpOverride = { ...table.overrideMoveData.hiddenpower };
					delete hpOverride.basePower;
					Object.assign(data, hpOverride);
				}
			}
			if (hackMechanics) {
				RomHacks.rewriteMove(this.gen, hackMechanics, id, data);
			} else if (this.gen <= 3 && data.category !== 'Status' && data.type !== 'Shadow') {
				data.category = Dex.getGen3Category(data.type);
			}

			const move = new Move(id, name, data);
			this.cache.Moves[id] = move;
			return move;
		},
	};

	items = {
		get: (name: string): Item => {
			let id = toID(name);
			if (window.BattleAliases && id in BattleAliases) {
				name = BattleAliases[id];
				id = toID(name);
			}
			if (this.cache.Items.hasOwnProperty(id)) return this.cache.Items[id];
			const enigma = Enigma.get(id, this);
			if (enigma) return enigma;

			let data = { ...Dex.items.get(name) };
			if (data.enigmaPreset) data = { exists: false } as any;

			for (let i = Dex.gen - 1; i >= this.gen; i--) {
				const table = window.BattleTeambuilderTable[`gen${i}`];
				if (id in table.overrideItemData) {
					Object.assign(data, table.overrideItemData[id]);
				}
			}
			if (this.modid !== `gen${this.gen}`) {
				const table = window.BattleTeambuilderTable[this.modid];
				if (id in table.overrideItemData) {
					Object.assign(data, table.overrideItemData[id]);
				}
			}

			const item = new Item(id, name, data);
			this.cache.Items[id] = item;
			return item;
		},
	};

	abilities = {
		get: (name: string): Ability => {
			let id = toID(name);
			if (window.BattleAliases && id in BattleAliases) {
				name = BattleAliases[id];
				id = toID(name);
			}
			if (this.cache.Abilities.hasOwnProperty(id)) return this.cache.Abilities[id];

			let data = { ...Dex.abilities.get(name) };

			for (let i = Dex.gen - 1; i >= this.gen; i--) {
				const table = window.BattleTeambuilderTable[`gen${i}`];
				if (id in table.overrideAbilityData) {
					Object.assign(data, table.overrideAbilityData[id]);
				}
			}
			if (this.modid !== `gen${this.gen}`) {
				const table = window.BattleTeambuilderTable[this.modid];
				if (id in table.overrideAbilityData) {
					Object.assign(data, table.overrideAbilityData[id]);
				}
			}

			const ability = new Ability(id, name, data);
			this.cache.Abilities[id] = ability;
			return ability;
		},
	};

	species = {
		get: (name: string): Species => {
			let id = toID(name);
			const originalId = id;
			if (window.BattleAliases && id in BattleAliases) {
				name = BattleAliases[id];
				id = toID(name);
			}
			const baseSpecies = Dex.species.get(originalId || name);
			id = baseSpecies.id;
			if (typeof id !== 'string') return Dex.species.get('');
			if (this.cache.Species.hasOwnProperty(id)) return this.cache.Species[id];

			let data = { ...baseSpecies };

			for (let i = Dex.gen - 1; i >= this.gen; i--) {
				const table = window.BattleTeambuilderTable[`gen${i}`];
				if (id in table.overrideSpeciesData) {
					Object.assign(data, table.overrideSpeciesData[id]);
				}
			}
			if (this.modid !== `gen${this.gen}`) {
				const table = window.BattleTeambuilderTable[this.modid];
				if (id in table.overrideSpeciesData) {
					Object.assign(data, table.overrideSpeciesData[id]);
				}
			}
			if (this.gen < 3 || this.modid === 'gen7letsgo') {
				data.abilities = { 0: "No Ability" };
			}

			const table = window.BattleTeambuilderTable[this.modid];
			if (id in table.overrideTier) data.tier = table.overrideTier[id];
			if (!data.tier && id.endsWith('totem')) {
				data.tier = this.species.get(id.slice(0, -5)).tier;
			}
			if (!data.tier && data.baseSpecies && toID(data.baseSpecies) !== id) {
				data.tier = this.species.get(data.baseSpecies).tier;
			}
			if (data.gen > this.gen) data.tier = 'Illegal';
			data.nfe = data.id === 'dipplin' || !!data.evos?.some(evo => {
				const evoSpecies = this.species.get(evo);
				return !evoSpecies.isNonstandard || evoSpecies.isNonstandard === data.isNonstandard ||
					// Pokemon with Hisui evolutions
					evoSpecies.isNonstandard === "Unobtainable";
			});

			const species = new Species(id, name, data);
			this.cache.Species[id] = species;
			return species;
		},
	};

	types = {
		namesCache: null as readonly Dex.TypeName[] | null,
		names: (): readonly Dex.TypeName[] => {
			if (this.types.namesCache) return this.types.namesCache;
			const names = Dex.types.names();
			if (!names.length) return [];
			const curNames = [...names];
			// if (this.gen < 9) curNames.splice(curNames.indexOf('Stellar'), 1);
			const modTypes: { [id: string]: { exists?: boolean, name?: string } } =
				(this.modid !== `gen${this.gen}` && window.BattleTeambuilderTable[this.modid]?.overrideTypeChart) || {};
			if (this.gen < 6 && !modTypes['fairy']?.exists) curNames.splice(curNames.indexOf('Fairy'), 1);
			if (this.gen < 2 && !modTypes['dark']?.exists) curNames.splice(curNames.indexOf('Dark'), 1);
			if (this.gen < 2 && !modTypes['steel']?.exists) curNames.splice(curNames.indexOf('Steel'), 1);
			for (const id in modTypes) {
				const added = modTypes[id].exists && modTypes[id].name as Dex.TypeName | undefined;
				if (added && !curNames.includes(added)) curNames.push(added);
			}
			this.types.namesCache = curNames;
			return curNames;
		},
		get: (name: string): Dex.Type => {
			const id = toID(name);
			name = id.substr(0, 1).toUpperCase() + id.substr(1);

			if (this.cache.Types.hasOwnProperty(id)) return this.cache.Types[id];

			let data = { ...Dex.types.get(name) };

			for (let i = 7; i >= this.gen; i--) {
				const table = window.BattleTeambuilderTable[`gen${i}`];
				if (id in table.removeType) {
					data.exists = false;
					// don't bother correcting its attributes given it doesn't exist
					break;
				}
				if (id in table.overrideTypeChart) {
					data = { ...data, ...table.overrideTypeChart[id] };
				}
			}
			if (this.modid !== `gen${this.gen}`) {
				const modTypeChart = window.BattleTeambuilderTable[this.modid]?.overrideTypeChart;
				if (modTypeChart && id in modTypeChart && (data.exists !== false || modTypeChart[id].exists)) {
					data = { ...data, ...modTypeChart[id] };
				}
			}

			this.cache.Types[id] = data;
			return data;
		},
	};

	getPokeballs() {
		if (this.pokeballs) return this.pokeballs;
		this.pokeballs = [];
		window.BattleItems ||= {};
		for (const data of Object.values(BattleItems)) {
			if (data.gen && data.gen > this.gen) continue;
			if (!data.isPokeball) continue;
			this.pokeballs.push(data.name);
		}
		return this.pokeballs;
	}
}

export const RomHacks = new class {
	active: any = null;
	modid = '' as ID;
	legal: { [type: string]: { [id: string]: 1 } } | null = null;
	listeners: (() => void)[] = [];
	loaded = false;
	indexed: { [id: string]: 1 } = {};

	battleSprites = false;
	builderSprites = false;
	hasSprite(type: 'pokemon' | 'icons' | 'items', id: string) {
		const hack = this.active;
		if (!hack?.sprites?.[type] || !hack.indices) return false;
		return id in (type === 'items' ? hack.indices.items : hack.indices.species);
	}
	overworldMissing: { [key: string]: 1 } = {};
	overworldProbed: { [key: string]: 1 } = {};
	overworldListed: { sha256: string, ids: { [id: string]: 1 } } | null = null;
	hasOverworld(id: string) {
		const hack = this.active;
		if (!hack?.sprites?.overworld || !hack.indices || !(id in hack.indices.species)) return false;
		if (Array.isArray(hack.sprites.overworldIds)) {
			if (this.overworldListed?.sha256 !== hack.sha256) {
				const ids: { [id: string]: 1 } = {};
				for (const listed of hack.sprites.overworldIds) ids[listed] = 1;
				this.overworldListed = { sha256: hack.sha256, ids };
			}
			return id in this.overworldListed!.ids;
		}
		const key = `${hack.sha256}:${id}`;
		if (this.overworldMissing[key]) return false;
		if (!this.overworldProbed[key] && typeof Image !== 'undefined') {
			this.overworldProbed[key] = 1;
			const url = this.spriteUrl('overworld', id);
			const probe = new Image();
			probe.onerror = () => {
				this.overworldMissing[key] = 1;
				if (this.active?.sha256 === hack.sha256) this.dropOverworld(url, Dex.getPokemonIcon(id, false, this.modid));
			};
			probe.src = url;
		}
		return true;
	}
	dropOverworld(url: string, fallback: string) {
		if (typeof document === 'undefined') return;
		const nodes = document.querySelectorAll<HTMLElement>('[style*="/sprites/overworld/"]');
		for (let i = 0; i < nodes.length; i++) {
			const style = nodes[i].style;
			const image = style.backgroundImage || '';
			if (!image.includes(url) || image.includes(',')) continue;
			for (const declaration of fallback.split(';')) {
				const colon = declaration.indexOf(':');
				if (colon > 0) style.setProperty(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
			}
		}
	}
	spriteMissing: { [key: string]: 1 } = {};
	spriteProbed: { [key: string]: 1 } = {};
	sprite(kind: string, id: string): string {
		const hack = this.active;
		if (!hack?.sprites?.pokemon || !hack.indices || !(id in hack.indices.species)) return '';
		const ids = [id];
		const base = toID(Dex.species.get(id).baseSpecies);
		if (base && base !== id && base in hack.indices.species) ids.push(base);
		const kinds = kind.endsWith('-shiny') ? [kind, kind.slice(0, -6)] : [kind];
		for (const tryKind of kinds) {
			for (const tryId of ids) {
				const key = `${hack.sha256}:${tryKind}:${tryId}`;
				if (this.spriteMissing[key]) continue;
				const url = this.spriteUrl(tryKind, tryId);
				if (!this.spriteProbed[key]) this.probeSprite(key, url, tryKind, tryId);
				return url;
			}
		}
		return '';
	}
	probeSprite(key: string, url: string, kind: string, id: string) {
		if (typeof Image === 'undefined') return;
		this.spriteProbed[key] = 1;
		const sha256 = this.active.sha256;
		const probe = new Image();
		probe.onerror = () => {
			this.spriteMissing[key] = 1;
			if (this.active?.sha256 === sha256) this.dropSprite(url, kind, id);
		};
		probe.src = url;
	}
	dropSprite(url: string, kind: string, id: string) {
		if (typeof document === 'undefined') return;
		const next = this.sprite(kind, id);
		const isFront = kind.startsWith('front');
		const shiny = kind.endsWith('-shiny');
		const images = document.querySelectorAll<HTMLImageElement>(`img[src$="/sprites/${kind}/${id}.png"]`);
		for (let i = 0; i < images.length; i++) {
			if (images[i].getAttribute('src') !== url) continue;
			images[i].src = next || Dex.getSpriteData(id, isFront, { gen: this.parentGen(this.active), shiny }).url;
		}
		const nodes = document.querySelectorAll<HTMLElement>(`[style*="/sprites/${kind}/${id}.png"]`);
		for (let i = 0; i < nodes.length; i++) {
			const style = nodes[i].style;
			const image = style.backgroundImage || '';
			if (!image.includes(url)) continue;
			if (next) {
				style.backgroundImage = image.split(url).join(next);
				continue;
			}
			const fallback = style.backgroundSize === 'contain' ? Dex.getPokemonIcon(id, false, this.modid) :
				Dex.getTeambuilderSprite({ species: id, shiny }, Dex.mod(this.modid));
			style.removeProperty('background-size');
			style.removeProperty('image-rendering');
			for (const declaration of fallback.split(';')) {
				const colon = declaration.indexOf(':');
				if (colon > 0) style.setProperty(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
			}
		}
	}
	useInBattle(sha256: string, battle: any): boolean {
		if (!/^[0-9a-f]{64}$/.test(sha256)) return false;
		const apply = () => {
			battle.dex = Dex.mod(this.modid);
			battle.romHack = this.active;
			this.battleSprites = true;
		};
		const replay = () => {
			if (!battle.p1 || this.active?.sha256 !== sha256) return;
			apply();
			if (battle.resetToCurrentTurn) battle.resetToCurrentTurn();
		};
		if (this.active?.sha256 === sha256) {
			apply();
			if (!this.checked[sha256]) {
				void this.revalidate(sha256).then(changed => {
					if (changed) replay();
				});
			}
			return true;
		}
		this.activate(sha256).then(replay, () => {});
		return false;
	}
	checked: { [sha256: string]: Promise<boolean> | undefined } = {};
	revalidate(sha256: string): Promise<boolean> {
		const pending = this.checked[sha256];
		if (pending) return pending;
		const run = async () => {
			if (!this.trusted(sha256)) return false;
			const response = await fetch(`${this.serverUrl()}/romhacks/${sha256}.json`, { cache: 'no-store' });
			const fresh = await response.json();
			if (!response.ok || fresh.error || fresh.sha256 !== sha256 || !fresh.indices) return false;
			let cached: any = null;
			try {
				cached = JSON.parse(this.storageGet(`romhacks:data:${sha256}`) || 'null');
			} catch {}
			if (cached && cached.version === fresh.version) return false;
			const known = this.list().find(entry => entry.sha256 === sha256);
			fresh.name = cached?.name || known?.name || fresh.name;
			if (this.active?.sha256 === sha256) {
				this.install(fresh, true);
			} else {
				this.cacheHack(fresh);
			}
			return true;
		};
		const result = run().catch(() => false);
		this.checked[sha256] = result;
		return result;
	}
	isPart(value: any): value is [number, number] {
		return Array.isArray(value) && value.length === 2 && Number.isInteger(value[0]) && Number.isInteger(value[1]) &&
			value[0] >= 1 && value[0] <= value[1] && value[1] <= 0xFFFFFFFF;
	}
	isIdList(value: any): value is string[] {
		return Array.isArray(value) && value.every(entry => typeof entry === 'string');
	}
	rewriteMove(gen: number, mechanics: any, id: string, data: any) {
		const m = mechanics && typeof mechanics === 'object' ? mechanics : {};
		if (this.isPart(m.healMoveFraction)) {
			const stockHalf = Array.isArray(data.heal) && data.heal[0] === 1 && data.heal[1] === 2;
			if (stockHalf && (gen > 1 || id === 'recover' || id === 'softboiled')) {
				data.heal = [m.healMoveFraction[0], m.healMoveFraction[1]];
			}
		}
		const fractions = m.recoilFractions;
		if (fractions && typeof fractions === 'object' && Array.isArray(data.recoil) && (id !== 'struggle' || gen === 2)) {
			const r = data.recoil;
			const name = r[0] * 4 === r[1] ? 'quarter' : (r[0] === 33 && r[1] === 100) || r[0] * 3 === r[1] ? 'third' :
				r[0] * 2 === r[1] ? 'half' : '';
			if (name && this.isPart(fractions[name])) data.recoil = [fractions[name][0], fractions[name][1]];
		}
		if (gen === 1 && id === 'struggle' && this.isPart(m.struggleRecoil) && Array.isArray(data.recoil)) {
			data.recoil = [m.struggleRecoil[0], m.struggleRecoil[1]];
		}
		const fixed = id === 'sonicboom' ? m.sonicBoomDamage : id === 'dragonrage' ? m.dragonRageDamage : undefined;
		if (Number.isInteger(fixed) && fixed >= 1 && fixed <= 65535 && typeof data.damage === 'number') data.damage = fixed;
		if (gen <= 2 && this.isIdList(m.highCritMoves) && data.category !== 'Status') {
			if (m.highCritMoves.includes(id)) {
				data.critRatio = gen === 1 ? 2 : 3;
			} else if ((data.critRatio || 1) > 1) {
				data.critRatio = 1;
			}
		}
		const category = m.category;
		if (gen <= 3 && category && typeof category === 'object' && data.category && data.category !== 'Status') {
			const special = category.basis === 'type' && this.isIdList(category.specialTypes) ? category.specialTypes :
				category.basis === 'move' && this.isIdList(category.specialMoves) ? category.specialMoves : null;
			if (special) data.category = special.includes(category.basis === 'type' ? data.type : id) ? 'Special' : 'Physical';
		}
		return data;
	}
	escape(text: any) {
		return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
	parentGen(hack: any) {
		return parseInt(String(hack?.parentMod).slice(3), 10) || 9;
	}
	mechanicsSummary(hack: any): { notes: string[], unreadable: number, none: boolean } | null {
		if (!hack || !Array.isArray(hack.mechanicsNotes)) return null;
		const notes: string[] = [];
		for (const note of hack.mechanicsNotes) {
			if (typeof note === 'string' && note.trim()) notes.push(note.trim());
		}
		let unreadable = 0;
		const listed = hack.mechanicsReport?.unreadable;
		if (Array.isArray(listed)) {
			for (const id of listed) {
				if (typeof id === 'string' && !id.startsWith('info.')) unreadable++;
			}
		} else {
			for (const note of notes) {
				if (note.includes(' was changed by the hack but could not be read')) unreadable++;
			}
		}
		const none = !unreadable && (!notes.length ||
			(notes.length === 1 && notes[0].startsWith('No battle-engine changes were found')));
		return { notes, unreadable, none };
	}
	mechanicsHTML(hack: any, inBattle?: boolean) {
		const summary = this.mechanicsSummary(hack);
		if (!summary) return '';
		const gen = this.parentGen(hack);
		const name = this.escape(hack.name || 'This ROM hack');
		if (summary.none) {
			if (inBattle) {
				return `<div class="infobox"><small><strong>ROM hack rules:</strong> no engine changes were detected in ${name}; ` +
					`Generation ${gen} rules apply.</small></div>`;
			}
			return `<strong>Mechanics changed by this hack:</strong> none - no engine changes were detected, ` +
				`so Generation ${gen} rules apply.`;
		}
		const count = summary.notes.length;
		let items = '';
		const itemStyle = 'display:list-item;list-style:disc outside;margin:0 0 2px;padding:0';
		for (const note of summary.notes) items += `<li style="${itemStyle}">${this.escape(note)}</li>`;
		const list = `<ul style="margin:4px 0;padding-left:20px">${items}</ul>`;
		let unread = '';
		if (summary.unreadable) {
			unread = `${summary.unreadable} change${summary.unreadable === 1 ? '' : 's'} could not be read; ` +
				`the Generation ${gen} rule is used for ${summary.unreadable === 1 ? 'it' : 'those'}.`;
		}
		if (inBattle) {
			return `<div class="infobox"><details class="details"><summary><small><strong>ROM hack rules:</strong> ${name} has ` +
				`${count} battle mechanics note${count === 1 ? '' : 's'}` +
				`${summary.unreadable ? ` (${summary.unreadable} could not be read)` : ''}` +
				` - click to show</small></summary><small>${list}${unread}</small></details></div>`;
		}
		const heading = `<strong>Mechanics changed by this hack</strong> (${count})`;
		const tail = unread ? `<em>${unread}</em>` : '';
		if (count > 4) {
			return `<details class="details"><summary>${heading} - click to show</summary>${list}${tail}</details>`;
		}
		return `${heading}:${list}${tail}`;
	}
	turnCount(value: any, fallback: number) {
		return typeof value === 'number' && Math.floor(value) === value && value >= 0 && value < 1000 ? value : fallback;
	}
	weatherTurns(hack: any, weather: string, fromAbility: boolean): [number, number] | null {
		const mechanics = hack?.mechanics;
		const keys: any = { raindance: 'rain', sunnyday: 'sun', sandstorm: 'sand', hail: 'hail', snowscape: 'hail', snow: 'hail' };
		const key = keys[weather];
		if (!mechanics || typeof mechanics !== 'object' || !key) return null;
		const gen = this.parentGen(hack);
		let base = this.turnCount(mechanics.weatherTurns?.[key], 5);
		const rock = gen >= 4 ? this.turnCount(mechanics.weatherRockTurns?.[key], 8) : 0;
		if (fromAbility) {
			const ability = this.turnCount(mechanics.abilityWeatherTurns, gen <= 5 ? 0 : -1);
			if (ability === 0) return [0, 0];
			if (ability > 0) base = ability;
		}
		if (!rock || rock === base) return [0, base];
		return [Math.min(base, rock), Math.max(base, rock)];
	}
	screenTurns(hack: any, screen: string): [number, number] | null {
		const mechanics = hack?.mechanics;
		if (!mechanics || typeof mechanics !== 'object') return null;
		const base = this.turnCount(mechanics.screenTurns?.[screen], 5);
		if (screen !== 'reflect' && screen !== 'lightscreen') return [base, 0];
		const clay = this.parentGen(hack) >= 4 ? this.turnCount(mechanics.screenClayTurns, 8) : 0;
		if (!clay || clay === base) return [base, 0];
		return [Math.min(base, clay), Math.max(base, clay)];
	}
	teamHack(teamKey: string): string {
		try {
			return JSON.parse(this.storageGet('romhacks:teams') || '{}')[teamKey] || '';
		} catch {
			return '';
		}
	}
	setTeamHack(teamKey: string, sha256: string) {
		let map: { [k: string]: string } = {};
		try {
			map = JSON.parse(this.storageGet('romhacks:teams') || '{}');
		} catch {}
		map[teamKey] = sha256;
		this.storageSet('romhacks:teams', JSON.stringify(map));
	}
	switching = false;
	syncTeam(teamKey: string, done: () => void) {
		if (!teamKey) return;
		const bound = this.teamHack(teamKey);
		if (!bound) {
			if (this.active) this.setTeamHack(teamKey, this.active.sha256);
			return;
		}
		if (this.active?.sha256 === bound || this.switching) return;
		this.switching = true;
		this.activate(bound).then(() => {
			this.switching = false;
			done();
		}, () => {
			this.switching = false;
		});
	}
	label(sha256: string) {
		const known = this.list().find(entry => entry.sha256 === sha256);
		return `${known?.name ? `${known.name} ` : ''}[${sha256.slice(0, 8)}]`;
	}
	optionLabel(entry: { sha256: string, name: string, baseGame: string }) {
		const text = `${entry.name} (${entry.baseGame})`;
		const twin = this.list().some(other => other.sha256 !== entry.sha256 && `${other.name} (${other.baseGame})` === text);
		return twin ? `${text} [${entry.sha256.slice(0, 8)}]` : text;
	}
	formatHack(format: string) {
		return /@@@.*\brom ?hack ?= ?([0-9a-f]{64})/i.exec(format)?.[1].toLowerCase() || '';
	}
	async prepareTeam(teamKey: string, format: string): Promise<string> {
		if (!teamKey || !this.isFormat(format)) return '';
		this.load();
		const bound = this.teamHack(teamKey);
		const wanted = this.formatHack(format);
		if (wanted && bound && bound !== wanted) {
			if (!this.list().some(entry => entry.sha256 === wanted && entry.proof)) return '';
			return `This team was built for a different ROM hack (${this.label(bound)}) than this battle uses ` +
				`(${this.label(wanted)}). Pick a team built for the battle's hack.`;
		}
		const needed = wanted || bound;
		if (!needed || this.active?.sha256 === needed) return '';
		try {
			await this.activate(needed);
		} catch (err: any) {
			if (wanted) return '';
			return `The ROM hack this team was built for (${this.label(bound)}) could not be loaded: ${err?.message || err}`;
		}
		return '';
	}
	spriteUrl(kind: string, id: string) {
		return `${this.serverUrl()}/romhacks/${this.active.sha256}/sprites/${kind}/${id}.png`;
	}
	isFormat(format: string | null | undefined) {
		return /^gen\d+romhacks/.test(format || '');
	}
	modes: { id: 'regular' | 'hackmons' | 'disguises', name: string, desc: string }[] = [
		{ id: 'regular', name: 'Regular', desc: 'Only the moves and abilities each Pok\u00e9mon has in the hack.' },
		{ id: 'hackmons', name: 'Hackmons', desc: 'Any move, ability and item of the hack on any of its Pok\u00e9mon.' },
		{ id: 'disguises', name: 'Disguises', desc: 'Custom Disguises with the hack as the game.' },
	];
	regularUnavailable = 'Regular is not available for this hack: its movesets could not be read. Use Hackmons or Disguises.';
	mode(format: string | null | undefined): '' | 'regular' | 'hackmons' | 'disguises' {
		const id = String(format || '').split('@@@')[0];
		if (!this.isFormat(id)) return '';
		if (/^gen\d+romhacksregular/.test(id)) return 'regular';
		if (/^gen\d+romhackshackmons/.test(id)) return 'hackmons';
		return 'disguises';
	}
	modeFormat(format: string, mode: string) {
		const rules = format.indexOf('@@@');
		return `gen9romhacks${mode}experimental${rules >= 0 ? format.slice(rules) : ''}`;
	}
	currentFormat(format: string) {
		return format.split('@@@')[0] === 'gen9romhacksexperimental' ? this.modeFormat(format, 'disguises') : format;
	}
	isDisguises(format: string | null | undefined) {
		return String(format || '').includes('customdisguise') || this.mode(format) === 'disguises';
	}
	isPlain(format: string | null | undefined) {
		const mode = this.mode(format);
		return mode === 'regular' || mode === 'hackmons';
	}
	regularProblem(format: string | null | undefined) {
		if (this.mode(format) !== 'regular' || !this.active) return '';
		if (this.active.learnsetStatus === 'read' && this.active.learnsets) return '';
		const note = typeof this.active.learnsetNote === 'string' ? this.active.learnsetNote : '';
		return `${this.regularUnavailable}${note ? ` ${note}` : ''}`;
	}
	regularReadable(hack: any) {
		return !hack || (hack.learnsetStatus === 'read' && !!hack.learnsets);
	}
	cappedEVs(format: string | null | undefined, gen: number) {
		const mode = this.mode(format);
		return gen >= 3 && (mode === 'regular' || (mode === 'hackmons' && gen === 6));
	}
	maxLevel(format: string | null | undefined, gen: number) {
		const mode = this.mode(format);
		return mode === 'disguises' ? 9999 : mode === 'hackmons' && gen === 1 ? 255 : 100;
	}
	maxMoves(format: string | null | undefined) {
		return this.mode(format) === 'disguises' ? 24 : 4;
	}
	disguiseExtraKeys = ['phType', 'disguise', 'startStatus', 'phAbilities', 'phItems', 'phStats', 'phBaseStats'];
	setExtras(set: any, maxLevel: number, remove?: boolean) {
		const moves: string[] = set.moves || [];
		const plain = moves.slice(0, 4).map(name => String(name).replace(/\s*\((?:\d+|inf)(?:\/\d+)?\)$/i, ''));
		const extra = this.disguiseExtraKeys.some(key => set[key]) || set.startHp !== undefined || moves.length > 4 ||
			plain.some((name, i) => name !== moves[i]) || (set.level || 100) > maxLevel;
		if (!extra || !remove) return extra;
		for (const key of this.disguiseExtraKeys) delete set[key];
		delete set.startHp;
		set.moves = plain;
		if (set.level > maxLevel) set.level = maxLevel;
		return true;
	}
	disguiseExtras(sets: any[] | null | undefined, format: string, gen: number, remove?: boolean) {
		if (!this.isPlain(format)) return 0;
		const maxLevel = this.maxLevel(format, gen);
		let count = 0;
		for (const set of sets || []) {
			if (set && this.setExtras(set, maxLevel, remove)) count++;
		}
		return count;
	}
	extrasWarning(mode: string, count: number) {
		const name = this.modes.find(entry => entry.id === mode)?.name || mode;
		return `${name} does not allow what ${count === 1 ? 'one Pok\u00e9mon' : `${count} Pok\u00e9mon`} on this team ` +
			`use from Disguises: more than 4 moves, several abilities or items, a disguise, custom typing, ` +
			`a starting status or HP, changed stats or PP, or a level above the limit. ` +
			`Remove these from the team and switch to ${name}?`;
	}
	legacyFormat(formats: { [id: string]: any }) {
		const shown = formats['gen9romhacksdisguisesexperimental'];
		if (!shown || formats['gen9romhacksexperimental']) return;
		formats['gen9romhacksexperimental'] = {
			...shown, id: 'gen9romhacksexperimental', name: '[Gen 9] ROM Hacks [EXPERIMENTAL]',
			searchShow: false, challengeShow: false, tournamentShow: false, rated: false,
			teambuilderFormat: 'gen9romhacksdisguisesexperimental', isTeambuilderFormat: false,
		};
	}
	ownAbilitiesOnly(format: string | null | undefined, gen: number) {
		const mode = this.mode(format);
		return mode === 'regular' ? gen >= 3 : mode === 'hackmons' && gen === 3;
	}
	learnsetCache: { sha256: string, species: { [id: string]: { [move: string]: 1 } | null } } | null = null;
	learnset(speciesId: string): { [move: string]: 1 } | null {
		const hack = this.active;
		if (hack?.learnsetStatus !== 'read') return null;
		if (this.learnsetCache?.sha256 !== hack.sha256) this.learnsetCache = { sha256: hack.sha256, species: {} };
		const cache = this.learnsetCache!.species;
		if (speciesId in cache) return cache[speciesId];
		const moves = hack.learnsets?.moves;
		let list = hack.learnsets?.species?.[speciesId];
		if (!Array.isArray(list)) {
			const dex = Dex.mod(this.modid);
			const baseId = toID(dex.species.get(speciesId).baseSpecies);
			const formes: readonly string[] = dex.species.get(baseId).cosmeticFormes || [];
			if (baseId !== speciesId && formes.some(forme => toID(forme) === speciesId)) list = hack.learnsets?.species?.[baseId];
		}
		let found: { [move: string]: 1 } | null = null;
		if (Array.isArray(moves) && Array.isArray(list)) {
			found = {};
			for (const position of list) {
				if (typeof moves[position] === 'string') found[moves[position]] = 1;
			}
			if (found['sketch']) {
				const blocked: string[] = Array.isArray(hack.learnsets.noSketch) ? hack.learnsets.noSketch : [];
				for (const id of hack.legal?.moves || []) {
					if (!blocked.includes(id)) found[id] = 1;
				}
			}
		}
		cache[speciesId] = found;
		return found;
	}
	abilitiesOf(speciesId: string): ID[] {
		if (!this.active) return [];
		const dex = Dex.mod(this.modid);
		const changed = !!this.active.Pokedex?.[speciesId]?.abilities;
		const abilities: { [slot: string]: string } = dex.species.get(speciesId).abilities || {};
		const ids: ID[] = [];
		for (const slot in abilities) {
			if (!changed && ((slot === 'H' && dex.gen < 5) || (slot === 'S' && dex.gen < 7))) continue;
			const id = toID(abilities[slot]);
			if (id && id !== 'noability' && !ids.includes(id)) ids.push(id);
		}
		return ids;
	}
	searchLists(type: string, format: string, speciesId: string): { legal: [string, ID][], illegal: [string, ID][] } {
		const rows = this.results(type);
		const mode = this.mode(format);
		const gen = this.parentGen(this.active);
		let allowed: { [id: string]: 1 } | null = null;
		if (mode === 'regular' && type === 'move') {
			allowed = this.learnset(speciesId) || {};
		} else if (mode === 'regular' && type === 'pokemon') {
			allowed = {};
			if (this.active?.learnsetStatus === 'read') {
				for (const id in this.active.learnsets?.species || {}) allowed[id] = 1;
			}
		} else if (type === 'ability' && this.ownAbilitiesOnly(format, gen)) {
			allowed = {};
			for (const id of this.abilitiesOf(speciesId)) allowed[id] = 1;
		} else if (type === 'ability' && gen < 3 && mode !== 'disguises') {
			allowed = {};
		} else if (type === 'item' && gen < 2 && mode !== 'disguises') {
			allowed = {};
		}
		if (!allowed) return { legal: rows, illegal: [] };
		const legal: [string, ID][] = [];
		const illegal: [string, ID][] = [];
		for (const row of rows) {
			if (row[0] === 'header' || row[1] in allowed) legal.push(row);
			else illegal.push(row);
		}
		return { legal, illegal };
	}
	storageGet(key: string): string | null {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	}
	storageSet(key: string, value: string) {
		try {
			localStorage.setItem(key, value);
			return;
		} catch {}
		this.pruneCache(0, 0);
		try {
			localStorage.setItem(key, value);
		} catch {}
	}
	cacheLimit = 4;
	cacheChars = 2000000;
	cachedHacks(): string[] {
		const found: string[] = [];
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i) || '';
				if (key.startsWith('romhacks:data:')) found.push(key.slice(14));
			}
		} catch {}
		let order: string[] = [];
		try {
			order = JSON.parse(this.storageGet('romhacks:cache') || '[]');
		} catch {}
		if (!Array.isArray(order)) order = [];
		const active = this.storageGet('romhacks:active') || '';
		const rank = (sha256: string) => {
			if (sha256 === active) return -1;
			const at = order.indexOf(sha256);
			return at < 0 ? order.length : at;
		};
		return found.sort((a, b) => rank(a) - rank(b));
	}
	pruneCache(limit = this.cacheLimit, chars = this.cacheChars, first = '') {
		const kept: string[] = first ? [first] : [];
		let used = 0;
		try {
			for (const sha256 of this.cachedHacks()) {
				if (sha256 === first) continue;
				const size = (localStorage.getItem(`romhacks:data:${sha256}`) || '').length;
				if (kept.length < limit && used + size <= chars) {
					kept.push(sha256);
					used += size;
				} else {
					localStorage.removeItem(`romhacks:data:${sha256}`);
				}
			}
			localStorage.setItem('romhacks:cache', JSON.stringify(kept));
		} catch {}
	}
	cacheHack(hack: any) {
		const key = `romhacks:data:${hack.sha256}`;
		let learnsets = hack.learnsets;
		if (learnsets?.own) {
			learnsets = { ...learnsets };
			delete learnsets.own;
		}
		const text = JSON.stringify(learnsets === hack.learnsets ? hack : { ...hack, learnsets });
		try {
			localStorage.removeItem(key);
		} catch {}
		if (text.length > this.cacheChars) {
			this.pruneCache();
			return;
		}
		this.pruneCache(this.cacheLimit, this.cacheChars - text.length, hack.sha256);
		try {
			localStorage.setItem(key, text);
			return;
		} catch {}
		this.pruneCache(1, 0, hack.sha256);
		try {
			localStorage.setItem(key, text);
		} catch {}
	}
	list(): { sha256: string, name: string, baseGame: string, proof?: string }[] {
		try {
			return JSON.parse(this.storageGet('romhacks:list') || '[]');
		} catch {
			return [];
		}
	}
	serverUrl() {
		const server = window.PS?.server || window.Config?.server || window.Config?.defaultserver || {};
		const host = server.host || location.hostname;
		const https = server.protocol === 'https' || server.https || Number(server.port) === 443 ||
			(server.protocol !== 'http' && location.protocol === 'https:');
		const port = https ? (server.port || 443) : (server.httpport || server.port || 80);
		return `${https ? 'https' : 'http'}://${host}:${port}`;
	}
	trusted(sha256: unknown) {
		return typeof sha256 === 'string' && /^[0-9a-f]{64}$/.test(sha256) && !window.Config?.testclient;
	}
	forget(sha256: string) {
		try {
			localStorage.removeItem(`romhacks:data:${sha256}`);
			if (localStorage.getItem('romhacks:active') === sha256) localStorage.removeItem('romhacks:active');
		} catch {}
	}
	subscribe(listener: () => void) {
		this.listeners.push(listener);
	}
	load() {
		if (this.loaded || !window.BattleTeambuilderTable) return;
		this.loaded = true;
		const sha256 = this.storageGet('romhacks:active');
		this.pruneCache();
		if (!sha256) return;
		if (!this.trusted(sha256)) {
			this.forget(sha256);
			return;
		}
		const cached = this.storageGet(`romhacks:data:${sha256}`);
		if (cached) {
			try {
				const hack = JSON.parse(cached);
				if (hack.indices && hack.sha256 === sha256) {
					this.install(hack);
					return;
				}
			} catch {}
			this.forget(sha256);
		}
		this.activate(sha256).catch(() => {});
	}
	async activate(sha256: string) {
		if (!this.trusted(sha256)) throw new Error('This ROM hack could not be loaded.');
		const cached = this.storageGet(`romhacks:data:${sha256}`);
		let hack;
		try {
			if (cached) hack = JSON.parse(cached);
		} catch {}
		if (cached && (!hack?.indices || hack.sha256 !== sha256)) {
			hack = null;
			this.forget(sha256);
		}
		if (!hack) {
			const response = await fetch(`${this.serverUrl()}/romhacks/${sha256}.json`, { cache: 'no-store' });
			hack = await response.json();
			if (!response.ok || hack.error) throw new Error(hack.error || 'This ROM hack could not be loaded.');
			if (hack.sha256 !== sha256 || !hack.indices) throw new Error('The server answered for a different ROM hack.');
			this.checked[sha256] = Promise.resolve(false);
		}
		const known = this.list().find(entry => entry.sha256 === sha256);
		if (known && !hack.name) hack.name = known.name;
		this.install(hack);
		return hack;
	}
	offeredBases(refusal: any): { id: string, name: string }[] {
		if (!['IPS_BASE_UNKNOWN', 'IPS_BASE_MISFIT', 'UNKNOWN_BASE'].includes(refusal?.code)) return [];
		if (!Array.isArray(refusal.bases)) return [];
		const bases = [];
		for (const entry of refusal.bases) {
			if (typeof entry?.id !== 'string' || !/^[a-z0-9-]{1,32}$/.test(entry.id)) continue;
			if (typeof entry.name !== 'string' || !entry.name) continue;
			bases.push({ id: entry.id, name: entry.name.slice(0, 80) });
		}
		return bases;
	}
	async sha256Hex(bytes: Uint8Array) {
		const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
		let hex = '';
		for (let i = 0; i < digest.length; i++) hex += `0${digest[i].toString(16)}`.slice(-2);
		return hex;
	}
	matchRule(hack: any) {
		const picked = typeof hack?.pickedBase?.name === 'string' ? hack.pickedBase.name : '';
		if (!picked) return 'your opponent must upload the identical file.';
		return `your opponent must upload the identical file and choose the same base game (${picked}).`;
	}
	async upload(file: File, base?: string) {
		const bytes = new Uint8Array(await file.arrayBuffer());
		const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
		const isXdelta = bytes[0] === 0xd6 && bytes[1] === 0xc3 && bytes[2] === 0xc4;
		const isBsp = /\.bsp$/i.test(file.name);
		if (!magic.startsWith('BPS1') && !magic.startsWith('UPS1') && magic !== 'PATCH' && !isXdelta && !isBsp) {
			throw new Error('That is not an IPS, UPS, BPS, xdelta or BSP patch. Only patch files can be uploaded, never a ROM.');
		}
		if (bytes.length > 96 * 1024 * 1024) throw new Error('The patch is larger than 96 MB.');
		if (window.Config?.testclient) throw new Error('ROM hacks cannot be used in the test client.');
		const query = base ? `?base=${encodeURIComponent(base)}` : '';
		const response = await fetch(`${this.serverUrl()}/romhacks/upload${query}`, {
			method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes,
		});
		let hack;
		try {
			hack = await response.json();
		} catch {
			throw new Error('The server did not accept the patch.');
		}
		if (!response.ok || hack.error) {
			const refusal: any = new Error(hack.error || 'The server did not accept the patch.');
			const bases = this.offeredBases(hack);
			if (bases.length) refusal.bases = bases;
			throw refusal;
		}
		if (!this.trusted(hack.sha256)) throw new Error('The server did not accept the patch.');
		if (window.crypto?.subtle) {
			const local = await this.sha256Hex(bytes);
			let derived = '';
			if (base) {
				const text = `${local}:${base}`;
				const ascii = new Uint8Array(text.length);
				for (let i = 0; i < text.length; i++) ascii[i] = text.charCodeAt(i);
				derived = await this.sha256Hex(ascii);
			}
			if (hack.sha256 !== local && hack.sha256 !== derived) {
				throw new Error('The server answered for a different patch file.');
			}
		}
		hack.name = file.name.replace(/\.(bps|ups|ips|xdelta|vcdiff|bsp)$/i, '');
		const list = this.list().filter(entry => entry.sha256 !== hack.sha256);
		list.unshift({ sha256: hack.sha256, name: hack.name, baseGame: hack.baseGame, proof: hack.proof });
		delete hack.proof;
		this.checked[hack.sha256] = Promise.resolve(false);
		this.storageSet('romhacks:list', JSON.stringify(list.slice(0, 20)));
		this.install(hack);
		return hack;
	}
	install(hack: any, replace?: boolean) {
		const tables = window.BattleTeambuilderTable;
		if (!tables) throw new Error('The teambuilder data is still loading.');
		if (!this.trusted(hack?.sha256)) throw new Error('This ROM hack could not be loaded.');
		const gen = parseInt(String(hack.parentMod).slice(3), 10) || 9;
		const modid = `gen${gen}romhack${hack.sha256.slice(0, 12)}` as ID;
		if (replace) {
			delete tables[modid];
			delete Dex.moddedDexes[modid];
		}
		if (!tables[modid]) {
			const table: any = {
				overrideSpeciesData: {}, overrideMoveData: {}, overrideAbilityData: {}, overrideItemData: {},
				overrideTypeChart: {}, removeType: {}, overrideTier: {}, tiers: [], items: [], learnsets: {},
			};
			const fill = (target: any, source: any, type: string, extra: any) => {
				const added: [ID, string][] = [];
				for (const id in source) {
					const entry = source[id];
					if (entry.name) {
						target[id] = { exists: true, id, ...extra, ...entry };
						added.push([id as ID, type]);
					} else {
						target[id] = entry;
					}
				}
				return added;
			};
			const added = [
				...fill(table.overrideSpeciesData, hack.Pokedex, 'pokemon', { tier: 'OU' }),
				...fill(table.overrideMoveData, hack.Moves, 'move', {}),
				...fill(table.overrideAbilityData, hack.Abilities, 'ability', {}),
				...fill(table.overrideItemData, hack.Items, 'item', {}),
			];
			for (const id in hack.TypeChart || {}) {
				const entry = hack.TypeChart[id];
				table.overrideTypeChart[id] = entry.name ?
					{ exists: true, id, name: entry.name, damageTaken: entry.damageTaken } :
					entry.isNonstandard === null ? { exists: true, damageTaken: entry.damageTaken } :
					{ damageTaken: entry.damageTaken };
			}
			table.romHackMechanics = hack.mechanics && typeof hack.mechanics === 'object' ? hack.mechanics : {};
			tables[modid] = table;
			this.addToSearchIndex(added);
		}
		this.active = hack;
		this.modid = modid;
		this.overworldListed = null;
		this.legal = {};
		const types: [string, string][] = [['pokemon', 'species'], ['move', 'moves'], ['ability', 'abilities'], ['item', 'items']];
		for (const [type, key] of types) {
			const set: { [id: string]: 1 } = {};
			for (const id of hack.legal[key]) set[id] = 1;
			this.legal[type] = set;
		}
		this.storageSet('romhacks:active', hack.sha256);
		this.cacheHack(hack);
		for (const listener of this.listeners) listener();
	}
	addToSearchIndex(added: [ID, string][]) {
		const index: any[] = window.BattleSearchIndex;
		const offsets: any[] = window.BattleSearchIndexOffset;
		if (!index || !offsets) return;
		const fresh = added.filter(([id]) => !this.indexed[id]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
		if (!fresh.length) return;
		const newIndex: any[] = [];
		const newOffsets: any[] = [];
		const moved: number[] = [];
		let next = 0;
		for (let i = 0; i < index.length; i++) {
			while (next < fresh.length && fresh[next][0] < index[i][0]) {
				newIndex.push([fresh[next][0], fresh[next][1]]);
				newOffsets.push('');
				next++;
			}
			moved[i] = newIndex.length;
			newIndex.push(index[i]);
			newOffsets.push(offsets[i]);
		}
		for (; next < fresh.length; next++) {
			newIndex.push([fresh[next][0], fresh[next][1]]);
			newOffsets.push('');
		}
		for (const entry of newIndex) {
			if (entry.length > 2 && typeof entry[2] === 'number') entry[2] = moved[entry[2]];
		}
		index.splice(0, index.length, ...newIndex);
		offsets.splice(0, offsets.length, ...newOffsets);
		for (const [id] of fresh) this.indexed[id] = 1;
	}
	results(type: string): [string, ID][] {
		if (!this.active || !this.legal?.[type]) return [];
		const key = ({ pokemon: 'species', move: 'moves', ability: 'abilities', item: 'items' } as any)[type];
		const label = ({ pokemon: 'Pokémon', move: 'moves', ability: 'abilities', item: 'items' } as any)[type];
		const rows: [string, ID][] = [['header', `${this.active.name || 'ROM hack'} ${label}` as ID]];
		for (const id of this.active.legal[key]) rows.push([type, id]);
		return rows;
	}
	outgoing(message: string): { before: string[], message: string } {
		const before: string[] = [];
		if (!/\/(challenge|chall|search|vtm|accept|tour|utm)\b/.test(message)) return { before, message };
		if (/\/accept\b/.test(message)) {
			for (const entry of this.list()) {
				if (entry.proof) before.push(`/romhack have, ${entry.sha256}, ${entry.proof}`);
			}
			return { before, message };
		}
		if (!this.active) return { before, message };
		const rewritten = /\brom ?hack ?= ?[0-9a-f]{64}/i.test(message) ? message : message.replace(
			/\b(gen\d+romhacks[a-z0-9]*)(?![a-z0-9])(\s*@@@\s*)?/,
			(all, format, rules) => `${format}@@@ROM Hack = ${this.active.sha256}${rules ? ', ' : ''}`
		);
		const owned = this.list().find(entry => entry.sha256 === this.active.sha256);
		if (rewritten !== message && owned?.proof) before.push(`/romhack have, ${owned.sha256}, ${owned.proof}`);
		return { before, message: rewritten };
	}
};

if (typeof window !== 'undefined') {
	window.RomHacksOutgoing = (message: string) => RomHacks.outgoing(message);
	window.RomHacks = RomHacks;
}
if (typeof require === 'function') {
	// in Node
	global.Dex = Dex;
	global.TL = TL;
	global.toID = toID;
}
