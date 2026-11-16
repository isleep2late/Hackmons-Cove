import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const SIGNATURES_FILE = process.env.PHNN_ROMHACK_SIGNATURES || path.join(ROOT, 'config/romhack-signatures.json');
const FORMAT = 1;
const SECTION_SHAPES: { [section: string]: string } = {
	gen1: '15c66cae8f7b0e275ad981baf2fceeaeb295c913a9da34005ac1eeb9262c6a69',
	gen2: '1555d88546d4d8f035f30b17f73e6971a4205e1aa2b0880ee0a34b2aa34b3c51',
	gen3: 'c1663aba1a86d8ec1c2721715c98f40de5bc216ef1209cf68bafa20860feadba',
	nds: '88cd8f90a8a903cd1c265b55ed8829a52acc83b42d4888f9a811be15ba6d8797',
	anchors: 'a8a37497460b28af5242bbdfc39e811cbd7abafce1a6e5b92b1ecca2583065de',
};

export const SIGNATURES_MISSING =
	'ROM hack signature data is not installed on this server (config/romhack-signatures.json)';

export type SignatureSection = 'gen1' | 'gen2' | 'gen3' | 'nds' | 'anchors';
export type Anchors = { [name: string]: number[] };

let loaded: { [section: string]: unknown } | null = null;
let problem = '';

function shapeOf(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(shapeOf).join(',')}]`;
	if (value && typeof value === 'object') {
		const record = value as { [key: string]: unknown };
		return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${shapeOf(record[key])}`).join(',')}}`;
	}
	if (value === null) return 'n';
	if (typeof value === 'string') return 's';
	if (typeof value === 'number') return 'd';
	if (typeof value === 'boolean') return 'b';
	return '?';
}

function shapeDigest(value: unknown): string {
	return crypto.createHash('sha256').update(shapeOf(value)).digest('hex');
}

function load(): { [section: string]: unknown } | null {
	if (loaded) return loaded;
	try {
		const data = JSON.parse(fs.readFileSync(SIGNATURES_FILE, 'utf8'));
		if (!data || typeof data !== 'object' || data.format !== FORMAT) {
			throw new Error(`the file is not signature format ${FORMAT}`);
		}
		const sections = data.sections;
		if (!sections || typeof sections !== 'object') throw new Error('the file has no sections');
		for (const name in SECTION_SHAPES) {
			const found = shapeDigest(sections[name]);
			if (found !== SECTION_SHAPES[name]) {
				throw new Error(`section ${name} has shape ${found}, this server expects ${SECTION_SHAPES[name]}`);
			}
		}
		loaded = sections;
		problem = '';
	} catch (err) {
		problem = `${SIGNATURES_FILE}: ${err instanceof Error ? err.message : String(err)}`;
	}
	return loaded;
}

export function signatureProblem(): string {
	return load() ? '' : problem;
}

export function requireSignatures() {
	if (!load()) throw new Error(SIGNATURES_MISSING);
}

export function signatureSection<T>(name: SignatureSection): T {
	const sections = load();
	if (!sections) throw new Error(SIGNATURES_MISSING);
	return sections[name] as T;
}

export function signatureAnchor(name: string): Buffer {
	const bytes = signatureSection<Anchors>('anchors')[name];
	if (!Array.isArray(bytes)) throw new Error(SIGNATURES_MISSING);
	return Buffer.from(bytes);
}
