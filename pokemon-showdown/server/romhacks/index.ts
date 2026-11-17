import * as child_process from 'child_process';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import type * as http from 'http';
import {
	applyPatch, crc32, ipsBoundaryFit, ipsKeptBytes, ipsPairFit, readPatchInfo, requireVcdiffChecksum, MAX_TARGET_SIZE,
} from './patch';
import { buildHackDex, HACK_VERSION, type HackDex, type RawHack } from './build';
import { Dex } from '../../sim/dex';
import { extractGen3, isGen3 } from './gen3';
import { extractGB, isGB } from './gb';
import { extractNDS, isNDS } from './nds';
import { extractGen3Sprites } from './sprites-gen3';
import { extractNDSSprites } from './sprites-nds';
import { extractGBSprites } from './sprites-gb';
import { isPrism } from './prism';
import { extractPrismSprites } from './sprites-prism';
import { requireSignatures, signatureStamp } from './signatures';

const ROOT = path.resolve(__dirname, '../../..');
const STORE_DIR = path.join(ROOT, 'databases/romhacks');
const BASES_DIR = process.env.PHNN_ROMHACK_BASES || path.join(ROOT, 'config/romhack-bases');
export const MAX_PATCH_SIZE = 96 * 1024 * 1024;
const MAX_HACK_JSON = 4 * 1024 * 1024;
const BSP_TOTAL_MILLIS = 30000;
const TOOLS_DIR = path.join(ROOT, 'config/romhack-tools');
const BASE_CACHE = path.join(STORE_DIR, '.bases.json');
const USAGE_FILE = path.join(STORE_DIR, '.usage.json');
const UNPLACED_FILE = path.join(STORE_DIR, '.unplaced.json');
const MAX_UNPLACED = 4096;
const BWRAP = '/usr/bin/bwrap';
const XDELTA_RUN_MILLIS = 20000;
const XDELTA_TOTAL_MILLIS = 45000;
const IMPORT_MILLIS = 60000;
const IMPORT_HEAP_MB = 2048;
const MAX_STORED_HACKS = 1000;
const MAX_STORE_BYTES = 20 * 1024 * 1024 * 1024;
const MIN_FREE_BYTES = 20 * 1024 * 1024 * 1024;
const MIN_FREE_INODES = 2000000;
const EVICT_IDLE_MILLIS = 6 * 60 * 60 * 1000;
const STALE_MILLIS = 10 * 60 * 1000;
const TOUCH_MILLIS = 60 * 60 * 1000;
const UPLOAD_WINDOW_MILLIS = 10 * 60 * 1000;
const UPLOADS_PER_WINDOW = 8;
const MAX_TRACKED_ADDRESSES = 5000;
const IMPORTS_PER_HOUR = 300;
const MAX_INCOMING = 32;
const BODY_MILLIS = 120000;
const BODY_IDLE_MILLIS = 20000;
const IPS_MIN_SAMPLE = 256;
const IPS_MIN_MISSES = 8;
const IPS_BASE_UNKNOWN = 'The base game of this IPS patch could not be determined. An IPS patch carries no checksum of ' +
	'its base game, and this one fits no Game Boy or Game Boy Advance game this server has, or fits more than one ' +
	'equally well. If this hack has a BPS or UPS patch, use that instead.';
const IPS_EMPTY = 'This IPS patch changes nothing.';
const BASE_NOT_OFFERED = 'This server does not offer the chosen base game. Choose one from the list.';
const GB_MAX_SIZE = 0x800000;
const STORE_FULL = 'This server cannot store more ROM hacks right now. Try again later.';

const KNOWN_BASES: { [crc: string]: string } = {
	dd88761c: 'Pokemon FireRed (USA, 1.0)',
	'84ee4776': 'Pokemon FireRed (USA, 1.1)',
	d69c96cc: 'Pokemon LeafGreen (USA, 1.0)',
	'1f1c08fb': 'Pokemon Emerald (USA)',
	f0815ee7: 'Pokemon Ruby (USA, 1.0)',
	'554dedc4': 'Pokemon Sapphire (USA, 1.0)',
	'9f7fdd53': 'Pokemon Red (USA)',
	d6da8a1a: 'Pokemon Blue (USA)',
	'7d527d62': 'Pokemon Yellow (USA)',
	'6bde3c3e': 'Pokemon Gold (USA)',
	'8ad48636': 'Pokemon Silver (USA)',
	ee6f5188: 'Pokemon Crystal (USA, 1.0)',
	'3358e30a': 'Pokemon Crystal (USA, 1.1)',
};

export interface BaseChoice { id: string; name: string }

const BASE_CHOICES: (BaseChoice & { crc: string })[] = [
	{ crc: '9f7fdd53', id: 'red', name: 'Pokemon Red' },
	{ crc: 'd6da8a1a', id: 'blue', name: 'Pokemon Blue' },
	{ crc: '7d527d62', id: 'yellow', name: 'Pokemon Yellow' },
	{ crc: '6bde3c3e', id: 'gold', name: 'Pokemon Gold' },
	{ crc: '8ad48636', id: 'silver', name: 'Pokemon Silver' },
	{ crc: 'ee6f5188', id: 'crystal', name: 'Pokemon Crystal' },
	{ crc: '3358e30a', id: 'crystal-rev1', name: 'Pokemon Crystal (rev 1)' },
	{ crc: 'f0815ee7', id: 'ruby', name: 'Pokemon Ruby' },
	{ crc: '61641576', id: 'ruby-rev1', name: 'Pokemon Ruby (rev 1)' },
	{ crc: 'aeac73e6', id: 'ruby-rev2', name: 'Pokemon Ruby (rev 2)' },
	{ crc: '554dedc4', id: 'sapphire', name: 'Pokemon Sapphire' },
	{ crc: 'bafedae5', id: 'sapphire-rev1', name: 'Pokemon Sapphire (rev 1)' },
	{ crc: '9cc4410e', id: 'sapphire-rev2', name: 'Pokemon Sapphire (rev 2)' },
	{ crc: '1f1c08fb', id: 'emerald', name: 'Pokemon Emerald' },
	{ crc: 'dd88761c', id: 'firered', name: 'Pokemon FireRed' },
	{ crc: '84ee4776', id: 'firered-rev1', name: 'Pokemon FireRed (rev 1)' },
	{ crc: 'd69c96cc', id: 'leafgreen', name: 'Pokemon LeafGreen' },
	{ crc: 'daffecec', id: 'leafgreen-rev1', name: 'Pokemon LeafGreen (rev 1)' },
];

