/**
 * Teambuilder team panel
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license AGPLv3
 */

import preact from "../js/lib/preact";
import { PS, PSRoom, type RoomOptions, type Team } from "./client-main";
import { PSPanelWrapper, PSRoomPanel } from "./panels";
import { RomHacks, TL, toID, type ID } from "./battle-dex";
import { BattleLog } from "./battle-log";
import { TeamEditor, type TeamEditorState } from "./battle-team-editor";
import { Net, PSLoginServer } from "./client-connection";
import { Teams } from "./battle-teams";
import { CopyableURLBox } from "./panel-chat";

class TeamRoom extends PSRoom {
	/** Doesn't _literally_ always exist, but does in basically all code
	 * and constantly checking for its existence is legitimately annoying... */
	team!: Team;
	teamDeleted = false;
	forceReload = false;
	editor?: TeamEditorState;
	private loadAttempt?: { team: Team, uploaded: Team['uploaded'] };
	override clientCommands = this.parseClientCommands({
		'validate'(target) {
			if (this.team.format.length <= 4) {
				return this.errorReply(TL`You must select a format first.`);
			}
			this.send(`/utm ${this.team.packedTeam}`);
			this.send(`/vtm ${this.team.format}`);
		},
	});
	constructor(options: RoomOptions) {
		super(options);
		const team = PS.teams.byKey[this.id.slice(5)] || null;
		this.team = team!;
		this.title = `[Team] ${this.team?.name || 'Not found'}`;
		if (team) this.setFormat(RomHacks.currentFormat(team.format));
		this.load();
	}
	override onParentKeyDown = (e?: Event) => {
		return this.editor?.handleParentKeyDown?.(e as KeyboardEvent);
	};
	override getTitle() {
		return `[${TL`Team`}] ${this.team?.name || (this.teamDeleted ? TL`Team deleted` : TL`Not found`)}`;
	}
	getTeam() {
		const team = PS.teams.byKey[this.id.slice(5)] || null;
		this.teamDeleted = !team && (!!this.team || this.teamDeleted);
		this.team = team!;
		this.title = `[Team] ${this.team?.name || (this.teamDeleted ? 'Team deleted' : 'Not found')}`;
		return team;
	}
	setFormat(format: string) {
		const team = this.team;
		team.format = toID(format);
	}
	load() {
		const uploaded = this.team?.uploaded;
		if (!uploaded || (this.loadAttempt?.team === this.team && this.loadAttempt.uploaded === uploaded)) return;
		this.loadAttempt = { team: this.team, uploaded };
		PS.teams.loadTeam(this.team, true)?.then(success => {
			if (success) this.update(null);
		});
	}
	upload(isPrivate: boolean) {
		const team = this.team;
		const cmd = team.uploaded ? 'update' : 'save';
		// teamName, formatid, rawPrivacy, rawTeam
		const buf = [];
		if (team.uploaded) {
			buf.push(team.uploaded.teamid);
		} else if (team.teamid) {
			return PS.alert(TL`This team is for a different account. Please log into the correct account to update it.`);
		}
		buf.push(team.name, team.format, isPrivate ? 1 : 0);
		const exported = team.packedTeam;
		if (!exported) return PS.alert(TL`Add a Pokémon to your team before uploading it.`);
		buf.push(exported);
		PS.teams.uploading = team;
		PS.send(`/teams ${cmd} ${buf.join(', ')}`);
		team.uploadedPackedTeam = exported;
		this.update(null);
	}
	cancelUpload() {
		PS.teams.uploading = null;
		this.team.uploadedPackedTeam = undefined;
		this.update(null);
	}
	stripNicknames(packedTeam: string) {
		const team = Teams.unpack(packedTeam);
		for (const pokemon of team) {
			pokemon.name = '';
		}
		return Teams.pack(team);
	}
	save() {
		PS.teams.save();
		const title = `[Team] ${this.team?.name || 'Team'}`;
		if (title !== this.title) {
			this.title = title;
			PS.update();
		}
	}
}

