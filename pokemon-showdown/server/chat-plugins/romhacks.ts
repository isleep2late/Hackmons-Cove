import { hackExists, proofFor } from '../romhacks';

export const commands: Chat.ChatCommands = {
	romhack(target, room, user) {
		const [action, value, proof] = target.split(',').map(part => part.trim().toLowerCase());
		if (action !== 'have' || !value) return this.parse('/help romhack');
		if (!hackExists(value)) {
			return this.errorReply(`That patch has not been uploaded to this server. Upload it in the teambuilder first.`);
		}
		if (!proof || proof !== proofFor(value)) {
			return this.errorReply(`Upload the patch file itself in the teambuilder; the server could not confirm that you have it.`);
		}
		if (!user.romHacks) user.romHacks = new Set();
		if (user.romHacks.size >= 64) user.romHacks.clear();
		user.romHacks.add(value);
	},
	romhackhelp: [
		`/romhack have, [SHA-256], [proof] - Tells the server you uploaded this ROM patch (the proof comes with the upload), so you can battle others who loaded the identical patch. The teambuilder sends this for you.`,
	],
};