export class ImportError extends Error {
	code: string;
	bases: BaseChoice[];
	constructor(message: string, code: string, bases: BaseChoice[]) {
		super(message);
		this.code = code;
		this.bases = bases;
	}
}

interface BaseRom { file: string; size: number; mtime: number; crc: number; stock?: { key: string, digest: string } }
let baseCache: BaseRom[] | null = null;

function xdeltaTool(): string | null {
	try {
		if (fs.existsSync(BWRAP)) return fs.realpathSync(path.join(TOOLS_DIR, 'xdelta3'));
	} catch {}
	return null;
}

function runXdelta(tool: string, base: string, patch: string): Buffer | null {
	const result = child_process.spawnSync(BWRAP, [
		'--unshare-all', '--die-with-parent', '--new-session',
		'--ro-bind', '/usr', '/usr', '--ro-bind', '/lib', '/lib', '--ro-bind', '/lib64', '/lib64',
		'--ro-bind', tool, '/xdelta3', '--ro-bind', fs.realpathSync(base), '/base', '--ro-bind', patch, '/patch',
		'/xdelta3', '-d', '-c', '-f', '-R', '-D', '-s', '/base', '/patch',
	], {
		maxBuffer: MAX_TARGET_SIZE + 4096, stdio: ['ignore', 'pipe', 'ignore'], timeout: XDELTA_RUN_MILLIS,
		killSignal: 'SIGKILL', env: {},
	});
	return result.status === 0 && result.stdout?.length ? result.stdout : null;
}

function storeFull(): boolean {
	try {
		const stat = fs.statfsSync(fs.existsSync(STORE_DIR) ? STORE_DIR : ROOT);
		return stat.bavail * stat.bsize < MIN_FREE_BYTES || stat.ffree < MIN_FREE_INODES;
	} catch {
		return false;
	}
}

function treeBytes(file: string): number {
	let stat;
	try {
		stat = fs.lstatSync(file);
	} catch {
		return 0;
	}
	let bytes = stat.blocks * 512;
	if (!stat.isDirectory()) return bytes;
	for (const name of fs.readdirSync(file)) bytes += treeBytes(path.join(file, name));
	return bytes;
}

function hackBytes(sha256: string): number {
	return treeBytes(hackPath(sha256)) + treeBytes(fullPath(sha256)) + treeBytes(path.join(STORE_DIR, sha256));
}

function readUsage(): { [sha256: string]: number } {
	try {
		const usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
		if (usage && typeof usage === 'object' && !Array.isArray(usage)) return usage;
	} catch {}
	return {};
}

function writeUsage(usage: { [sha256: string]: number }) {
	try {
		const tmp = `${USAGE_FILE}.${process.pid}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(usage));
		fs.renameSync(tmp, USAGE_FILE);
	} catch {}
}

function touchHack(sha256: string) {
	try {
		if (Date.now() - fs.statSync(hackPath(sha256)).mtimeMs < TOUCH_MILLIS) return;
		const now = new Date();
		fs.utimesSync(hackPath(sha256), now, now);
	} catch {}
}

function makeRoom(incoming: string) {
	if (storeFull()) throw new Error(STORE_FULL);
	let names: string[];
	try {
		names = fs.readdirSync(STORE_DIR);
	} catch {
		return;
	}
	const now = Date.now();
	const present = new Set(names);
	for (const name of names) {
		const orphan = /^[0-9a-f]{64}$/.test(name) && !present.has(`${name}.json`) && name !== incoming;
		if (!orphan && !name.endsWith('.tmp')) continue;
		try {
			const file = path.join(STORE_DIR, name);
			if (now - fs.statSync(file).mtimeMs > STALE_MILLIS) fs.rmSync(file, { recursive: true, force: true });
		} catch {}
	}
	const known = readUsage();
	const usage: { [sha256: string]: number } = {};
	const hacks: { sha256: string, used: number }[] = [];
	let bytes = 0;
	for (const name of names) {
		const match = /^([0-9a-f]{64})\.json$/.exec(name);
		if (!match || match[1] === incoming) continue;
		let used;
		try {
			used = fs.statSync(path.join(STORE_DIR, name)).mtimeMs;
		} catch {
			continue;
		}
		usage[match[1]] = typeof known[match[1]] === 'number' ? known[match[1]] : hackBytes(match[1]);
		bytes += usage[match[1]];
		hacks.push({ sha256: match[1], used });
	}
	let count = hacks.length;
	for (const hack of hacks.sort((a, b) => a.used - b.used)) {
		if (count < MAX_STORED_HACKS && bytes < MAX_STORE_BYTES) break;
		if (now - hack.used < EVICT_IDLE_MILLIS) break;
		fs.rmSync(hackPath(hack.sha256), { force: true });
		fs.rmSync(fullPath(hack.sha256), { force: true });
		fs.rmSync(path.join(STORE_DIR, hack.sha256), { recursive: true, force: true });
		count--;
		bytes -= usage[hack.sha256];
		delete usage[hack.sha256];
	}
	writeUsage(usage);
	if (count >= MAX_STORED_HACKS || bytes >= MAX_STORE_BYTES) throw new Error(STORE_FULL);
}

function recordUsage(sha256: string) {
	const usage = readUsage();
	usage[sha256] = hackBytes(sha256);
	writeUsage(usage);
}

function listBases(): BaseRom[] {
	let names: string[];
	try {
		names = fs.readdirSync(BASES_DIR).sort();
	} catch {
		return [];
	}
	if (!baseCache) {
		try {
			baseCache = JSON.parse(fs.readFileSync(BASE_CACHE, 'utf8'));
		} catch {}
		if (!Array.isArray(baseCache)) baseCache = [];
	}
	const known = baseCache;
	let changed = false;
	const next: BaseRom[] = [];
	for (const name of names) {
		const file = path.join(BASES_DIR, name);
		let stat;
		try {
			stat = fs.statSync(file);
		} catch {
			continue;
		}
		if (!stat.isFile() || stat.size > MAX_TARGET_SIZE || stat.size < 0x8000) continue;
		const cached = known.find(b => b.file === file && b.size === stat.size && b.mtime === stat.mtimeMs);
		if (!cached) changed = true;
		next.push(cached || { file, size: stat.size, mtime: stat.mtimeMs, crc: crc32(fs.readFileSync(file)) });
	}
	baseCache = next;
	if (changed || next.length !== known.length) saveBases();
	return next;
}

function saveBases() {
	try {
		fs.mkdirSync(STORE_DIR, { recursive: true });
		const tmp = `${BASE_CACHE}.${process.pid}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(baseCache));
		fs.renameSync(tmp, BASE_CACHE);
	} catch {}
}