export type FormatResource = { url: string, resources: { resource_name: string, url: string }[] } | null;
class TeamPanel extends PSRoomPanel<TeamRoom> {
	static readonly id = 'team';
	static readonly routes = ['team-*'];
	static readonly Model = TeamRoom;
	static readonly title = 'Team';
	nameInput: string | null = null;

	constructor(props?: { room: TeamRoom }) {
		super(props);
		const room = this.props.room;
		if (room.team) {
			TeamPanel.getFormatResources(room.team.format).then(() => {
				this.forceUpdate();
			});
		}
	}

	static formatResources = {} as Record<string, FormatResource>;

	static getFormatResources(format: string): Promise<FormatResource> {
		if (format in this.formatResources) return Promise.resolve(this.formatResources[format]);
		return Net('https://www.smogon.com/dex/api/formats/by-ps-name/' + format).get()
			.then(result => {
				this.formatResources[format] = JSON.parse(result);
				return this.formatResources[format];
			}).catch(err => {
				this.formatResources[format] = null;
				return this.formatResources[format];
			});
	}

	static diffLines(localLines: string[], uploadedLines: string[]) {
		// https://en.wikipedia.org/wiki/Longest_common_subsequence
		const lcs: number[][] = [];
		for (let i = 0; i <= localLines.length; i++) {
			lcs[i] = [];
			for (let j = 0; j <= uploadedLines.length; j++) lcs[i][j] = 0;
		}
		for (let i = localLines.length - 1; i >= 0; i--) {
			for (let j = uploadedLines.length - 1; j >= 0; j--) {
				lcs[i][j] = localLines[i] === uploadedLines[j] ?
					lcs[i + 1][j + 1] + 1 :
					Math.max(lcs[i + 1][j], lcs[i][j + 1]);
			}
		}

		const rows: { local?: string, uploaded?: string, changed: boolean }[] = [];
		const addChangedRows = (fromI: number, toI: number, fromJ: number, toJ: number) => {
			const count = Math.max(toI - fromI, toJ - fromJ);
			for (let k = 0; k < count; k++) rows.push({
				local: k < toI - fromI ? localLines[fromI + k] : undefined,
				uploaded: k < toJ - fromJ ? uploadedLines[fromJ + k] : undefined,
				changed: true,
			});
		};
		const anchors: [number, number][] = [];
		let i = 0;
		let j = 0;
		while (i < localLines.length && j < uploadedLines.length) {
			if (localLines[i] === uploadedLines[j]) {
				anchors.push([i, j]);
				i++;
				j++;
			} else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
				i++;
			} else {
				j++;
			}
		}
		let lastI = 0;
		let lastJ = 0;
		for (const [nextI, nextJ] of anchors) {
			addChangedRows(lastI, nextI, lastJ, nextJ);
			rows.push({ local: localLines[nextI], uploaded: uploadedLines[nextJ], changed: false });
			lastI = nextI + 1;
			lastJ = nextJ + 1;
		}
		addChangedRows(lastI, localLines.length, lastJ, uploadedLines.length);
		return rows;
	}
	static renderDiffLine(line: string | undefined) {
		return line ? BattleLog.escapeHTML(line) : '&nbsp;';
	}
	static renderTeamDiff(localTeam: string, uploadedTeam: string) {
		const trimmedLocalTeam = localTeam.replace(/\n+$/, '');
		const trimmedUploadedTeam = uploadedTeam.replace(/\n+$/, '');
		const localSets = trimmedLocalTeam ? trimmedLocalTeam.split(/\n\n+/) : [];
		const uploadedSets = trimmedUploadedTeam ? trimmedUploadedTeam.split(/\n\n+/) : [];
		const setCount = Math.max(localSets.length, uploadedSets.length);
		let buf = `|html|<table class="table" style="width:100%;font-size:14px">` +
			`<tr><th>${TL`Local`}</th>` +
			`<th>${TL`Uploaded`}</th></tr>`;
		for (let i = 0; i < setCount; i++) {
			if (i) {
				buf += `<tr><td style="border-top:0;border-bottom:0;padding:0 5px">&nbsp;</td>` +
					`<td style="border-top:0;border-bottom:0;padding:0 5px">&nbsp;</td></tr>`;
			}
			const rows = this.diffLines(
				localSets[i]?.split('\n') || [],
				uploadedSets[i]?.split('\n') || []
			);
			for (const row of rows) {
				const className = row.changed ? ` class="highlighted"` : ``;
				buf += `<tr><td${className} style="border-top:0;border-bottom:0;padding:0 5px">` +
					`${this.renderDiffLine(row.local)}</td>` +
					`<td${className} style="border-top:0;border-bottom:0;padding:0 5px">` +
					`${this.renderDiffLine(row.uploaded)}</td></tr>`;
			}
		}
		return buf + `</table>`;
	}

	handleRename = (ev: Event) => {
		const textbox = ev.currentTarget as HTMLInputElement;
		const room = this.props.room;

		this.nameInput = textbox.value;
		const name = textbox.value.trim().slice(0, 220);
		if (name !== room.team.name) {
			room.team.name = name;
			room.save();
		}
		this.forceUpdate();
	};

	uploadTeam = (ev: Event) => {
		const room = this.props.room;
		room.upload(room.team.uploaded ? !!room.team.uploaded.private : PS.prefs.uploadprivacy);
	};
	restore = (ev: Event) => {
		const room = this.props.room;
		const team = room.team;
		if (!team.uploadedPackedTeam) {
			// should never happen
			PS.alert(TL`Must use on an uploaded team.`);
			return;
		}
		team.packedTeam = team.uploadedPackedTeam;
		room.forceReload = true;
		room.save();
		this.forceUpdate();
	};
	compare = (ev: Event) => {
		const team = this.props.room.team;
		if (!team.uploadedPackedTeam) {
			// should never happen
			PS.alert(TL`Must use on an uploaded team.`);
			return;
		}
		const uploadedTeam = Teams.export(Teams.unpack(team.uploadedPackedTeam), undefined);
		const localTeam = Teams.export(Teams.unpack(team.packedTeam), undefined);
		PS.alert(TeamPanel.renderTeamDiff(localTeam, uploadedTeam), { width: 720 });
		ev.preventDefault();
		ev.stopImmediatePropagation();
	};

	changePrivacyPref = (ev: Event) => {
		PS.prefs.uploadprivacy = !(ev.currentTarget as HTMLInputElement).checked;
		PS.prefs.save();
		this.forceUpdate();
	};
	handleRomHack = () => {
		this.props.room.editor?.setFormat(this.props.room.team.format);
		PS.teams.save();
		this.forceUpdate();
	};
	handleRomHackMode = (mode: string) => {
		const room = this.props.room;
		const format = RomHacks.modeFormat(room.team.format, mode);
		const gen = parseInt(String(RomHacks.active?.parentMod).slice(3), 10) || 9;
		const sets = room.editor?.sets || Teams.unpack(room.team.packedTeam);
		const extras = RomHacks.disguiseExtras(sets, format, gen);
		if (extras) {
			if (!confirm(RomHacks.extrasWarning(mode, extras))) {
				this.forceUpdate();
				return false;
			}
			RomHacks.disguiseExtras(sets, format, gen, true);
			room.team.packedTeam = Teams.pack(sets);
			room.team.iconCache = null;
			if (room.editor) room.editor.lastPackedTeam = room.team.packedTeam;
		}
		room.setFormat(format);
		if (room.editor) {
			room.editor.setFormat(room.team.format);
			room.editor.innerFocus = null;
		}
		room.save();
		this.forceUpdate();
		TeamPanel.getFormatResources(room.team.format).then(() => {
			this.forceUpdate();
		});
		return true;
	};
	handleChangeFormat = (ev: Event) => {
		const dropdown = ev.currentTarget as HTMLButtonElement;
		const room = this.props.room;

		room.setFormat(dropdown.value);
		room.save();
		this.forceUpdate();
		TeamPanel.getFormatResources(room.team.format).then(() => {
			this.forceUpdate();
		});
	};
	save = () => {
		this.props.room.save();
		this.forceUpdate();
	};
	renderResources() {
		const { room } = this.props;
		const team = room.team;
		const info = TeamPanel.formatResources[team.format];
		const formatName = BattleLog.formatName(team.format);
		return (info && (info.resources.length || info.url)) ? (
			<details class="details" open>
				<summary><strong>{TL`Teambuilding resources for ${formatName}`}</strong></summary>
				<div style="margin-left:5px"><ul>
					{info.resources.map(resource => (
						<li><p><a href={resource.url} target="_blank">{resource.resource_name}</a></p></li>
					))}
				</ul>
				<p>
					Find {info.resources.length ? 'more ' : ''}
					helpful resources for {formatName} on <a href={info.url} target="_blank">the Smogon Dex</a>.
				</p></div>
			</details>
		) : null;
	}
	override componentDidUpdate() {
		const room = this.props.room;
		room.load();
	}
	override render() {
		const { room } = this.props;
		const team = room.getTeam();
		if (!team || room.forceReload) {
			if (room.forceReload) {
				room.forceReload = false;
				room.update(null);
			}
			return <PSPanelWrapper room={room}>
				<a class="button" href="teambuilder" data-target="replace">
					<i class="fa fa-chevron-left" aria-hidden></i> {TL`[Teams]`}
				</a>
				<p class="error">
					{room.teamDeleted ? TL`Team was deleted` : TL`Team doesn't exist`}
				</p>
			</PSPanelWrapper>;
		}

		// something changed under us (e.g. an import)
		if (this.nameInput !== null && this.nameInput.trim().slice(0, 220) !== team.name) this.nameInput = null;
		const nameTooLong = this.nameInput !== null && this.nameInput.trim().length > 220;
		const nameErrorId = `teamname-error-${team.key}`;
		const unsaved = team.uploaded && team.uploadedPackedTeam ? team.uploadedPackedTeam !== team.packedTeam : false;
		return <PSPanelWrapper room={room}>
			<div class="team-pad">
				<a class="button" href="teambuilder" data-target="replace">
					<i class="fa fa-chevron-left" aria-hidden></i> {TL`[Teams]`}
				</a> {}
				{team.uploaded ? (
					<>
						<button class={`button${unsaved ? ' button-first' : ''}`} data-href={`teamstorage-${team.key}`}>
							<i class="fa fa-globe"></i> {team.uploaded.private ? TL`Account` : TL`Account (public)`}
						</button>
						{unsaved && <button class="button button-last notifying" onClick={this.uploadTeam}>
							<strong>{TL`[Upload changes]`}</strong>
						</button>}
					</>
				) : team.teamid ? (
					<button class="button" data-href={`teamstorage-${team.key}`}>
						<i class="fa fa-plug"></i> {TL`Disconnected (wrong account?)`}
					</button>
				) : (
					<button class="button" data-href={`teamstorage-${team.key}`}>
						<i class="fa fa-laptop"></i> {TL`Local`}
					</button>
				)}
				<div style={room.width < 550 ? "margin-top:8px" : "float:right"}><button
					name="format" value={team.format} data-selecttype="teambuilder"
					class="select formatselect" data-href="/formatdropdown" onChange={this.handleChangeFormat}
				>
					<i class="fa fa-folder-o"></i> {BattleLog.formatName(team.format)} {}
					{team.format.length <= 4 && <em>{TL`(uncategorized)`}</em>}
				</button></div>
				<label class="label teamname">
					Team name:{}
					<input
						class="textbox" type="text" value={this.nameInput ?? team.name}
						aria-invalid={nameTooLong || undefined} aria-describedby={nameTooLong ? nameErrorId : undefined}
						onInput={this.handleRename} onChange={this.handleRename}
					/>
					{nameTooLong && <small class="message-error" style="display:block" id={nameErrorId}>
						Name too long! Limit 220 characters.
					</small>}
				</label>
			</div>
			{RomHacks.isFormat(team.format) && <RomHackUpload
				onLoaded={this.handleRomHack} onMode={this.handleRomHackMode} format={team.format} teamKey={team.key || team.name}
			/>}
			<TeamEditor
				team={team} onChange={this.save} readOnly={!!team.teamid && !team.uploadedPackedTeam} resources={this.renderResources()}
				narrow={room.width < 550}
				editorRef={(editor: TeamEditorState) => { room.editor = editor; }}
			>
				{!!(team.packedTeam && team.format.length > 4) && <p>
					<button data-cmd="/validate" class="button"><i class="fa fa-check"></i> {TL`[Validate]`}</button>
				</p>}
				{!!(team.packedTeam || team.uploaded) && <p class="infobox" style="padding: 5px 8px">
					{team.uploadedPackedTeam && !team.uploaded ? <>
						{TL`Uploading...`}
					</> : team.uploaded ? <>
						<small>Share URL:</small> {}
						<CopyableURLBox
							url={`https://psim.us/t/${team.uploaded.teamid}${team.uploaded.private ? '-' + team.uploaded.private : ''}`}
						/> {}
						{unsaved && <div style="padding-top:5px">
							<button class="button notifying" onClick={this.uploadTeam}>
								<i class="fa fa-upload"></i> <strong>{TL`[Upload changes]`}</strong>
							</button> {}
							<button class="button" onClick={this.restore}>
								{TL`[Revert to uploaded version]`}
							</button> {}
							<button class="button" onClick={this.compare}>
								{TL`[Compare]`}
							</button>
						</div>}
					</> : !team.teamid ? <>
						<label class="checkbox inline">
							<input
								name="teamprivacy" checked={!PS.prefs.uploadprivacy}
								type="checkbox" onChange={this.changePrivacyPref}
							/> Public
						</label>
						<button class="button exportbutton" onClick={this.uploadTeam}>
							<i class="fa fa-upload"></i> {PS.prefs.uploadprivacy ? (
								TL`[Upload for shareable URL]`
							) : (
								TL`[Upload for shareable/searchable URL]`
							)}
						</button>
					</> : <>
						This is a disconnected team. This could be because you uploaded it
						on a different account, or because you deleted or un-uploaded it on
						a different computer. For safety, you can't edit this team. You can,
						however, delete it, or make a copy (which will be editable).
					</>}
				</p>}
			</TeamEditor>
		</PSPanelWrapper>;
	}
}

