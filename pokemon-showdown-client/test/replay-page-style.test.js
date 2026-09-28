const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const indexPhp = fs.readFileSync(path.join(repoRoot, 'replay.pokemonshowdown.com/index.php'), 'utf8');
const server = fs.readFileSync(path.join(repoRoot, 'deploy/phnn-client-server.js'), 'utf8');
const viewer = fs.readFileSync(path.join(repoRoot, 'replay.pokemonshowdown.com/src/replays-battle.tsx'), 'utf8');

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

	it('builds the share link from our own replay host', () => {
		const fn = /\n\tshareURL\(\) \{\n[\s\S]*?\n\t\}\n/.exec(viewer);
		assert.ok(fn, 'shareURL is defined in the viewer');
		const code = fn[0].split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
		assert.ok(!code.includes('psim.us'),
			'psim.us is upstream\'s short domain: it has none of our replays and would be handed private replay passwords');
		assert.ok(code.includes('https://${Config.routes.replays}/${fullid}'),
			'the share link is built from Config.routes.replays');
	});

	it('keeps the play client on our own replay hosts', () => {
		const code = file => fs.readFileSync(path.join(repoRoot, file), 'utf8')
			.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
		const chat = code('play.pokemonshowdown.com/src/panel-chat.tsx');
		assert.ok(!chat.includes('psim.us/r/'), 'the replay link box must not hand replay ids to psim.us');
		assert.ok(chat.includes('https://${Config.routes.replays}/${room.id.slice(7)}'),
			'the replay link box is built from Config.routes.replays');
		const battle = code('play.pokemonshowdown.com/src/panel-battle.tsx');
		assert.ok(!/Net\(`https:\/\/replay\.pokemonshowdown\.com/.test(battle),
			'an expired battle must look for its replay in our store, not upstream\'s');
		assert.ok(battle.includes('Net(`/replays/${replayid}.json`)'), 'the replay is fetched from the client\'s own origin');
		const panels = code('play.pokemonshowdown.com/src/panels.tsx');
		assert.ok(!panels.includes('psim.us/r/') && !panels.includes('replay.pokemonshowdown.com'),
			'clicked links are intercepted for our replay host, not upstream\'s');
		assert.ok(panels.includes('const replayHost = `${Config.routes.replays}/`;'), 'the intercept is built from Config.routes.replays');
		const old = code('play.pokemonshowdown.com/src/oldclient/client.js');
		assert.ok(!old.includes("replayid = Config.server.id + '-' + replayid"), 'our store keeps replay ids unprefixed');
		assert.ok(old.includes("$.ajax('/replays/' + replayid + '.json'"), 'the old client fetches the replay from its own origin');
	});

	it('ships bundles without upstream replay hosts', () => {
		const js = path.join(repoRoot, 'play.pokemonshowdown.com/js');
		if (!fs.existsSync(js)) return; // nothing built yet in this checkout
		for (const name of ['panel-chat.js', 'panel-battle.js', 'panels.js']) {
			const file = path.join(js, name);
			if (!fs.existsSync(file)) continue;
			const built = fs.readFileSync(file, 'utf8');
			assert.ok(!built.includes('psim.us/r') && !built.includes('replay.pokemonshowdown.com/'),
				`${name} was built before the source changed: run \`node build\``);
		}
	});
});
