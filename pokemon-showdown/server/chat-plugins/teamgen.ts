import { Net, Utils } from '../../lib';

const TEAMGEN_TIMEOUT = 45 * 1000;

function teamgenUrl(): string | null {
	if (Config.teamgenurl) return Config.teamgenurl;
	if (!Config.replayuploadurl) return null;
	try {
		return new URL('/teamgen', Config.replayuploadurl).href;
	} catch {
		return null;
	}
}

function canGenerateTeam(user: User, room: Room | null) {
	return room ? room.auth.atLeast(user, '+') : Users.globalAuth.atLeast(user, '+');
}

function teamBox(formatName: string, team: PokemonSet[], dex: ModdedDex) {
	const sets = team.map(set => {
		set.moves = set.moves.map(move => dex.moves.get(move).name);
		if (set.item) set.item = dex.items.get(set.item).name;
		const label = Utils.escapeHTML(set.name || set.species);
		return `<details class="details"><summary>${label}</summary>${Utils.escapeHTML(Teams.exportSet(set))}<br /></details>`;
	}).join('');
	return `<strong>Team for ${Utils.escapeHTML(formatName)}</strong>:${sets}`;
}

async function fetchGeneratedTeam(formatid: string): Promise<PokemonSet[]> {
	const url = teamgenUrl();
	if (!url) throw new Chat.ErrorMessage(`The team generator is not set up on this server.`);
	let raw: string;
	try {
		raw = await Net(url).get({ query: { format: formatid }, timeout: TEAMGEN_TIMEOUT });
	} catch (err: any) {
		raw = err?.body || '';
		if (!raw) throw new Chat.ErrorMessage(`The team generator could not be reached. Try again in a moment.`);
	}
	let data: AnyObject;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Chat.ErrorMessage(`The team generator sent back something unreadable. Try again in a moment.`);
	}
	if (data.error || !data.team) {
		throw new Chat.ErrorMessage(`Couldn't build a team: ${data.error || 'the generator returned no team.'}`);
	}
	const team = Teams.unpack(data.team);
	if (!team?.length) throw new Chat.ErrorMessage(`Couldn't build a team: the generator returned no team.`);
	return team;
}

export const commands: Chat.ChatCommands = {
	genteam: 'generateteam',
	buildteam: 'generateteam',
	async generateteam(target, room, user) {
		if (!canGenerateTeam(user, room)) {
			throw new Chat.ErrorMessage(`/${this.cmd} - Access denied: requires + (voice) or higher.`);
		}
		this.runBroadcast(true);

		if (!target.trim()) return this.parse('/help generateteam');
		const format = Dex.formats.get(target);
		if (format.effectType !== 'Format') throw new Chat.ErrorMessage(`"${target}" is not a recognized format.`);
		const dex = Dex.forFormat(format);

		const team = format.team ? Teams.getGenerator(format).getTeam() : await fetchGeneratedTeam(format.id);
		this.sendReplyBox(teamBox(format.name, team, dex));
	},
	generateteamhelp: [
		`/genteam [format] - Generates a team for the given format, random or bring-your-own. Also /buildteam. Use !genteam to show it to the room. Requires: + % @ # ~`,
	],
};