class ViewTeamPanel extends PSRoomPanel {
	static readonly id = 'viewteam';
	static readonly routes = ['viewteam-*'];
	static readonly Model = TeamRoom;
	static readonly title = 'Loading...';
	team: Team | null | undefined;
	teamData: {
		team: string, private: string | null, ownerid: ID, format: ID, title: string, views: number,
	} | null = null;
	override componentDidMount(): void {
		super.componentDidMount();
		const roomid = this.props.room.id;
		const [teamid, password] = roomid.slice(9).split('-');
		PSLoginServer.query('getteam', {
			teamid,
			password,
			full: true,
		}).then(untypedData => {
			const data = untypedData as ViewTeamPanel['teamData'];
			if (!data) {
				this.team = null;
				return;
			}
			this.team = {
				name: data.title,
				format: data.format,
				folder: '',
				packedTeam: data.team,
				iconCache: null,
				key: '',
				isBox: false,
				teamid: parseInt(teamid),
			};
			for (const localTeam of PS.teams.list) {
				if (localTeam.teamid === this.team.teamid) {
					this.team.key = localTeam.key;
					break;
				}
			}
			this.props.room.title = `[Team] ${this.team.name || 'Untitled team'}`;
			this.teamData = data;
			PS.update();
		});
	}

	override render() {
		const { room } = this.props;
		const team = this.team;
		const teamData = this.teamData!;
		if (!team) {
			return <PSPanelWrapper room={room}>
				{team === null ? <p class="error">
					{TL`Team doesn't exist`}
				</p> : <p>
					{TL`Loading...`}
				</p>}
			</PSPanelWrapper>;
		}

		return <PSPanelWrapper room={room}><div class="pad">
			<h1>{team.name || TL`Untitled team`}</h1>
			<CopyableURLBox
				url={`https://psim.us/t/${team.teamid!}${teamData.private ? '-' + teamData.private : ''}`}
			/> {}
			<p>{TL.label(TL`Uploaded by`)}<strong>{teamData.ownerid}</strong></p>
			<p>{TL.label(TL`Format`)}<strong>{teamData.format}</strong></p>
			<p>{TL.label(TL`Views`)}<strong>{teamData.views}</strong></p>
			{team.key && <p><a class="button" href={`team-${team.key}`}>{TL`[Edit]`}</a></p>}
			<TeamEditor team={team} readOnly></TeamEditor>
		</div></PSPanelWrapper>;
	}
}

