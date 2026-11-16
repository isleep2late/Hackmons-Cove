import * as fs from 'fs';
import { importPatch } from './index';

try {
	const hack = importPatch(fs.readFileSync(process.argv[2]));
	process.stdout.write(JSON.stringify({ sha256: hack.sha256 }));
} catch (e: any) {
	process.stdout.write(JSON.stringify({ error: String(e?.message || e) }));
}
process.exit(0);
