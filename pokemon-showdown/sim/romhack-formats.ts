import { toID } from './dex-data';

export type RomHackMode = 'regular' | 'hackmons' | 'disguises';

export interface RomHackLearnsetData {
	moves: string[];
	species: { [id: string]: number[] };
	noSketch?: string[];
	own?: { [id: string]: {
		levelup: number[], machines: number[], tutor: number[], egg: number[], other?: number[], prevos?: string[],
	}, };
}

export const ROM_HACK_FORMATS = new Map<string, RomHackMode>([
	['gen9romhacksregularexperimental', 'regular'],
	['gen9romhackshackmonsexperimental', 'hackmons'],
	['gen9romhacksdisguisesexperimental', 'disguises'],
	['gen9romhacksexperimental', 'disguises'],
]);

export const ROM_HACK_REGULAR_UNAVAILABLE =
	'Regular is not available for this hack: its movesets could not be read. Use Hackmons or Disguises.';

export function romHackMode(format: string | { id: string }): RomHackMode | null {
	const id = typeof format === 'string' ? toID(format.split('@@@')[0]) : format.id;
	return ROM_HACK_FORMATS.get(id) || null;
}

export function romHackRuleId(rules: readonly string[]): string {
	let found = '';
	for (const rule of rules) {
		const [name, value, ...rest] = rule.replace(/^[\s!^+*-]+/, '').split('=');
		if (toID(name) !== 'romhack') continue;
		const id = (value || '').trim().toLowerCase();
		if (rest.length || !/^[0-9a-f]{64}$/.test(id) || (found && found !== id)) return '';
		found = id;
	}
	return found;
}

export function romHackIdOf(formatid: string): string {
	if (!romHackMode(formatid)) return '';
	const at = formatid.indexOf('@@@');
	return at < 0 ? '' : romHackRuleId(formatid.slice(at + 3).split(','));
}

export function romHackHasSpecies(
	hack: { species: Set<string> }, species: { id: string, baseSpecies: string, isCosmeticForme?: boolean }
): boolean {
	return hack.species.has(species.id) || (!!species.isCosmeticForme && hack.species.has(toID(species.baseSpecies)));
}

export function isCustomDisguisesFormat(formatid: string): boolean {
	return formatid.includes('customdisguise') || romHackMode(formatid) === 'disguises';
}

export interface RomHackLearnsetTable { [id: string]: { learnset: { [move: string]: string[] } } }

export function romHackLearnsetTable(data: RomHackLearnsetData, gen: number): RomHackLearnsetTable {
	const shared = new Map<string, string[]>();
	const sources = (list: string[]) => {
		const key = list.join();
		let found = shared.get(key);
		if (!found) {
			found = list;
			shared.set(key, found);
		}
		return found;
	};
	const ownSources = new Map<string, Map<number, string[]>>();
	const own = (id: string) => {
		let found = ownSources.get(id);
		if (found) return found;
		found = new Map();
		ownSources.set(id, found);
		const entry = data.own?.[id];
		if (!entry) return found;
		const add = (move: number, source: string) => {
			const list = found.get(move);
			if (!list) found.set(move, [source]);
			else if (!list.includes(source)) list.push(source);
		};
		for (let i = 0; i + 1 < entry.levelup.length; i += 2) add(entry.levelup[i + 1], `${gen}L${entry.levelup[i]}`);
		for (const move of entry.machines) add(move, `${gen}M`);
		for (const move of entry.tutor) add(move, `${gen}T`);
		for (const move of entry.egg) add(move, `${gen}E`);
		for (const move of entry.other || []) add(move, `${gen}L0`);
		return found;
	};
	const inherited = (id: string, move: number, seen: Set<string>): string[] | null => {
		if (seen.has(id)) return null;
		seen.add(id);
		const mine = own(id).get(move);
		if (mine) return mine;
		for (const prevo of data.own?.[id]?.prevos || []) {
			const found = inherited(prevo, move, seen);
			if (found) return found;
		}
		return null;
	};
	const table: RomHackLearnsetTable = {};
	for (const id in data.species) {
		const learnset: { [move: string]: string[] } = {};
		for (const move of data.species[id]) {
			const moveid = data.moves[move];
			if (!moveid) continue;
			learnset[moveid] = sources(inherited(id, move, new Set()) || [`${gen}E`]);
		}
		table[id] = { learnset };
	}
	return table;
}