type TeamStorage = 'account' | 'public' | 'disconnected' | 'local';
class TeamStoragePanel extends PSRoomPanel {
	static readonly id = "teamstorage";
	static readonly routes = ["teamstorage-*"];
	static readonly location = "modal-popup";
	static readonly noURL = true;

	chooseOption = (ev: MouseEvent) => {
		const storage = (ev.currentTarget as HTMLButtonElement).value as TeamStorage;
		const room = this.props.room;
		const team = this.team();

		if (storage === 'local' && team.uploaded) {
			PS.send(`/teams delete ${team.uploaded.teamid}`);
			team.uploaded = undefined;
			team.teamid = undefined;
			team.uploadedPackedTeam = undefined;
			PS.teams.save();
			(room.getParent() as TeamRoom).update(null);
		} else if (storage === 'public' && team.uploaded?.private) {
			PS.send(`/teams setprivacy ${team.uploaded.teamid},no`);
		} else if (storage === 'account' && team.uploaded?.private === null) {
			PS.send(`/teams setprivacy ${team.uploaded.teamid},yes`);
		} else if (storage === 'public' && !team.teamid) {
			(room.getParent() as TeamRoom).upload(false);
		} else if (storage === 'account' && !team.teamid) {
			(room.getParent() as TeamRoom).upload(true);
		}
		ev.stopImmediatePropagation();
		ev.preventDefault();
		this.close();
	};
	team() {
		const teamKey = this.props.room.id.slice(12);
		const team = PS.teams.byKey[teamKey]!;
		return team;
	}

