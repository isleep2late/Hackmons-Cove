/**
 * Gate: the replay page shell keeps upstream's inline stylesheet.
 *
 * replay.hackmons.com pages are built by deploy/phnn-client-server.js, not by upstream's
 * replay.pokemonshowdown.com/index.php. The viewer's layout rules (the (max-width:820px)
 * rule that puts the battle log under the battle on phones, the control rows, the page
 * centering) live in index.php's <style> block, so the shell carries a verbatim copy. An
 * upstream sync updates index.php and nothing else; this is the only thing that notices
 * when the copy falls behind. Static: it reads both files and compares text.
 */

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const indexPhp = fs.readFileSync(path.join(repoRoot, 'replay.pokemonshowdown.com/index.php'), 'utf8');
const server = fs.readFileSync(path.join(repoRoot, 'deploy/phnn-client-server.js'), 'utf8');

function styleBlock(html) {
	const m = /^<style>\n([\s\S]*?)^<\/style>/m.exec(html);
	assert.ok(m, 'index.php has a top-level <style> block');
	return m[1];
}
function serverLiteral(source) {
	const m = /^const UPSTREAM_REPLAY_STYLE = `([\s\S]*?)`;$/m.exec(source);
	assert.ok(m, 'deploy/phnn-client-server.js defines UPSTREAM_REPLAY_STYLE as a template literal');
	return m[1];
}

describe('replay page shell', () => {
	it('inlines index.php\'s <style> block verbatim', () => {
		const expected = styleBlock(indexPhp);
		const actual = serverLiteral(server);
		assert.ok(expected.includes('@media (max-width:820px)'), 'index.php still carries the narrow-screen rule');
		assert.equal(actual, expected, 'UPSTREAM_REPLAY_STYLE has drifted from index.php: re-copy the block');
	});

	it('does not link the old embed stylesheet', () => {
		const fn = /function upstreamReplayHtml\([\s\S]*?\n}\n/.exec(server);
		assert.ok(fn, 'upstreamReplayHtml is defined');
		assert.ok(!/['"]\/style\/replay\.css['"]/.test(fn[0]),
			'replay.css pins .replay-controls at top:373px and belongs to replay-embed.js only');
		assert.ok(fn[0].includes('UPSTREAM_REPLAY_STYLE') && fn[0].includes('PHNN_REPLAY_NAV_GUARD'),
			'the shell emits the inline stylesheet and the navigation guard');
	});
});
