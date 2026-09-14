/**
 * Rated registries.
 *
 * Staff commands that label the next battle a player starts, so a league or
 * tournament game is announced as one instead of as an ordinary challenge.
 *
 * HOW THE LABEL ACTUALLY TRAVELS, because it is not obvious and it decides
 * every rule below:
 *
 *   /hpl            -> user.battleSettings.special = 'Hackmons Premier League'
 *   rooms.ts        -> both players' `special` must be IDENTICAL, or the battle
 *                      is refused and both get a "settings don't match" popup;
 *                      it then becomes options.ratedMessage and is CLEARED from
 *                      both users, so the registration is one battle only
 *   room-battle.ts  -> battleOptions.rated = ratedMessage
 *   sim/battle.ts   -> this.add('rated', <the string>)
 *   the client      -> renders |rated|<string> as the battle's banner
 *
 * Two consequences worth stating in the replies rather than letting people
 * discover them:
 *
 * 1. BOTH PLAYERS have to run the same command before the challenge. One side
 *    alone does not produce a mismatch message at the time of typing - it
 *    produces a refused battle later.
 * 2. It only survives on an UNRATED, non-tournament battle. room-battle.ts
 *    overwrites ratedMessage with 'Rated battle' when the battle is rated and
 *    with 'Tournament battle' when it is inside a tour, so a ladder game or a
 *    /tour game will never show a league banner however it was registered.
 *
 * No client change is needed to display these: the client's `case 'rated'`
 * prints whatever string arrives, so a new registry here is recognised the
 * moment it is added.
 */

import { Utils } from '../../lib';

/** Command name -> the banner text the client will show. */
const RATED_REGISTRIES: { [cmd: string]: string } = {
	hpl: 'Hackmons Premier League',
	ot: 'Official Tournament',
};

const OFF_WORDS = ['off', 'clear', 'none', 'end', 'stop', 'remove'];

export const commands: Chat.ChatCommands = {
	hpl: 'ratedregistry',
	ot: 'ratedregistry',
	ratedregistry(target, room, user, connection, cmd) {
		// Global driver and above. A league banner is a claim about what the
		// battle IS, so it is not something a player can put on their own game.
		this.checkCan('lock');

		const label = RATED_REGISTRIES[cmd];
		if (!label) return this.parse('/help ratedregistry');

		if (OFF_WORDS.includes(toID(target))) {
			const previous = user.battleSettings.special;
			if (!previous) {
				throw new Chat.ErrorMessage(`You have no rated registry set, so there is nothing to clear.`);
			}
			user.battleSettings.special = undefined;
			return this.sendReply(`Cleared your rated registry (it was "${previous}"). Your next battle will be labelled normally.`);
		}

		if (target) return this.parse('/help ratedregistry');

		const previous = user.battleSettings.special;
		user.battleSettings.special = label;

		if (previous && previous !== label) {
			this.sendReply(`Replaced your rated registry: "${previous}" -> "${label}".`);
		} else {
			this.sendReply(`Your next battle will be registered as "${label}".`);
		}
		this.sendReply(`Your opponent must run /${cmd} as well - the two registrations have to match or the battle will be refused.`);
		this.sendReply(`It applies to ONE battle and only to an unrated, non-tournament challenge: a ladder game is announced as "Rated battle" and a /tour game as "Tournament battle" whatever is registered here.`);
		this.sendReply(`Use /${cmd} off to clear it.`);
	},
	ratedregistryhelp() {
		const list = Object.entries(RATED_REGISTRIES)
			.map(([cmd, label]) => `<code>/${cmd}</code> - ${Utils.escapeHTML(label)}`)
			.join('<br />');
		this.sendReplyBox(
			`<strong>Rated registries</strong> - label the next battle you start.<br />` +
			`${list}<br />` +
			`<code>/&lt;registry&gt; off</code> - clear your registration.<br />` +
			`Both players must run the same command before the challenge, it lasts for one battle, ` +
			`and it is overridden on a rated or tournament battle.<br />` +
			`Requires: % @ &amp; ~`
		);
	},
	hplhelp: 'ratedregistryhelp',
	othelp: 'ratedregistryhelp',
};