	override render() {
		const room = this.props.room;

		const team = this.team();
		const storage: TeamStorage = team.uploaded?.private ? (
			'account'
		) : team.uploaded ? (
			'public'
		) : team.teamid ? (
			'disconnected'
		) : (
			'local'
		);

		if (storage === 'disconnected') {
			return <PSPanelWrapper room={room} width={280}><div class="pad">
				<div><button class="option cur" data-cmd="/close">
					<i class="fa fa-plug"></i> <strong>{TL`Disconnected`}</strong><br />
					Not found in the Teams database. Maybe you uploaded it on a different account?
				</button></div>
			</div></PSPanelWrapper>;
		}
		return <PSPanelWrapper room={room} width={280}><div class="pad">
			<div><button class={`option${storage === 'local' ? ' cur' : ''}`} onClick={this.chooseOption} value="local">
				<i class="fa fa-laptop"></i> <strong>{TL`Local`}</strong><br />
				Stored in cookies on your computer. Warning: Your browser might delete these. Make sure to use backups.
			</button></div>
			<div><button class={`option${storage === 'account' ? ' cur' : ''}`} onClick={this.chooseOption} value="account">
				<i class="fa fa-cloud"></i> <strong>{TL`Account`}</strong><br />
				Uploaded to the Teams database. You can share with the URL.
			</button></div>
			<div><button class={`option${storage === 'public' ? ' cur' : ''}`} onClick={this.chooseOption} value="public">
				<i class="fa fa-globe"></i> <strong>{TL`Account (public)`}</strong><br />
				Uploaded to the Teams database publicly. Share with the URL or people can find it by searching.
			</button></div>
		</div></PSPanelWrapper>;
	}
}