export function extractRom(rom: Buffer, base: Buffer | null): RawHack {
	requireSignatures();
	let raw: RawHack | null = null;
	if (isGen3(rom)) raw = extractGen3(rom, base);
	else if (isGB(rom)) raw = extractGB(rom, base);
	else if (isNDS(rom)) raw = extractNDS(rom, base);
	if (raw) {
		raw.rom = rom;
		return raw;
	}
	throw new Error('Only Game Boy, Game Boy Color, Game Boy Advance and DS (Generation 4 and 5) hacks can be read so far.');
}

function hex8(n: number) {
	return n.toString(16).padStart(8, '0');
}

export function hackPath(sha256: string) {
	return path.join(STORE_DIR, `${sha256}.json`);
}

let proofSecret: Buffer | null = null;

export function proofFor(sha256: string): string {
	if (!proofSecret) {
		const file = path.join(ROOT, 'config/romhack-secret');
		try {
			proofSecret = fs.readFileSync(file);
		} catch {}
		if (!proofSecret || proofSecret.length < 32) {
			const fresh = crypto.randomBytes(48);
			try {
				fs.writeFileSync(file, fresh, { mode: 0o600, flag: 'wx' });
				proofSecret = fresh;
			} catch {
				proofSecret = fs.readFileSync(file);
			}
		}
	}
	return crypto.createHmac('sha256', proofSecret).update(sha256).digest('hex').slice(0, 32);
}

export function fullPath(sha256: string) {
	return path.join(STORE_DIR, `${sha256}.full.json`);
}

function writeFull(hack: HackDex) {
	const dex = Dex.mod(`romhack${hack.sha256}`);
	const full: AnyObject = {
		version: hack.version, sha256: hack.sha256, baseGame: hack.baseGame, baseGen: hack.baseGen, parentMod: hack.parentMod,
		notes: hack.notes, approximated: hack.approximated, sprites: hack.sprites || null, TypeChart: hack.TypeChart || {},
		mechanics: hack.mechanics || {}, mechanicsNotes: hack.mechanicsNotes || [], pokemon: {}, moves: {}, abilities: {},
		items: {}, learnsetStatus: hack.learnsetStatus,
	};
	if (hack.learnsetNote) full.learnsetNote = hack.learnsetNote;
	if (hack.learnsets) {
		full.learnsets = { moves: hack.learnsets.moves, species: hack.learnsets.species };
		if (hack.learnsets.noSketch) full.learnsets.noSketch = hack.learnsets.noSketch;
	}
	for (const id of hack.legal.species) {
		const species = dex.species.get(id);
		if (!species.exists) continue;
		full.pokemon[id] = { name: species.name, types: species.types, baseStats: species.baseStats, abilities: species.abilities };
		const innates = (species as AnyObject).innates;
		if (innates) full.pokemon[id].innates = innates;
	}
	for (const id of hack.legal.moves) {
		const move = dex.moves.get(id);
		if (!move.exists) continue;
		full.moves[id] = {
			name: move.name, type: move.type, category: move.category, basePower: move.basePower, accuracy: move.accuracy,
			pp: move.pp, priority: move.priority, shortDesc: move.shortDesc || move.desc || '',
		};
	}
	for (const id of hack.legal.abilities) {
		const ability = dex.abilities.get(id);
		const text = ability as AnyObject;
		if (ability.exists) full.abilities[id] = { name: ability.name, shortDesc: text.shortDesc || text.desc || '' };
	}
	for (const id of hack.legal.items) {
		const item = dex.items.get(id);
		const text = item as AnyObject;
		if (item.exists) full.items[id] = { name: item.name, shortDesc: text.shortDesc || text.desc || '' };
	}
	const stored = JSON.stringify(full);
	if (stored.length > MAX_HACK_JSON * 2) return;
	const tmp = `${fullPath(hack.sha256)}.${process.pid}.tmp`;
	fs.writeFileSync(tmp, stored);
	fs.renameSync(tmp, fullPath(hack.sha256));
}

