import { Dex } from '../../sim/dex';
import { readMechanics, slimMechanics, votePockets, type RawHack, type RawMove, type RawSpecies } from './build';
import { readNdsLearnsets, type NdsLearnset, type NdsLearnsetRead } from './learnsets-nds';
import { readNdsMechanics } from './mechanics-nds';
import { requireSignatures } from './signatures';

export const DS_FAIRY_KEEPS_BASE_ENGINE = true;

interface Game {
	name: string; gen: 4 | 5; personal: string; moves: string; forms: string[]; firstForm: number; text: string;
}

const GEN4_FORMS = [
	'Deoxys-Attack', 'Deoxys-Defense', 'Deoxys-Speed', 'Wormadam-Sandy', 'Wormadam-Trash', 'Giratina-Origin',
	'Shaymin-Sky', 'Rotom-Heat', 'Rotom-Wash', 'Rotom-Frost', 'Rotom-Fan', 'Rotom-Mow',
];
const GEN5_FORMS = [
	'Deoxys-Attack', 'Deoxys-Defense', 'Deoxys-Speed', 'Wormadam-Sandy', 'Wormadam-Trash', 'Shaymin-Sky',
	'Giratina-Origin', 'Rotom-Heat', 'Rotom-Wash', 'Rotom-Frost', 'Rotom-Fan', 'Rotom-Mow', 'Castform-Sunny',
	'Castform-Rainy', 'Castform-Snowy', 'Basculin-Blue-Striped', 'Darmanitan-Zen', 'Meloetta-Pirouette',
	'Kyurem-White', 'Kyurem-Black', 'Keldeo-Resolute', 'Tornadus-Therian', 'Thundurus-Therian', 'Landorus-Therian',
];

export const GAMES: { [code: string]: Game } = {
	ADA: {
		name: 'Diamond', gen: 4, personal: 'poketool/personal/personal.narc', moves: 'poketool/waza/waza_tbl.narc',
		forms: GEN4_FORMS.slice(0, 5), firstForm: 496, text: 'msgdata/msg.narc',
	},
	APA: {
		name: 'Pearl', gen: 4, personal: 'poketool/personal_pearl/personal.narc', moves: 'poketool/waza/waza_tbl.narc',
		forms: GEN4_FORMS.slice(0, 5), firstForm: 496, text: 'msgdata/msg.narc',
	},
	CPU: {
		name: 'Platinum', gen: 4, personal: 'poketool/personal/pl_personal.narc', moves: 'poketool/waza/pl_waza_tbl.narc',
		forms: GEN4_FORMS, firstForm: 496, text: 'msgdata/pl_msg.narc',
	},
	IPK: {
		name: 'HeartGold', gen: 4, personal: 'a/0/0/2', moves: 'a/0/1/1', forms: GEN4_FORMS, firstForm: 496, text: 'a/0/2/7',
	},
	IPG: {
		name: 'SoulSilver', gen: 4, personal: 'a/0/0/2', moves: 'a/0/1/1', forms: GEN4_FORMS, firstForm: 496, text: 'a/0/2/7',
	},
	IRB: {
		name: 'Black', gen: 5, personal: 'a/0/1/6', moves: 'a/0/2/1', forms: GEN5_FORMS.slice(0, 18), firstForm: 650,
		text: 'a/0/0/2',
	},
	IRA: {
		name: 'White', gen: 5, personal: 'a/0/1/6', moves: 'a/0/2/1', forms: GEN5_FORMS.slice(0, 18), firstForm: 650,
		text: 'a/0/0/2',
	},
	IRE: {
		name: 'Black 2', gen: 5, personal: 'a/0/1/6', moves: 'a/0/2/1', forms: GEN5_FORMS, firstForm: 685,
		text: 'a/0/0/2',
	},
	IRD: {
		name: 'White 2', gen: 5, personal: 'a/0/1/6', moves: 'a/0/2/1', forms: GEN5_FORMS, firstForm: 685,
		text: 'a/0/0/2',
	},
};

const GEN4_TYPES = [
	'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', '???', 'Fire', 'Water', 'Grass',
	'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark',
];
const GEN5_TYPES = [
	'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass',
	'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy',
];

export function isNDS(rom: Buffer): boolean {
	if (rom.length < 0x1000000) return false;
	return rom.toString('latin1', 0x0c, 0x0f) in GAMES && rom.toString('latin1', 0, 7) === 'POKEMON';
}

