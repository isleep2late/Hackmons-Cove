'use strict';
/*
 * Give each compiled file its own tagged-template cache names.
 *
 * Babel's template-literal transform hoists one `var _templateObject<N>` per tagged template and
 * numbers them from 1 in every file. That is fine for a bundler, which gives each module its own
 * scope. This client has no bundler: `remove-import-export` strips the module syntax and
 * index-new.html loads the compiled files as plain <script defer> tags, so every file's
 * declarations land in the SAME global scope and the caches collide by index. Whichever file runs
 * first fills the slot and every other file's call site at that index silently reuses it.
 *
 * Measured before this plugin existed: battle-dex.js, panel-rooms.js, panel-chat-tournament.js and
 * battledata.js each declared _templateObject through _templateObject8, and
 * TL.andList(['p','q']) returned "Language room" - a panel-rooms.js string - because the cache it
 * read had been populated by a different file.
 *
 * Upstream has the same hazard: the same .babelrc, the same plain <script defer> loading, no
 * wrapping. It has not bitten there yet for the same reason it had not bitten here - the colliding
 * call sites have to run in the wrong order first. This is a build-only change and touches no
 * source file, so it does not diverge from upstream's sources and cannot conflict with a sync.
 *
 * The rename is done at Program exit, after the template transform has created the bindings, and
 * through scope.rename so every reference moves with the declaration rather than by text
 * substitution.
 */
const path = require('path');

module.exports = function scopeTemplateCache() {
	return {
		name: 'scope-template-cache',
		visitor: {
			Program: {
				exit(programPath, state) {
					const filename = (state.file && state.file.opts && state.file.opts.filename) || '';
					if (!filename) return;
					// Derive the suffix from the file's own name, so it is stable across builds and
					// readable in a stack trace: _templateObject2$panel_rooms.
					const suffix = path.basename(filename)
						.replace(/\.[^.]+$/, '')
						.replace(/[^A-Za-z0-9_$]/g, '_');
					if (!suffix) return;
					for (const name of Object.keys(programPath.scope.bindings)) {
						if (!/^_templateObject\d*$/.test(name)) continue;
						const renamed = `${name}$${suffix}`;
						if (programPath.scope.hasBinding(renamed)) continue;
						programPath.scope.rename(name, renamed);
					}
				},
			},
		},
	};
};