export function hackExists(sha256: string) {
	return /^[0-9a-f]{64}$/.test(sha256) && fs.existsSync(hackPath(sha256));
}

function gbChecksumsValid(rom: Buffer): boolean {
	if (!isGB(rom)) return false;
	let header = 0;
	for (let i = 0x134; i <= 0x14c; i++) header = (header - rom[i] - 1) & 0xff;
	if (header !== rom[0x14d]) return false;
	let sum = 0;
	for (let i = 0; i < rom.length; i++) sum += rom[i];
	sum = (sum - rom[0x14e] - rom[0x14f]) & 0xffff;
	return sum === ((rom[0x14e] << 8) | rom[0x14f]);
}

function gbChecksumBases<T extends { file: string, size: number }>(patch: Buffer, bases: T[]): T[] {
	const hits: { base: T, changed: number }[] = [];
	for (const base of bases) {
		if (base.size > 0x800000) continue;
		try {
			const clean = fs.readFileSync(base.file);
			if (!isGB(clean)) continue;
			const rom = Buffer.from(applyPatch(patch, clean));
			if (!gbChecksumsValid(rom)) continue;
			let changed = Math.abs(rom.length - clean.length);
			const shared = Math.min(rom.length, clean.length);
			for (let i = 0; i < shared; i++) if (rom[i] !== clean[i]) changed++;
			const fixed = [0x14d, 0x14e, 0x14f].some(at => rom[at] !== clean[at]);
			if (changed && fixed) hits.push({ base, changed });
		} catch {}
	}
	return hits.sort((a, b) => a.changed - b.changed).map(hit => hit.base);
}

function baseName(base: BaseRom): string {
	return KNOWN_BASES[hex8(base.crc)] || 'a Game Boy game';
}

function readData(raw: RawHack): string {
	const changed = (raw.mechanics?.report || []).filter(entry => entry.status === 'changed').map(entry => entry.id);
	return crypto.createHash('sha256').update(JSON.stringify([
		raw.species, raw.moves, raw.abilities, raw.items, raw.itemPockets, raw.typeChart || [], changed,
	])).digest('hex');
}

function stockData(base: BaseRom, clean: Buffer): string {
	const key = `${HACK_VERSION}:${signatureStamp()}`;
	if (base.stock?.key !== key) {
		base.stock = { key, digest: readData(extractRom(clean, clean)) };
		saveBases();
	}
	return base.stock.digest;
}

function engineLost(read: RawHack, clean: Buffer): boolean {
	const same = (raw: RawHack) => (raw.mechanics?.report || []).filter(entry => entry.status === 'same').length;
	const report = read.mechanics?.report || [];
	if (report.length && same(read) * 2 >= report.length) return false;
	return same(read) * 2 < same(extractRom(clean, clean));
}

interface IpsRead { raw: RawHack; base: BaseRom }

interface IpsFit {
	base: BaseRom; clean: Buffer; raw: RawHack; rom: string; data: string; changed: boolean; kept: number;
}

function siblingBases(a: Buffer, b: Buffer): boolean {
	if (a.length !== b.length) return false;
	const limit = a.length >> 3;
	let differing = 0;
	for (let i = 0; i < a.length && differing < limit; i++) if (a[i] !== b[i]) differing++;
	return differing < limit;
}

function ipsBases(bases: BaseRom[]): BaseRom[] {
	return bases.filter(b => b.size <= 32 * 1024 * 1024);
}

function baseChoices(bases: BaseRom[]): BaseChoice[] {
	const present = new Set(ipsBases(bases).map(base => hex8(base.crc)));
	return BASE_CHOICES.filter(choice => present.has(choice.crc)).map(choice => ({ id: choice.id, name: choice.name }));
}

function baseUnknown(bases: BaseRom[]): Error {
	const choices = baseChoices(bases);
	return choices.length ? new ImportError(IPS_BASE_UNKNOWN, 'IPS_BASE_UNKNOWN', choices) : new Error(IPS_BASE_UNKNOWN);
}

export function pickedHackId(patchSha256: string, baseId: string): string {
	return crypto.createHash('sha256').update(`${patchSha256}:${baseId}`).digest('hex');
}

function choiceId(base: BaseRom): string | undefined {
	return BASE_CHOICES.find(choice => choice.crc === hex8(base.crc))?.id;
}

function storedHack(sha256: string): HackDex | null {
	if (!hackExists(sha256)) return null;
	try {
		const stored = JSON.parse(fs.readFileSync(hackPath(sha256), 'utf8'));
		if (stored.version === HACK_VERSION) return stored;
	} catch {}
	return null;
}

function reuseStored(stored: HackDex): HackDex {
	if (!fs.existsSync(fullPath(stored.sha256))) writeFull(stored);
	touchHack(stored.sha256);
	return stored;
}

function unplacedKey(bases: BaseRom[]): string {
	return `${HACK_VERSION}:${signatureStamp()}:${ipsBases(bases).map(base => hex8(base.crc)).join(',')}`;
}

function readUnplaced(bases: BaseRom[]): { key: string, patches: { [sha256: string]: number } } {
	const key = unplacedKey(bases);
	try {
		const known = JSON.parse(fs.readFileSync(UNPLACED_FILE, 'utf8'));
		if (known?.key === key && known.patches && typeof known.patches === 'object') return known;
	} catch {}
	return { key, patches: {} };
}