PS.addRoomType(TeamPanel, TeamStoragePanel, ViewTeamPanel);

class RomHackUpload extends preact.Component<{
	onLoaded: () => void, onMode: (mode: string) => boolean, format: string, teamKey: string,
}> {
	error = '';
	pending: { file: File, bases: { id: string, name: string }[] } | null = null;
	baseId = '';
	busy = false;
	clearInput() {
		const input = this.base?.querySelector<HTMLInputElement>('input[type=file]');
		if (input) input.value = '';
	}
	finish = (promise: Promise<unknown>, file?: File) => {
		promise.then(() => {
			this.error = '';
			this.busy = false;
			this.pending = null;
			this.baseId = '';
			this.clearInput();
			if (RomHacks.active) RomHacks.setTeamHack(this.props.teamKey, RomHacks.active.sha256);
			this.props.onLoaded();
			this.forceUpdate();
		}, (err: any) => {
			this.error = String(err?.message || err);
			this.busy = false;
			this.clearInput();
			if (file && err?.bases) {
				this.pending = { file, bases: err.bases };
				if (!this.pending.bases.some(entry => entry.id === this.baseId)) this.baseId = '';
			}
			this.forceUpdate();
		});
	};
	handleFile = (ev: Event) => {
		const file = (ev.currentTarget as HTMLInputElement).files?.[0];
		if (!file || this.busy) return;
		this.error = 'Reading the patch...';
		this.pending = null;
		this.baseId = '';
		this.busy = true;
		this.forceUpdate();
		this.finish(RomHacks.upload(file), file);
	};
	handleBase = (ev: Event) => {
		this.baseId = (ev.currentTarget as HTMLSelectElement).value;
		this.forceUpdate();
	};
	handleBaseUpload = () => {
		if (!this.pending || !this.baseId || this.busy) return;
		const file = this.pending.file;
		this.error = 'Reading the patch...';
		this.busy = true;
		this.forceUpdate();
		this.finish(RomHacks.upload(file, this.baseId), file);
	};
	handleBaseCancel = () => {
		this.pending = null;
		this.baseId = '';
		this.error = '';
		this.clearInput();
		this.forceUpdate();
	};
	handleMode = (ev: Event) => {
		const select = ev.currentTarget as HTMLSelectElement;
		const mode = select.value;
		const current = RomHacks.mode(this.props.format);
		if (mode === 'regular' && !RomHacks.regularReadable(RomHacks.active)) {
			select.value = current;
			this.forceUpdate();
			return;
		}
		if (!this.props.onMode(mode)) select.value = current;
	};
	handleSelect = (ev: Event) => {
		if (this.busy) return;
		this.pending = null;
		this.baseId = '';
		this.finish(RomHacks.activate((ev.currentTarget as HTMLSelectElement).value));
	};
	override render() {
		RomHacks.load();
		RomHacks.syncTeam(this.props.teamKey, () => {
			this.props.onLoaded();
			this.forceUpdate();
		});
		const hack = RomHacks.active;
		const list = RomHacks.list();
		const approximated = hack ? hack.approximated.abilities.length + hack.approximated.items.length : 0;
		const mechanicsHTML = hack ? RomHacks.mechanicsHTML(hack) : '';
		if (hack && !RomHacks.checked[hack.sha256]) {
			void RomHacks.revalidate(hack.sha256).then(changed => {
				if (!changed) return;
				this.props.onLoaded();
				this.forceUpdate();
			});
		}
		const mode = RomHacks.mode(this.props.format);
		const regularReadable = RomHacks.regularReadable(hack);
		const regularProblem = RomHacks.regularProblem(this.props.format);
		return <div class="infobox" style="margin:8px 0">
			<p style="margin:0 0 6px"><label>
				<strong>Mode:</strong> {}
				<select class="button" name="romhackmode" onChange={this.handleMode}>
					{RomHacks.modes.map(entry => <option
						value={entry.id} selected={mode === entry.id}
						disabled={entry.id === 'regular' && !regularReadable && mode !== 'regular'}
					>
						{entry.name}
					</option>)}
				</select>
			</label> {}
			<small>{RomHacks.modes.find(entry => entry.id === mode)?.desc}</small></p>
			{(regularProblem || !regularReadable) && <p class="message-error romhack-regular-unavailable">
				{regularProblem || RomHacks.regularUnavailable}
			</p>}
			<strong>ROM patch:</strong> {}
			{list.length > 0 && <select class="button" disabled={this.busy} onChange={this.handleSelect}>
				{list.map(entry => <option value={entry.sha256} selected={hack?.sha256 === entry.sha256}>
					{RomHacks.optionLabel(entry)}
				</option>)}
			</select>} {}
			<input
				type="file" accept=".bps,.ups,.ips,.xdelta,.vcdiff,.bsp" disabled={this.busy} onChange={this.handleFile}
			/>
			<p><small>
				Upload the hack's patch file (.bps, .ups, .ips, .xdelta or .bsp) - never a ROM. EXPERIMENTAL: Game Boy, Game Boy Color, Game Boy Advance and DS hacks.
			</small></p>
			{this.error && <p class="message-error">{this.error}</p>}
			{this.pending && <p class="romhack-basepicker">
				<label>
					Choose the base game this patch was made for: {}
					<select class="button" name="romhackbase" disabled={this.busy} onChange={this.handleBase}>
						<option value="" selected={!this.baseId}>(choose a game)</option>
						{this.pending.bases.map(entry => <option value={entry.id} selected={this.baseId === entry.id}>
							{entry.name}
						</option>)}
					</select>
				</label> {}
				<button
					class="button" name="romhackbaseupload" disabled={!this.baseId || this.busy} onClick={this.handleBaseUpload}
				>
					<strong>Upload</strong>
				</button> {}
				<button class="button" name="romhackbasecancel" disabled={this.busy} onClick={this.handleBaseCancel}>Cancel</button>
			</p>}
			{hack && <p><small>
				Loaded: <strong>{hack.name || 'ROM hack'}</strong> on {hack.baseGame} - {hack.legal.species.length} Pok&eacute;mon, {}
				{hack.legal.moves.length} moves, {hack.legal.abilities.length} abilities, {hack.legal.items.length} items.<br />
				{hack.pickedBase ? 'Hack ID' : 'SHA-256'} <code>{hack.sha256}</code> - {RomHacks.matchRule(hack)}<br />
				{hack.notes.join(' ')} {}
				{hack.approximated.moves.length} new moves deal plain damage and {approximated} new abilities/items have no effect yet.
			</small></p>}
			{mechanicsHTML && <div
				class="romhack-mechanics" style="font-size:8pt;margin:4px 0" dangerouslySetInnerHTML={{ __html: mechanicsHTML }}
			/>}
		</div>;
	}
}