export function findFile(rom: Buffer, filePath: string): Buffer | null {
	const fnt = rom.readUInt32LE(0x40);
	const fat = rom.readUInt32LE(0x48);
	let dir = 0;
	const parts = filePath.split('/');
	for (let p = 0; p < parts.length; p++) {
		const entry = fnt + dir * 8;
		if (entry + 8 > rom.length) return null;
		let at = fnt + rom.readUInt32LE(entry);
		let fileId = rom.readUInt16LE(entry + 4);
		let found = false;
		for (let guard = 0; guard < 100000 && at < rom.length; guard++) {
			const header = rom[at++];
			if (!header) break;
			const len = header & 0x7f;
			const name = rom.toString('latin1', at, at + len);
			at += len;
			if (header & 0x80) {
				const id = rom.readUInt16LE(at) & 0xfff;
				at += 2;
				if (name === parts[p] && p < parts.length - 1) {
					dir = id;
					found = true;
					break;
				}
			} else {
				if (name === parts[p] && p === parts.length - 1) {
					const start = rom.readUInt32LE(fat + fileId * 8);
					const end = rom.readUInt32LE(fat + fileId * 8 + 4);
					if (start > end || end > rom.length) return null;
					return rom.subarray(start, end);
				}
				fileId++;
			}
		}
		if (!found) return null;
	}
	return null;
}

export function readNarc(narc: Buffer): Buffer[] {
	if (narc.toString('latin1', 0, 4) !== 'NARC' || narc.toString('latin1', 0x10, 0x14) !== 'BTAF') {
		throw new Error('A game data archive in this hack could not be read.');
	}
	const btafSize = narc.readUInt32LE(0x14);
	const count = narc.readUInt32LE(0x18) & 0xffff;
	const btnf = 0x10 + btafSize;
	const data = btnf + narc.readUInt32LE(btnf + 4) + 8;
	const files: Buffer[] = [];
	for (let i = 0; i < count; i++) {
		const start = narc.readUInt32LE(0x1c + i * 8);
		const end = narc.readUInt32LE(0x20 + i * 8);
		files.push(narc.subarray(data + start, data + end));
	}
	return files;
}

const GEN4_CHARS: { [code: number]: string } = {
	0x1de: ' ', 0x1be: '-', 0x1ae: '.', 0x1b3: "'", 0x1ab: '!', 0x1ac: '?', 0x1ad: ',', 0x1bb: 'M', 0x1bc: 'F', 0x188: 'e',
};
for (let i = 0; i < 10; i++) GEN4_CHARS[0x121 + i] = String(i);
for (let i = 0; i < 26; i++) {
	GEN4_CHARS[0x12b + i] = String.fromCharCode(65 + i);
	GEN4_CHARS[0x145 + i] = String.fromCharCode(97 + i);
}

function readGen4Text(file: Buffer): string[] | null {
	if (file.length < 4) return null;
	const count = file.readUInt16LE(0);
	const seed = file.readUInt16LE(2);
	if (!count || count > 3000 || 4 + count * 8 > file.length) return null;
	const out: string[] = [];
	for (let i = 0; i < count; i++) {
		let key = (((seed * 0x2fd) & 0xffff) * (i + 1)) & 0xffff;
		key = (key | (key << 16)) >>> 0;
		const offset = (file.readUInt32LE(4 + i * 8) ^ key) >>> 0;
		const length = (file.readUInt32LE(8 + i * 8) ^ key) >>> 0;
		if (length > 2000 || offset + length * 2 > file.length) return null;
		let stream = (0x91bd3 * (i + 1)) & 0xffff;
		let text = '';
		for (let j = 0; j < length; j++) {
			const code = file.readUInt16LE(offset + j * 2) ^ stream;
			stream = (stream + 0x493d) & 0xffff;
			if (code === 0xffff) break;
			text += GEN4_CHARS[code] || '';
		}
		out.push(text.trim());
	}
	return out;
}