function rememberUnplaced(sha256: string, bases: BaseRom[]) {
	try {
		const known = readUnplaced(bases);
		delete known.patches[sha256];
		known.patches[sha256] = Date.now();
		const names = Object.keys(known.patches);
		for (const name of names.slice(0, Math.max(0, names.length - MAX_UNPLACED))) delete known.patches[name];
		fs.mkdirSync(STORE_DIR, { recursive: true });
		const tmp = `${UNPLACED_FILE}.${process.pid}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(known));
		fs.renameSync(tmp, UNPLACED_FILE);
	} catch {}
}

function placeIps(patch: Buffer, bases: BaseRom[], sha256: string): IpsRead {
	try {
		return readIps(patch, bases, sha256);
	} catch (e) {
		if (e instanceof ImportError && e.code === 'IPS_BASE_UNKNOWN') rememberUnplaced(sha256, bases);
		throw e;
	}
}

function importPicked(
	patch: Buffer, sha256: string, baseId: string, bases: BaseRom[]
): { hack?: HackDex, read?: IpsRead } {
	const small = ipsBases(bases);
	const choices = baseChoices(bases);
	const choice = choices.find(offered => offered.id === baseId);
	const crc = BASE_CHOICES.find(offered => offered.id === baseId)?.crc;
	const picked = small.find(base => hex8(base.crc) === crc);
	if (!choice || !picked) throw new ImportError(BASE_NOT_OFFERED, 'UNKNOWN_BASE', choices);
	if (!applyPatch(patch, Buffer.alloc(0)).length) throw new Error(IPS_EMPTY);
	const plain = storedHack(sha256);
	let auto = plain?.autoBase;
	let read: IpsRead | undefined;
	if (!auto && !readUnplaced(bases).patches[sha256]) {
		try {
			read = placeIps(patch, bases, sha256);
			auto = choiceId(read.base);
		} catch (e) {
			if (!(e instanceof ImportError) && gbChecksumBases(patch, small).includes(picked)) throw e;
		}
	}
	if (auto === choice.id) return plain ? { hack: reuseStored(plain) } : { read };
	const id = pickedHackId(sha256, choice.id);
	const derived = storedHack(id);
	if (derived) return { hack: reuseStored(derived) };
	fs.mkdirSync(STORE_DIR, { recursive: true });
	makeRoom(id);

	const misfit = (reason: string) => new ImportError(
		`This patch does not fit ${choice.name}: ${reason}. Choose the base game this patch was made for.`,
		'IPS_BASE_MISFIT', choices
	);
	const clean = fs.readFileSync(picked.file);
	if (!ipsBoundaryFit(patch, clean).checked) throw misfit('it changes nothing inside that game');
	const rom = Buffer.from(applyPatch(patch, clean));
	if (rom.equals(clean)) throw misfit('it changes nothing in that game');
	if (isGB(clean) ? !isGB(rom) || rom.length > GB_MAX_SIZE : isGen3(clean) !== isGen3(rom)) {
		throw misfit('the patched game is not a game of that kind any more');
	}
	let raw: RawHack;
	let hack: HackDex;
	try {
		raw = extractRom(rom, clean);
		hack = buildHackDex(raw, id, 'ips');
	} catch (e: any) {
		throw misfit(`the patched game could not be read (${String(e.message || 'unreadable').replace(/\.+$/, '')})`);
	}
	hack.patchSha256 = sha256;
	hack.pickedBase = { ...choice };
	hack.notes.push(`The base game of this IPS patch was chosen by the uploader: ${choice.name}.`);
	return { hack: storeHack(hack, raw) };
}

function readIps(patch: Buffer, bases: BaseRom[], sha256: string): IpsRead {
	if (!applyPatch(patch, Buffer.alloc(0)).length) throw new Error(IPS_EMPTY);
	const small = ipsBases(bases);
	if (!small.length) throw new Error('This server has no base games to patch.');
	let trustedError: Error | null = null;
	for (const base of gbChecksumBases(patch, small)) {
		try {
			const clean = fs.readFileSync(base.file);
			return { raw: extractRom(Buffer.from(applyPatch(patch, clean)), clean), base };
		} catch (e: any) {
			if (trustedError) continue;
			const reason = String(e.message || 'the game could not be read').replace(/\.+$/, '');
			trustedError = new Error(
				`This patch is for ${baseName(base)}, but this hack's data could not be read: ${reason}. ` +
				`It changes the game in a way this server does not understand yet.`
			);
		}
	}
	if (trustedError) throw trustedError;
	const tried = small.map(base => {
		const clean = fs.readFileSync(base.file);
		return { base, clean, matches: ipsBoundaryFit(patch, clean).matches };
	});
	const fits: IpsFit[] = [];
	for (const { base, clean, matches } of tried) {
		if (matches) continue;
		try {
			const rom = Buffer.from(applyPatch(patch, clean));
			if (rom.equals(clean)) continue;
			const raw = extractRom(rom, clean);
			const data = readData(raw);
			const changed = data !== stockData(base, clean);
			if (changed) buildHackDex(raw, sha256, 'ips');
			fits.push({
				base, clean, raw, rom: crypto.createHash('sha256').update(rom).digest('hex'), data, changed,
				kept: ipsKeptBytes(patch, clean),
			});
		} catch {}
	}
	const siblings = new Map<string, boolean>();
	const related = (a: Buffer, b: Buffer, key: string) => {
		if (!siblings.has(key)) siblings.set(key, siblingBases(a, b));
		return siblings.get(key)!;
	};
	const pairKey = (a: BaseRom, b: BaseRom) => (a.file < b.file ? `${a.file}\n${b.file}` : `${b.file}\n${a.file}`);
	const same = (a: IpsFit, b: IpsFit) => (
		a.rom === b.rom || (a.data === b.data && related(a.clean, b.clean, pairKey(a.base, b.base)))
	);
	const beats = (a: IpsFit, b: IpsFit) => {
		const fit = ipsPairFit(patch, a.clean, b.clean);
		const leads = fit.first >= fit.second * 4 + 8;
		if (related(a.clean, b.clean, pairKey(a.base, b.base))) return leads;
		if (fit.differing < IPS_MIN_SAMPLE) return false;
		if (leads) return fit.first * 8 > fit.differing;
		return fit.differing >= IPS_MIN_SAMPLE * 8 && fit.first * 1024 < fit.differing && fit.second >= 8 &&
			fit.second * 8 <= fit.differing;
	};
	const changed = fits.filter(fit => fit.changed);
	const pool = (changed.length ? changed : fits).sort((a, b) => b.kept - a.kept);
	const best = pool.find(a => pool.every(b => a === b || beats(a, b))) ||
		pool.find(a => pool.every(b => a === b || same(a, b) || beats(a, b)));
	if (!best) throw baseUnknown(bases);
	if (!best.changed) {
		const others = tried.filter(other => (
			other.base !== best.base && !related(best.clean, other.clean, pairKey(best.base, other.base))
		));
		const misses = others.reduce((sum, other) => sum + other.matches, 0);
		if (misses < Math.max(others.length, 1) * IPS_MIN_MISSES || engineLost(best.raw, best.clean)) {
			throw baseUnknown(bases);
		}
	}
	if (pool.some(other => other !== best && other.rom !== best.rom && !beats(best, other))) {
		best.raw.notes.push(
			'This IPS patch fits more than one version of its base game equally well; it was read as ' +
			`${KNOWN_BASES[hex8(best.base.crc)] || best.raw.baseGame}.`
		);
	}
	return { raw: best.raw, base: best.base };
}

