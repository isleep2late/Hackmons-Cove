import fs from 'node:fs';
import * as compiler from './build-tools/compiler.mjs';

const compileOpts = Object.assign(eval('(' + fs.readFileSync('.babelrc') + ')'), {
	babelrc: false,
	incremental: false,
	ignore: ['play.pokemonshowdown.com/src/battle-animations.js', 'play.pokemonshowdown.com/src/battle-animations-moves.js'],
});

try {
	fs.statSync('play.pokemonshowdown.com/data/graphics.js');
	delete compileOpts.ignore;
} catch {}

let compiledFiles = 0;
compiledFiles += compiler.compileToDir(`play.pokemonshowdown.com/src`, `play.pokemonshowdown.com/js`, compileOpts);
compiledFiles += compiler.compileToDir(`replay.pokemonshowdown.com/src`, `replay.pokemonshowdown.com/js`, compileOpts);
compiledFiles += compiler.compileToDir(`teams.pokemonshowdown.com/src`, `teams.pokemonshowdown.com/js`, compileOpts);

fs.cpSync('play.pokemonshowdown.com/src/oldclient', 'play.pokemonshowdown.com/js/oldclient', {
	recursive: true,
	force: true,
});

try {
	fs.statSync('play.pokemonshowdown.com/data/text.js');
	compiledFiles += compiler.compileToFile(
		[
			'play.pokemonshowdown.com/src/battle-dex.ts',
			'play.pokemonshowdown.com/src/battle-teams.ts',
			'play.pokemonshowdown.com/src/battle-dex-data.ts',
			'play.pokemonshowdown.com/src/battle-log.ts',
			'play.pokemonshowdown.com/src/battle-log-misc.js',
			'caches/pokemon-showdown/server/chat-formatter.ts',
			'play.pokemonshowdown.com/data/text.js',
			'play.pokemonshowdown.com/data/text-afd.js',
			'play.pokemonshowdown.com/src/battle-text-parser.ts',
		],
		'play.pokemonshowdown.com/js/battledata.js',
		compileOpts
	);
} catch {}

if (!compileOpts.ignore) {
	compiledFiles += compiler.compileToFile(
		['play.pokemonshowdown.com/src/battle-animations.ts', 'play.pokemonshowdown.com/src/battle-animations-moves.ts'],
		'play.pokemonshowdown.com/data/graphics.js',
		compileOpts
	);
}
console.log(`Successfully compiled ${compiledFiles} files.`);
