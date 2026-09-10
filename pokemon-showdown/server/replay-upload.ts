/**
 * Fork-local replay upload transport.
 *
 * Upstream saves replays one of two ways (see GameRoom#uploadReplay):
 *   1. a direct Postgres connection to the replay database (`Config.replaysdb`), or
 *   2. `LoginServer.request('addreplay', ...)`, which only answers servers that are
 *      registered with play.pokemonshowdown.com and hold a matching `servertoken`.
 *
 * This fork has neither: no replay database, and it is not a registered side server. The
 * old third path - the *browser* POSTing the log to `action.php?act=uploadreplay` - was
 * removed from the login server, which is why an upload came back as the literal body
 * `]{"actionerror":"No longer exists; use addreplay."}` (the `]` is the login server's
 * anti-JSON-hijacking prefix).
 *
 * So this fork uses its own replay store: the front server (pokemon-showdown-client's
 * deploy/phnn-client-server.js) already accepts `act=uploadreplay` on its /action.php route
 * and writes flat `.log` files under PHNN_REPLAYS_DIR, and it is the thing that serves
 * `Config.routes.replays`. We POST to it server-to-server. The wire format below is exactly
 * the one that endpoint has always accepted, so the front server needs no new endpoint.
 *
 * Set `Config.replayuploadurl` to that endpoint (e.g. 'http://127.0.0.1:8100/action.php') to
 * turn this on. When it is unset, GameRoom#uploadReplay keeps upstream behaviour.
 */

import { Net } from '../lib';

/** The store refuses logs over 1MB; fail early rather than burning the upload. */
const MAX_REPLAY_LOG = 1024 * 1024;
const UPLOAD_TIMEOUT = 30000;

export interface ReplayUploadRequest {
	/** endpoint, normally Config.replayuploadurl */
	url: string;
	/** battle id without the `battle-` prefix and without the password suffix */
	id: string;
	log: string;
	password?: string | null;
	serverid?: string;
}

export type ReplayUploadResult =
	{ fullid: string, error?: undefined } |
	{ fullid?: undefined, error: string };

/**
 * Turns whatever the replay store said into something a player can act on.
 *
 * The three cases the old in-browser uploader knew about ('hash mismatch', 'not found',
 * 'invalid id') are kept word-for-word, because they are still the three cases the store
 * can report; the rest exist because this store can report them and the browser's version
 * could not. Anything unrecognised is squeezed into one short line - never a raw JSON blob,
 * which is the failure mode this whole module exists to remove.
 */
export function describeReplayUploadFailure(raw: string): string {
	const body = (raw || '').trim();
	switch (body) {
	case 'hash mismatch':
		return "Someone else is already uploading a replay of this battle. Try again in five seconds.";
	case 'not found':
		return "This server isn't registered with the replay server, so replays can't be uploaded. " +
			"Tell an administrator.";
	case 'invalid id':
		return "This battle's ID isn't one the replay server will accept, so this replay can't be uploaded. " +
			"Tell an administrator.";
	case 'replay too large':
		return "This battle's log is too big for the replay server (the limit is 1MB). " +
			"Use the Download replay button instead.";
	case 'too many uploads':
		return "The replay server is rate-limiting uploads right now. Try again in a minute.";
	case 'error saving replay':
		return "The replay server couldn't write this replay to disk. Tell an administrator.";
	}
	return `The replay server rejected this replay: ${summarizeUnknownError(body)}`;
}

/**
 * Last-resort renderer for a body we have no specific message for. Strips the login
 * server's `]` JSON-hijacking guard, pulls the message out of an `actionerror` payload
 * so the user sees a sentence rather than JSON, and caps the length so a stray HTML
 * error page cannot become the popup.
 */
export function summarizeUnknownError(raw: string): string {
	let body = (raw || '').trim();
	if (body.startsWith(']')) body = body.slice(1).trim();
	if (body.startsWith('{') || body.startsWith('[')) {
		// A JSON body means the login server answered. A player can do nothing with the JSON
		// itself, so pull out the human-readable field, or say what the shape means - never
		// fall through and print the object, which is the exact bug this replaces.
		try {
			let parsed = JSON.parse(body);
			if (Array.isArray(parsed)) parsed = parsed[0];
			const message = parsed?.actionerror || parsed?.error;
			if (typeof message === 'string' && message) {
				body = message;
			} else if (parsed?.errorip) {
				return "it doesn't recognise this Showdown server. Tell an administrator.";
			} else {
				return "it sent a response this server didn't understand. Tell an administrator.";
			}
		} catch {
			return "it sent a malformed response. Tell an administrator.";
		}
	}
	body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	if (!body) return "no reason given.";
	if (body.length > 160) body = `${body.slice(0, 157)}...`;
	return body;
}

/**
 * POSTs a replay to the fork's own replay store. Never throws: a network failure is
 * reported the same way a rejection is, so callers only have one path to handle.
 */
export async function uploadReplayToStore(request: ReplayUploadRequest): Promise<ReplayUploadResult> {
	if (!request.id) {
		return { error: describeReplayUploadFailure('invalid id') };
	}
	if (request.log.length > MAX_REPLAY_LOG) {
		return { error: describeReplayUploadFailure('replay too large') };
	}

	let body;
	try {
		body = await Net(request.url).post({
			body: {
				act: 'uploadreplay',
				id: request.id,
				log: request.log,
				password: request.password || '',
				serverid: request.serverid || '',
			},
			timeout: UPLOAD_TIMEOUT,
		});
	} catch (err: any) {
		// Net throws HttpError for a non-2xx; its body is the store's own message, so a 413
		// ('replay too large') or 429 ('too many uploads') still gets its specific text.
		const errorBody = typeof err?.body === 'string' && err.body.trim() ? err.body : null;
		if (errorBody) return { error: describeReplayUploadFailure(errorBody) };
		return { error: `Couldn't reach the replay server: ${summarizeUnknownError(err?.message || '')}` };
	}

	const response = (body || '').trim();
	if (response.startsWith('success:')) {
		const fullid = response.slice('success:'.length).trim();
		if (fullid) return { fullid };
		return { error: describeReplayUploadFailure('error saving replay') };
	}
	// The player gets a sentence; the raw body still has to go somewhere an admin can read it,
	// otherwise "tell an administrator" leaves the administrator with nothing to look at.
	// (Guarded because this module is also exercised outside a running server.)
	if (typeof Monitor !== 'undefined') {
		Monitor.log(`[replay-upload] ${request.id} rejected: ${response.slice(0, 512)}`);
	}
	return { error: describeReplayUploadFailure(response) };
}