export function importPatch(patch: Buffer, baseId = ''): HackDex {
	if (patch.length > MAX_PATCH_SIZE) throw new Error('The patch is larger than 96 MB.');
	const info = readPatchInfo(patch);
	const sha256 = crypto.createHash('sha256').update(patch).digest('hex');
	let placed: IpsRead | undefined;
	if (baseId) {
		requireSignatures();
		const offered = listBases();
		if (info.format === 'ips') {
			const picked = importPicked(patch, sha256, baseId, offered);
			if (picked.hack) return picked.hack;
			placed = picked.read;
		} else if (!baseChoices(offered).some(choice => choice.id === baseId)) {
			throw new ImportError(BASE_NOT_OFFERED, 'UNKNOWN_BASE', baseChoices(offered));
		}
	}
	const stored = storedHack(sha256);
	if (stored) return reuseStored(stored);

	requireSignatures();
	fs.mkdirSync(STORE_DIR, { recursive: true });
	makeRoom(sha256);
	const bases = listBases();
	let raw: RawHack | null = null;
	let autoBase: string | undefined;
	if (info.sourceCrc !== null) {
		const base = bases.find(b => b.crc === info.sourceCrc && b.size === info.sourceSize);
		if (!base) {
			const known = KNOWN_BASES[hex8(info.sourceCrc)];
			throw new Error(
				`This patch is for ${known || 'a base game'} (CRC32 ${hex8(info.sourceCrc).toUpperCase()}), ` +
				`which this server cannot patch yet.`
			);
		}
		const clean = fs.readFileSync(base.file);
		raw = extractRom(Buffer.from(applyPatch(patch, clean)), clean);
	} else if (info.format === 'xdelta') {
		requireVcdiffChecksum(patch);
		const tool = xdeltaTool();
		const tmp = path.join(os.tmpdir(), `romhack-${process.pid}-${sha256.slice(0, 16)}.xdelta`);
		let lastError: Error | null = null;
		try {
			if (tool) fs.writeFileSync(tmp, patch, { mode: 0o600 });
			const deadline = Date.now() + XDELTA_TOTAL_MILLIS;
			for (const base of bases.slice().sort((a, b) => b.size - a.size)) {
				if (Date.now() > deadline) {
					lastError = new Error('This xdelta patch could not be applied: it takes too long to run.');
					break;
				}
				let rom: Buffer;
				let clean: Buffer | null = null;
				try {
					if (tool) {
						const decoded = runXdelta(tool, base.file, tmp);
						if (!decoded) throw new Error('This xdelta patch does not fit any base game this server has.');
						rom = decoded;
					} else {
						clean = fs.readFileSync(base.file);
						rom = Buffer.from(applyPatch(patch, clean));
					}
				} catch (e: any) {
					if (!lastError || /secondary compression/.test(e.message)) lastError = e;
					continue;
				}
				raw = extractRom(rom, clean || fs.readFileSync(base.file));
				break;
			}
		} finally {
			if (tool) fs.rmSync(tmp, { force: true });
		}
		if (!raw) throw lastError || new Error('This server has no base games to patch.');
	} else if (info.format === 'ips') {
		const read = placed || placeIps(patch, bases, sha256);
		raw = read.raw;
		autoBase = choiceId(read.base);
	} else {
		let lastError: Error | null = null;
		const deadline = Date.now() + BSP_TOTAL_MILLIS;
		for (const base of bases.filter(b => b.size <= 32 * 1024 * 1024).sort((a, b) => a.size - b.size)) {
			const millis = deadline - Date.now();
			if (millis <= 0) {
				lastError = new Error('This BSP patch could not be applied: it takes too long to run.');
				break;
			}
			try {
				const clean = fs.readFileSync(base.file);
				raw = extractRom(Buffer.from(applyPatch(patch, clean, { millis })), clean);
				break;
			} catch (e: any) {
				lastError = e;
				if (/takes too long/.test(e.message)) break;
			}
		}
		if (!raw) throw lastError || new Error('This server has no base games to patch.');
	}
	const built = buildHackDex(raw, sha256, info.format);
	if (autoBase) built.autoBase = autoBase;
	return storeHack(built, raw);
}

