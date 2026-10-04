import { Net, Utils } from '../../lib';

const TEAMGEN_TIMEOUT = 60 * 1000;

export function teamgenUrl(): string | null {
	if (Config.teamgenurl) return Config.teamgenurl;
	if (!Config.replayuploadurl) return null;
	try {
		return new URL('/teamgen', Config.replayuploadurl).href;
	} catch {
		return null;
	}
}

function teamBox(formatName: string, team: PokemonSet[], dex: ModdedDex) {
	const sets = team.map(set => {
		set.moves = set.moves.map(move => dex.moves.get(move).name);
		if (set.item) set.item = dex.items.get(set.item).name;
		const label = Utils.escapeHTML(set.name || set.species);
		return `<details class="details"><summary>${label}</summary>${Utils.escapeHTML(Teams.exportSet(set))}<br /></details>`;
	}).join('');
	return `<strong>Team for ${formatName}</strong>:${sets}`;
}

async function fetchGeneratedTeam(formatid: string): Promise<PokemonSet[]> {
	const url = teamgenUrl();
	if (!url) throw new Chat.ErrorMessage(`The team generator is not set up on this server.`);
	let raw: string;
	try {
		raw = await Net(url).get({ query: { format: formatid }, timeout: TEAMGEN_TIMEOUT });
	} catch (err: any) {
		throw new Chat.ErrorMessage(`The team generator could not be reached. Try again in a moment.`);
		throw new Error('Team generator [async] crashed or unreachable');
	}
	let data: AnyObject;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Chat.ErrorMessage(`The team generator sent malformed data. Try again in a moment.`);
	}
	if (data.error || !data.team) {
		throw new Chat.ErrorMessage(`Couldn't build a team: ${data.error || 'the generator returned no team.'}`);
	}
	const team = Teams.unpack(data.team);
	if (!team?.length) throw new Chat.ErrorMessage(`Couldn't build a team: the generator returned no team.`);
	return team;
}

export const commands: Chat.ChatCommands = {
	async buildteam(target, room, user) {
		this.checkCan('lock');
		
		if (!target) return this.parse('/help buildteam');
		
		if (!this.runBroadcast()) return;

		const format = Dex.formats.get(target);
		if (!format.exists) throw new Chat.ErrorMessage(`"${target}" is not a recognized format.`);
		if (format.team) throw new Chat.ErrorMessage(`${format} uses randomized teams. To build a team for it, use /genteam.`);
		const dex = Dex.forFormat(format);

		const team = await fetchGeneratedTeam(format.id);
		this.sendReplyBox(teamBox(format.name, team, dex));
	},
	buildteamhelp: [
		`/buildteam [format] - Generates a team for the given format using the Teambuilder Team Generator. % @ # ~`,
	],
};