function readGen5Text(file: Buffer): string[] | null {
	if (file.length < 16) return null;
	const sections = file.readUInt16LE(0);
	const count = file.readUInt16LE(2);
	const section = file.readUInt32LE(12);
	if (!sections || sections > 4 || !count || count > 5000 || section + 4 + count * 8 > file.length) return null;
	const out: string[] = [];
	for (let i = 0; i < count; i++) {
		const at = section + file.readUInt32LE(section + 4 + i * 8);
		const length = file.readUInt16LE(section + 8 + i * 8);
		if (!length || length > 2000 || at + length * 2 > file.length) {
			out.push('');
			continue;
		}
		const codes: number[] = [];
		for (let j = 0; j < length; j++) codes.push(file.readUInt16LE(at + j * 2));
		let key = codes[length - 1] ^ 0xffff;
		for (let j = length - 1; j >= 0; j--) {
			codes[j] ^= key;
			key = ((key >>> 3) | (key << 13)) & 0xffff;
		}
		let text = '';
		for (const code of codes) {
			if (code === 0xffff) break;
			if (code === 0x2642) text += 'M';
			else if (code === 0x2640) text += 'F';
			else if (code === 0xe9) text += 'e';
			else if (code === 0x2019) text += "'";
			else if (code >= 0x20 && code < 0x7f) text += String.fromCharCode(code);
		}
		out.push(text.trim());
	}
	return out;
}

function bestText(texts: string[][], wanted: string[], least: number): string[] | null {
	const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
	let best: string[] | null = null;
	let bestScore = 0;
	let total = 0;
	for (const name of wanted) {
		if (name) total++;
	}
	for (const list of texts) {
		if (list.length < least) continue;
		let score = 0;
		wanted.forEach((name, i) => {
			if (name && list[i] && key(list[i]) === key(name)) score++;
		});
		if (list[1] !== list[1].toUpperCase()) score += 0.5;
		if (score > bestScore) {
			bestScore = score;
			best = list;
		}
	}
	return bestScore >= total * 0.6 ? best : null;
}

const ITEM_DATA: { [code: string]: string } = {
	ADA: 'itemtool/itemdata/item_data.narc', APA: 'itemtool/itemdata/item_data.narc',
	CPU: 'itemtool/itemdata/pl_item_data.narc', IPK: 'a/0/1/7', IPG: 'a/0/1/7',
	IRB: 'a/0/2/4', IRA: 'a/0/2/4', IRE: 'a/0/2/4', IRD: 'a/0/2/4',
};

function unpackCode(rom: Buffer): Buffer | null {
	const start = rom.readUInt32LE(0x20);
	const size = rom.readUInt32LE(0x2c);
	if (start + size > rom.length || size < 0x1000) return null;
	const packed = rom.subarray(start, start + size);
	const lengths = packed.readUInt32LE(size - 8);
	const extra = packed.readUInt32LE(size - 4);
	const header = lengths >>> 24;
	const coded = lengths & 0xffffff;
	if (!extra || extra > 0x400000 || coded > size || header < 8 || header > 0x10) return packed;
	const out = Buffer.alloc(size + extra);
	packed.copy(out, 0, 0, size);
	let from = size - header;
	let to = size + extra;
	const stop = size - coded;
	while (from > stop) {
		const flags = packed[--from];
		for (let bit = 7; bit >= 0 && from > stop; bit--) {
			if (flags & (1 << bit)) {
				const a = packed[--from];
				const b = packed[--from];
				const distance = (((a & 15) << 8) | b) + 3;
				for (let i = 0; i < (a >> 4) + 3 && to > 0; i++) {
					to--;
					out[to] = out[to + distance];
				}
			} else if (to > 0) {
				out[--to] = packed[--from];
			}
		}
	}
	return out;
}

function readPockets(rom: Buffer, code: string, names: string[]): RawHack['itemPockets'] {
	const file = findFile(rom, ITEM_DATA[code]);
	if (!file) return undefined;
	let entries: Buffer[];
	try {
		entries = readNarc(file);
	} catch {
		return undefined;
	}
	const program = GAMES[code].gen === 4 ? unpackCode(rom) : null;
	let table = -1;
	if (program) {
		search: for (let at = 0; at + names.length * 8 + 16 <= program.length; at += 2) {
			if (program.readUInt16LE(at + 8) !== 1 || program.readUInt16LE(at + 14) !== 1) continue;
			for (let item = 1; item < 10; item++) {
				const row = at + item * 8;
				if (program.readUInt16LE(row) !== item || program.readUInt16LE(row + 6) !== item) continue search;
				if (item < 9 && program.readUInt16LE(row + 4) !== program.readUInt16LE(row + 2) + 1) continue search;
			}
			table = at;
			break;
		}
	}
	return votePockets(names, 0, 16, (item, at) => {
		const entry = entries[table >= 0 ? program!.readUInt16LE(table + (item + 1) * 8) : item + 1];
		return entry && at + 2 <= entry.length ? entry.readUInt16LE(at) : -1;
	}, 7, 0xf);
}