function storeHack(hack: HackDex, raw: RawHack): HackDex {
	const sha256 = hack.sha256;
	const info = { format: hack.patchFormat };
	if (raw.rom) {
		try {
			const spriteDir = path.join(STORE_DIR, sha256);
			fs.rmSync(spriteDir, { recursive: true, force: true });
			if (isGen3(raw.rom)) hack.sprites = extractGen3Sprites(raw.rom, hack.indices, spriteDir, raw.speciesTable);
			else if (isNDS(raw.rom)) hack.sprites = extractNDSSprites(raw.rom, hack.indices, spriteDir);
			else if (isGB(raw.rom) && isPrism(raw.rom)) hack.sprites = extractPrismSprites(raw.rom, hack.indices, spriteDir);
			else if (isGB(raw.rom)) hack.sprites = extractGBSprites(raw.rom, hack.indices, spriteDir);
		} catch {}
		if (info.format === 'ips' && isGen3(raw.rom) && raw.rom.length <= 0x1000000 && !hack.sprites?.pokemon) {
			hack.notes.push(
				'No Pokemon sprites could be read from this patch. An IPS patch cannot reach past 16 MB, so a larger game ' +
				'loses its upper half; use the UPS or BPS patch of this hack if it has one.'
			);
		}
		if (hack.sprites?.overworld) {
			try {
				hack.sprites.overworldIds = fs.readdirSync(path.join(STORE_DIR, sha256, 'overworld'))
					.filter(file => file.endsWith('.png')).map(file => file.slice(0, -4)).sort();
			} catch {}
		}
	}
	const stored = JSON.stringify(hack);
	if (stored.length > MAX_HACK_JSON) {
		fs.rmSync(path.join(STORE_DIR, sha256), { recursive: true, force: true });
		throw new Error('This hack holds more data than this server stores for one game.');
	}
	const tmp = `${hackPath(sha256)}.${process.pid}.tmp`;
	fs.writeFileSync(tmp, stored);
	fs.renameSync(tmp, hackPath(sha256));
	writeFull(hack);
	recordUsage(sha256);
	return hack;
}

function send(res: http.ServerResponse, status: number, body: string | Buffer) {
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Cache-Control': 'no-store',
	});
	res.end(body);
}

let activeImports = 0;
const recentUploads = new Map<string, number[]>();
const importTimes: number[] = [];
const incoming = new Set<string>();

let trustedProxy: ((ip: string) => boolean) | null = null;

function clientAddress(req: http.IncomingMessage): string {
	const direct = req.socket.remoteAddress || 'unknown';
	if (!trustedProxy) {
		const proxies = typeof Config === 'undefined' ? null : Config.proxyip;
		trustedProxy = proxies ? (require('../ip-tools') as typeof import('../ip-tools')).IPTools.checker(proxies) : () => false;
	}
	const plain = (ip: string) => ip.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
	if (!trustedProxy(plain(direct))) return direct;
	for (const hop of String(req.headers['x-forwarded-for'] || '').split(',').reverse()) {
		const ip = hop.trim();
		if (ip && !trustedProxy(plain(ip))) return ip;
	}
	return direct;
}

