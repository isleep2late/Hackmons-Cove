const SKIP_LASTDAMAGE = new Set([
	'confuseray', 'conversion', 'counter', 'focusenergy', 'glare', 'haze', 'leechseed', 'lightscreen',
	'mimic', 'mist', 'poisongas', 'poisonpowder', 'recover', 'reflect', 'rest', 'softboiled',
	'splash', 'stunspore', 'substitute', 'supersonic', 'teleport', 'thunderwave', 'toxic', 'transform',
]);

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen1',
	gen: 1,
	actions: {
		inherit: true,
		useMoveInner(moveOrMoveName, pokemon, options) {
			let sourceEffect = options?.sourceEffect;
			let target = options?.target;
			if (!sourceEffect && this.battle.effect.id) sourceEffect = this.battle.effect;
			const baseMove = this.battle.dex.moves.get(moveOrMoveName);
			let move = this.battle.dex.getActiveMove(baseMove);
			if (target === undefined) target = this.battle.getRandomTarget(pokemon, move);
			if (move.target === 'self') {
				target = pokemon;
			}
			if (sourceEffect) move.sourceEffect = sourceEffect.id;

			this.battle.setActiveMove(move, pokemon, target);

			this.battle.singleEvent('ModifyMove', move, null, pokemon, target, move, move);
			if (baseMove.target !== move.target) {
				target = this.battle.getRandomTarget(pokemon, move);
			}
			move = this.battle.runEvent('ModifyMove', pokemon, target, move, move);
			if (baseMove.target !== move.target) {
				target = this.battle.getRandomTarget(pokemon, move);
				this.battle.debug('not a gen 1 mechanic');
			}
			if (!move) return false;

			let attrs = '';
			if (pokemon.fainted) {
				return false;
			}

			if (sourceEffect) attrs += `|[from] ${this.battle.dex.conditions.get(sourceEffect).name}`;
			this.battle.addMove('move', pokemon, move.name, `${target}${attrs}`);

			if (!this.battle.singleEvent('Try', move, null, pokemon, target, move)) {
				return true;
			}
			if (!this.battle.singleEvent('TryMove', move, null, pokemon, target, move) ||
				!this.battle.runEvent('TryMove', pokemon, target, move)) {
				return true;
			}

			if (move.ignoreImmunity === undefined) {
				move.ignoreImmunity = (move.category === 'Status');
			}

			let damage: number | undefined | false | '' = false;

			if (move.target === 'allAdjacent' || move.target === 'allAdjacentFoes') {
				const { targets } = pokemon.getMoveTargets(move, target);
				if (!targets.length) {
					this.battle.attrLastMove('[notarget]');
					this.battle.add('-notarget', pokemon);
					return true;
				}
				if (targets.length > 1) move.spreadHit = true;
				if (!SKIP_LASTDAMAGE.has(move.id)) this.battle.lastDamage = 0;
				const hitSlots = [];
				for (const source of targets) {
					if (!source || source.fainted) continue;
					const hitResult = this.tryMoveHit(source, pokemon, move);
					if (hitResult || hitResult === 0 || hitResult === undefined) {
						hitSlots.push(source.getSlot());
					}
				}
				if (move.spreadHit) this.battle.attrLastMove(`[spread] ${hitSlots.join(',')}`);
				this.battle.singleEvent('AfterMoveSecondarySelf', move, null, pokemon, target, move);
				this.battle.runEvent('AfterMoveSecondarySelf', pokemon, target, move);
				return true;
			}

			if (!target || target.fainted) {
				this.battle.attrLastMove('[notarget]');
				this.battle.add('-notarget');
				return true;
			}
			if (!SKIP_LASTDAMAGE.has(move.id)) this.battle.lastDamage = 0;

			damage = this.tryMoveHit(target, pokemon, move);

			if (target.boosts.atk < 6 && (move.selfdestruct || move.id === 'disable') && target.volatiles['rage']) {
				this.battle.boost({ atk: 1 }, target, pokemon, this.dex.conditions.get('rage'));
				this.battle.hint(`In Gen 1, using ${move.name} causes the target to build Rage, ` +
					`even if it misses or fails`, true);
			}

			if (damage === false) {
				this.battle.singleEvent('MoveFail', move, null, target, pokemon, move);
				return true;
			}

			this.battle.singleEvent('AfterMoveSecondarySelf', move, null, pokemon, target, move);
			this.battle.runEvent('AfterMoveSecondarySelf', pokemon, target, move);
			return true;
		},
	},
};