export function extractNDS(rom: Buffer, base: Buffer | null = null): RawHack {
	requireSignatures();
	const game = GAMES[rom.toString('latin1', 0x0c, 0x0f)];
	const notes: string[] = [];
	const dex = Dex.mod(`gen${game.gen}`);
	const typeNames = game.gen === 4 ? GEN4_TYPES : GEN5_TYPES;
	const maxSpecies = game.gen === 4 ? 493 : 649;

	const speciesByNum: string[] = [];
	for (const species of dex.species.all()) {
		if (species.num > 0 && species.num <= maxSpecies && species.name === species.baseSpecies) {
			speciesByNum[species.num] = species.name;
		}
	}
	const abilityByNum: string[] = [];
	for (const ability of Dex.abilities.all()) {
		if (ability.num > 0 && !ability.isNonstandard) abilityByNum[ability.num] = ability.name;
	}
	const moveByNum: string[] = [];
	for (const move of Dex.moves.all()) {
		if (move.num > 0 && !move.isZ && !move.isMax && (!move.isNonstandard || move.isNonstandard === 'Past') &&
			!(move.id.startsWith('hiddenpower') && move.id !== 'hiddenpower') && move.gen <= game.gen) moveByNum[move.num] = move.name;
	}

	const texts: string[][] = [];
	const textFile = findFile(rom, game.text);
	if (textFile) {
		try {
			for (const file of readNarc(textFile)) {
				const list = (game.gen === 4 ? readGen4Text : readGen5Text)(file);
				if (list && list.length >= 17 && list.length <= 1200) texts.push(list);
			}
		} catch {}
	}
	const itemByNum: string[] = [];
	for (const item of dex.items.all()) {
		if (item.num > 0 && item.gen <= game.gen && !item.isNonstandard) itemByNum[item.num] = item.name;
	}
	const speciesText = bestText(texts, speciesByNum, maxSpecies);
	const moveText = bestText(texts, moveByNum, 400);
	const abilityText = bestText(texts, abilityByNum.slice(0, game.gen === 4 ? 124 : 165), 100);
	const itemText = bestText(texts, itemByNum.slice(0, 330), 300);
	const typeText = bestText(texts.filter(list => list.length <= 20), typeNames.map(name => (name === '???' ? '' : name)), 17);
	const typeName = (id: number) => {
		const text = typeText?.[id] || '';
		if (/^[A-Za-z]{3,10}$/.test(text)) return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
		return typeNames[id] || '???';
	};
	const abilityName = (id: number) => (abilityText ? abilityText[id] : abilityByNum[id]) || '';

	const personalFile = findFile(rom, game.personal);
	if (!personalFile) throw new Error('The Pokemon data of this hack could not be found.');
	const personal = readNarc(personalFile);
	const species: RawSpecies[] = [];
	const abilityAt = game.gen === 4 ? 0x16 : 0x18;
	personal.forEach((entry, i) => {
		let name = (i <= maxSpecies && speciesText?.[i]) || speciesByNum[i];
		if (i > maxSpecies) name = i >= game.firstForm ? game.forms[i - game.firstForm] : '';
		const stock = speciesByNum[i] || '';
		if (name && stock && !dex.species.get(name).exists && stock.toLowerCase().startsWith(name.toLowerCase())) name = stock;
		if (!name || entry.length < abilityAt + 3) return;
		const ids = [entry[abilityAt], entry[abilityAt + 1], game.gen === 5 ? entry[abilityAt + 2] : 0];
		species.push({
			index: i,
			name,
			baseStats: { hp: entry[0], atk: entry[1], def: entry[2], spe: entry[3], spa: entry[4], spd: entry[5] },
			types: [typeName(entry[6]), typeName(entry[7])],
			abilities: ids.map(abilityName),
		});
	});

	const read = readMechanics(notes, () => readNdsMechanics(rom, base, {
		types: typeNames.map((unused, id) => typeName(id)), moves: moveText || moveByNum, items: itemText || itemByNum,
		abilities: abilityText || abilityByNum,
	}));
	const moves: RawMove[] = [];
	const moveFile = findFile(rom, game.moves);
	let moveLimit = 0;
	if (!moveFile) {
		notes.push('Move data was not found; moves are taken from the official games.');
	} else {
		const moveEntries = readNarc(moveFile);
		moveLimit = moveEntries.length;
		moveEntries.forEach((entry, i) => {
			const name = (moveText ? moveText[i] : '') || moveByNum[i];
			if (!name || !i) return;
			if (game.gen === 4 && entry.length >= 12) {
				moves.push({
					index: i, name, category: (['Physical', 'Special', 'Status'] as const)[entry[2]], basePower: entry[3],
					type: typeName(entry[4]), accuracy: entry[5], pp: entry[6], priority: entry.readInt8(10),
				});
			} else if (game.gen === 5 && entry.length >= 8) {
				moves.push({
					index: i, name, type: typeName(entry[0]), category: (['Status', 'Physical', 'Special'] as const)[entry[2]],
					basePower: entry[3], accuracy: entry[4] > 100 ? 0 : entry[4], pp: entry[5], priority: entry.readInt8(6),
				});
			}
		});
	}

	const abilities = abilityText ? abilityText.slice(1) :
		abilityByNum.filter((name, num) => name && Dex.abilities.get(name).gen <= game.gen);
	const items = itemText ? itemText.slice(1) :
		dex.items.all().filter(item => item.gen <= game.gen && !item.isNonstandard).map(item => item.name);
	if (!speciesText || !moveText || !abilityText) {
		notes.push('Some name tables of this hack could not be read; those names are matched by their game index.');
	}
	if (read) {
		for (const move of moves) {
			const fields = read.rawMoveFields[move.index];
			if (fields) Object.assign(move, fields);
		}
	}
	const chartRead = !!read?.typeChart && read.typeChart.length >= 20;
	const newer = species.some(entry => entry.types!.includes('Fairy')) || moves.some(move => move.type === 'Fairy');
	let learnsets: NdsLearnsetRead;
	try {
		learnsets = moveLimit ? readNdsLearnsets(rom, base, {
			code: rom.toString('latin1', 0x0c, 0x0f), gen: game.gen, personal, moveLimit, speciesLimit: maxSpecies + 1,
			indices: species.map(entry => entry.index),
			firstForm: game.firstForm, formBase: index => dex.species.get(game.forms[index - game.firstForm] || '').num || 0,
		}) : { status: 'unreadable', note: 'the move data was not found', learnsets: [], evolvesFrom: [] };
	} catch {
		learnsets = { status: 'unreadable', note: 'the game data has an unknown layout', learnsets: [], evolvesFrom: [] };
	}
	if (learnsets.status === 'read') {
		for (const entry of species) {
			const target = entry as RawSpecies & { learnset?: NdsLearnset, evolvesFrom?: number };
			const found = learnsets.learnsets[entry.index];
			if (!found) continue;
			target.learnset = found;
			const from = learnsets.evolvesFrom[entry.index];
			if (from !== undefined) target.evolvesFrom = from;
		}
	}
	const learnsetFields: { learnsetStatus: 'read' | 'unreadable', learnsetNote?: string } = learnsets.status === 'read' ?
		{ learnsetStatus: 'read' } : {
			learnsetStatus: 'unreadable',
			learnsetNote: `The movesets of this game could not be read: ${learnsets.note || 'unknown layout'}.`,
		};
	const raw: RawHack = {
		mechanics: read ? slimMechanics(read) : undefined,
		typeChart: chartRead ? read.typeChart : undefined,
		baseGame: game.name,
		baseGen: game.gen,
		species,
		moves: moves.length ? moves : moveByNum.filter(Boolean).map((name, i) => ({ index: i, name })),
		abilities,
		items,
		itemPockets: itemText ? readPockets(rom, rom.toString('latin1', 0x0c, 0x0f), items) : undefined,
		typeBasedCategories: false,
		keepBaseEngine: !newer || (DS_FAIRY_KEEPS_BASE_ENGINE && chartRead),
		notes,
	};
	return Object.assign(raw, learnsetFields);
}