function addressKey(req: http.IncomingMessage): string {
	const ip = clientAddress(req).split('%')[0].toLowerCase();
	const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
	if (mapped) return mapped[1];
	if (!ip.includes(':')) return ip;
	const [head, tail] = ip.split('::');
	const left = head ? head.split(':') : [];
	const right = tail ? tail.split(':') : [];
	const gap = tail === undefined ? 0 : Math.max(0, 8 - left.length - right.length);
	const groups = [...left, ...new Array<string>(gap).fill('0'), ...right];
	return `${groups.slice(0, 4).map(group => group.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

function originAllowed(req: http.IncomingMessage): boolean {
	const origin = req.headers.origin;
	if (!origin) return true;
	const site = (host: string) => host.split(':')[0].toLowerCase().split('.').slice(-2).join('.');
	try {
		const from = new URL(origin).hostname;
		return from === 'localhost' || from === '127.0.0.1' || site(from) === site(String(req.headers.host || ''));
	} catch {
		return false;
	}
}

function uploadAllowed(key: string): string | null {
	const now = Date.now();
	const times = (recentUploads.get(key) || []).filter(time => now - time < UPLOAD_WINDOW_MILLIS);
	if (times.length >= UPLOADS_PER_WINDOW) return 'Too many patches from this address. Try again in a few minutes.';
	if (incoming.has(key)) return 'Another patch from this address is still arriving. Wait for it to finish.';
	if (incoming.size >= MAX_INCOMING) return 'The server is busy reading other patches. Try again in a minute.';
	if (!recentUploads.has(key) && recentUploads.size >= MAX_TRACKED_ADDRESSES) {
		for (const [other, stamps] of recentUploads) {
			if (now - stamps[stamps.length - 1] >= UPLOAD_WINDOW_MILLIS) recentUploads.delete(other);
		}
		for (const [other, stamps] of recentUploads) {
			if (recentUploads.size < MAX_TRACKED_ADDRESSES) break;
			if (stamps.length < UPLOADS_PER_WINDOW) recentUploads.delete(other);
		}
		if (recentUploads.size >= MAX_TRACKED_ADDRESSES) return 'The server is busy reading other patches. Try again in a minute.';
	}
	times.push(now);
	recentUploads.delete(key);
	recentUploads.set(key, times);
	return null;
}

function importAllowed(): boolean {
	const now = Date.now();
	while (importTimes.length && now - importTimes[0] >= 60 * 60 * 1000) importTimes.shift();
	if (activeImports >= 2 || importTimes.length >= IMPORTS_PER_HOUR) return false;
	importTimes.push(now);
	return true;
}

export function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): boolean {
	const url = (req.url || '').split('?')[0];
	if (!url.startsWith('/romhacks/')) return false;
	if (req.method === 'OPTIONS') {
		req.resume();
		send(res, 204, '');
		return true;
	}
	const get = /^\/romhacks\/([0-9a-f]{64})(\.full)?\.json$/.exec(url);
	if (req.method === 'GET' && get) {
		req.resume();
		const file = get[2] ? fullPath(get[1]) : hackPath(get[1]);
		if (!hackExists(get[1]) || !fs.existsSync(file)) {
			send(res, 404, JSON.stringify({ error: 'Nobody has uploaded this patch to this server yet.' }));
		} else {
			touchHack(get[1]);
			send(res, 200, fs.readFileSync(file));
		}
		return true;
	}
	const sprite = /^\/romhacks\/([0-9a-f]{64})\/sprites\/([a-z-]{1,16})\/([a-z0-9]{1,40})\.png$/.exec(url);
	if (req.method === 'GET' && sprite) {
		req.resume();
		const file = path.join(STORE_DIR, sprite[1], sprite[2], `${sprite[3]}.png`);
		if (!fs.existsSync(file)) {
			send(res, 404, JSON.stringify({ error: 'Not found.' }));
		} else {
			res.writeHead(200, {
				'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'public, max-age=3600',
			});
			res.end(fs.readFileSync(file));
		}
		return true;
	}
	if (req.method === 'POST' && url === '/romhacks/upload') {
		const key = addressKey(req);
		const baseId = new URLSearchParams((req.url || '').split('?').slice(1).join('?')).get('base') || '';
		let status = 429;
		let refusal: string | null = null;
		if (!originAllowed(req)) {
			status = 403;
			refusal = 'Patches can only be uploaded from this site.';
		} else if (!/^[a-z0-9-]{0,32}$/.test(baseId)) {
			req.resume();
			send(res, 400, JSON.stringify({ error: BASE_NOT_OFFERED, code: 'UNKNOWN_BASE' }));
			return true;
		} else if (storeFull()) {
			status = 503;
			refusal = STORE_FULL;
		} else {
			refusal = uploadAllowed(key);
		}
		if (refusal) {
			req.resume();
			send(res, status, JSON.stringify({ error: refusal }));
			return true;
		}
		incoming.add(key);
		const tmp = path.join(os.tmpdir(), `romhack-upload-${process.pid}-${crypto.randomBytes(12).toString('hex')}`);
		const file = fs.createWriteStream(tmp, { mode: 0o600 });
		let size = 0;
		let settled = false;
		const settle = () => {
			if (settled) return false;
			settled = true;
			clearTimeout(deadline);
			clearTimeout(idle);
			incoming.delete(key);
			return true;
		};
		const fail = (code: number, error: string) => {
			if (!settle()) return;
			req.unpipe(file);
			file.destroy();
			fs.rmSync(tmp, { force: true });
			if (!res.headersSent) send(res, code, JSON.stringify({ error }));
			req.destroy();
		};
		const late = () => fail(408, 'The patch took too long to arrive.');
		const deadline = setTimeout(late, BODY_MILLIS);
		const idle = setTimeout(late, BODY_IDLE_MILLIS);
		req.on('data', (chunk: Buffer) => {
			idle.refresh();
			size += chunk.length;
			if (size > MAX_PATCH_SIZE) fail(413, 'The patch is larger than 96 MB.');
		});
		req.on('close', () => {
			if (!req.complete) fail(400, 'The patch did not arrive.');
		});
		file.on('error', () => fail(500, 'The patch could not be stored for reading.'));
		file.on('finish', () => {
			if (!settle()) return;
			if (!importAllowed()) {
				fs.rmSync(tmp, { force: true });
				send(res, 429, JSON.stringify({ error: 'The server is busy reading other patches. Try again in a minute.' }));
				return;
			}
			activeImports++;
			const args = [`--max-old-space-size=${IMPORT_HEAP_MB}`, path.join(__dirname, 'cli.js'), tmp, baseId];
			child_process.execFile(process.execPath, args, {
				maxBuffer: 1024 * 1024, timeout: IMPORT_MILLIS, killSignal: 'SIGKILL',
			}, (err, stdout) => {
				activeImports--;
				fs.rmSync(tmp, { force: true });
				let result: { sha256?: string, error?: string, code?: string, bases?: BaseChoice[] } = {};
				try {
					result = JSON.parse(stdout);
				} catch {}
				if (result.sha256 && hackExists(result.sha256)) {
					const stored = fs.readFileSync(hackPath(result.sha256), 'utf8');
					send(res, 200, `{"proof":"${proofFor(result.sha256)}",${stored.slice(1)}`);
				} else {
					const error = result.error || 'The patch could not be read.';
					const code = typeof result.code === 'string' ? result.code : undefined;
					const bases = code && Array.isArray(result.bases) ? result.bases : undefined;
					send(res, error === STORE_FULL ? 503 : 400, JSON.stringify({ error, code, bases }));
				}
			});
		});
		req.pipe(file);
		return true;
	}
	req.resume();
	send(res, 404, JSON.stringify({ error: 'Not found.' }));
	return true;
}
