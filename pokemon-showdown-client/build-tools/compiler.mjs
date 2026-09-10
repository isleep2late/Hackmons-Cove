/**
 * Tiny wrapper around babel/core to do most of the things babel-cli does,
 * plus incremental compilation
 *
 * Adds one option in addition to babel's built-in options: `incremental`
 *
 * Heavily copied from `babel-cli`: https://github.com/babel/babel/tree/main/packages/babel-cli
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license MIT
 */

import * as babel from '@babel/core';
import fs from 'node:fs';
import path from 'node:path';
import sourceMap from 'source-map';

const VERBOSE = false;

function outputFileSync(filePath, res, opts) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });

	// we've requested explicit sourcemaps to be written to disk
	if (
		res.map &&
		opts.sourceMaps &&
		opts.sourceMaps !== "inline"
	) {
		const mapLoc = filePath + ".map";
		res.code += "\n//# sourceMappingURL=" + path.basename(mapLoc);
		res.map.file = path.basename(filePath);
		fs.writeFileSync(mapLoc, JSON.stringify(res.map));
	}

	fs.writeFileSync(filePath, res.code);
}

function slash(filePath) {
	const isExtendedLengthPath = /^\\\\\?\\/.test(filePath);
	const hasNonAscii = /[^\u0000-\u0080]+/.test(filePath);

	if (isExtendedLengthPath || hasNonAscii) {
		return filePath;
	}

	return filePath.replace(/\\/g, '/');
}

async function combineResults(fileResults, sourceMapOptions, opts) {
	let map = null;
	if (fileResults.some(result => result?.map)) {
		map = new sourceMap.SourceMapGenerator(sourceMapOptions);
	}

	let code = "";
	let offset = 0;

	for (const result of fileResults) {
		if (!result) continue;

		code += result.code + "\n";

		if (result.map) {
			const consumer = await new sourceMap.SourceMapConsumer(result.map);
			const sources = new Set();

			consumer.eachMapping(mapping => {
				if (mapping.source != null) sources.add(mapping.source);

				map.addMapping({
					generated: {
						line: mapping.generatedLine + offset,
						column: mapping.generatedColumn,
					},
					source: mapping.source,
					original:
						mapping.source == null ?
							null : {
								line: mapping.originalLine,
								column: mapping.originalColumn,
							},
				});
			});

			for (const source of sources) {
				const content = consumer.sourceContentFor(source, true);
				if (content !== null) {
					map.setSourceContent(source, content);
				}
			}

			offset = code.split("\n").length - 1;
		}
	}

	if (opts.sourceMaps === "inline") {
		const json = JSON.stringify(map);
		const base64 = Buffer.from(json, 'utf8').toString('base64');
		code += "\n//# sourceMappingURL=data:application/json;charset=utf-8;base64," + base64;
	}

	return { map, code };
}

/**
 * Newest ctime across the build configuration - everything under build-tools/ plus .babelrc.
 * Compiled output is a function of (source, build configuration), so comparing only the source
 * leaves output stale forever when the configuration changes and the source does not. That is a
 * real defect, not a theoretical one: adding build-tools/babel-plugin-scope-template-cache.cjs on
 * 2026-09-10 left panel-chat.js (compiled 2026-08-23) and panel-chat-tournament.js (2026-08-03)
 * declaring a bare `var _templateObject` in the shared global scope, and no rebuild ever fixed
 * them because their sources had not changed. Computed once per process - the build compiles
 * hundreds of files and this walk should not be repeated for each one.
 */
let buildConfigCtimeMsCache = null;
function buildConfigCtimeMs() {
	if (buildConfigCtimeMsCache !== null) return buildConfigCtimeMsCache;
	const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
	let newest = 0;
	const visit = entryPath => {
		let stat;
		try {
			stat = fs.statSync(entryPath);
		} catch {
			return;
		}
		if (stat.ctimeMs > newest) newest = stat.ctimeMs;
		if (!stat.isDirectory()) return;
		let names;
		try {
			names = fs.readdirSync(entryPath);
		} catch {
			return;
		}
		// node_modules under build-tools would dominate the walk and never affects output here.
		for (const name of names) {
			if (name === 'node_modules') continue;
			visit(path.join(entryPath, name));
		}
	};
	visit(path.join(root, 'build-tools'));
	visit(path.join(root, '.babelrc'));
	buildConfigCtimeMsCache = newest;
	return newest;
}

function noRebuildNeeded(src, dest) {
	try {
		const srcStat = fs.statSync(src, { throwIfNoEntry: false });
		if (!srcStat) return true;
		const destStat = fs.statSync(dest);
		if (srcStat.ctimeMs < destStat.ctimeMs && buildConfigCtimeMs() < destStat.ctimeMs) return true;
	} catch {}

	return false;
}

function compileToDir(srcDir, destDir, opts = {}) {
	const incremental = opts.incremental;
	delete opts.incremental;

	function handleFile(src, base) {
		let relative = path.relative(base, src);

		if (!relative.endsWith('.ts') && !relative.endsWith('.tsx')) {
			return 0;
		}
		if (relative.endsWith('.d.ts')) return 0;

		relative = relative.slice(0, relative.endsWith('.tsx') ? -4 : -3) + '.js';

		const dest = path.join(destDir, relative);

		if (incremental && noRebuildNeeded(src, dest)) return 0;

		const res = babel.transformFileSync(src, {
			...opts,
			sourceFileName: slash(path.relative(dest + "/..", src)),
		});

		if (!res) return 0;

		outputFileSync(dest, res, opts);
		fs.chmodSync(dest, fs.statSync(src).mode);

		if (VERBOSE) {
			console.log(src + " -> " + dest);
		}

		return 1;
	}

	function handle(src, base) {
		const stat = fs.statSync(src, { throwIfNoEntry: false });

		if (!stat) return 0;

		if (stat.isDirectory()) {
			if (!base) base = src;

			let count = 0;

			const files = fs.readdirSync(src);
			for (const filename of files) {
				if (filename.startsWith('.')) continue;

				const srcFile = path.join(src, filename);

				count += handle(srcFile, base);
			}

			return count;
		} else {
			if (!base) base = path.dirname(src);
			return handleFile(src, base);
		}
	}

	let total = 0;
	fs.mkdirSync(destDir, { recursive: true });
	const srcDirs = typeof srcDir === 'string' ? [srcDir] : srcDir;
	for (const dir of srcDirs) total += handle(dir);
	if (incremental) opts.incremental = true; // incredibly dumb hack to preserve the option
	return total;
}

function compileToFile(srcFile, destFile, opts) {
	const incremental = opts.incremental;
	delete opts.incremental;

	const srcFiles = typeof srcFile === 'string' ? [srcFile] : srcFile;

	if (incremental && srcFiles.every(src => noRebuildNeeded(src, destFile))) {
		opts.incremental = true; // incredibly dumb hack to preserve the option
		return 0;
	}

	const results = [];

	for (const src of srcFiles) {
		if (!fs.existsSync(src)) continue;

		const res = babel.transformFileSync(src, opts);

		if (res) results.push(res);

		if (VERBOSE) console.log(src + " ->");
	}

	combineResults(results, {
		file: path.basename(destFile),
		sourceRoot: opts.sourceRoot,
	}, opts).then(combined => {
		outputFileSync(destFile, combined, opts);
	});

	if (VERBOSE) console.log("-> " + destFile);
	if (incremental) opts.incremental = true; // incredibly dumb hack to preserve the option
	return results.length;
}

export { compileToDir, compileToFile };
