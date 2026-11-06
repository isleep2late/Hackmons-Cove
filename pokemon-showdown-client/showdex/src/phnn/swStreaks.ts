export interface PhnnSwStreaks {
  furyCutter: number;
  rollout: number;
}

const PHNN_SW_KEPT_TURN_REASONS = ['slp', 'frz', 'flinch', 'partiallytrapped'];

const PHNN_SW_FAILED_STEPS = ['-miss', '-fail', '-immune', '-notarget'];

const toStreakId = (value: string): string => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const toSideIdent = (value: string): string => String(value || '').replace(/^(p\d)[a-z]?:\s*/, '$1: ');

export const getPhnnSwTimesUsed = (
  streaks: PhnnSwStreaks,
  moveName: string,
): number => {
  const id = toStreakId(moveName);
  const used = id === 'furycutter' ? streaks?.furyCutter : id === 'rollout' ? streaks?.rollout : 0;

  return used > 1 ? used : 0;
};

export const getPhnnSwStreaks = (
  stepQueue: string[],
  playerKey: string,
  name: string,
): PhnnSwStreaks => {
  const output: PhnnSwStreaks = { furyCutter: 1, rollout: 1 };

  if (!Array.isArray(stepQueue) || !stepQueue.length || !playerKey || !name) {
    return output;
  }

  const ident = `${playerKey}: ${name}`;
  let furyCutter = 0;
  let rollout = 0;
  let furyCutterKept = false;
  let rolloutKept = false;
  let pending: { id: string; target: string; failed: boolean; hit: boolean } = null;

  const settle = () => {
    if (!pending) {
      return;
    }

    if (pending.id === 'furycutter') {
      if (!pending.failed && pending.hit) {
        furyCutter += 1;
        furyCutterKept = true;
      } else {
        furyCutter = 0;
      }
    }

    if (pending.id === 'rollout') {
      rollout = pending.failed ? 0 : rollout + 1;
      rolloutKept = !pending.failed;

      if (rollout >= 5) {
        rollout = 0;
      }
    }

    pending = null;
  };

  const reset = () => {
    furyCutter = 0;
    rollout = 0;
  };

  stepQueue.forEach((step) => {
    if (typeof step !== 'string' || !step.startsWith('|')) {
      return;
    }

    const parts = step.split('|');
    const kind = parts[1];
    const isMine = toSideIdent(parts[2]) === ident;

    if (kind === 'move' || kind === 'cant' || kind === 'turn' || kind === 'switch'
      || kind === 'drag' || kind === 'replace' || kind === 'upkeep' || kind === 'win' || kind === 'tie') {
      settle();
    }

    switch (kind) {
      case 'move': {
        if (!isMine) {
          break;
        }

        const id = toStreakId(parts[3]);

        if (id === 'sleeptalk') {
          furyCutterKept = false;
          rolloutKept = false;
        } else if (id !== 'rollout') {
          rollout = 0;
        }

        if (id === 'furycutter' || id === 'rollout') {
          pending = {
            id,
            target: toSideIdent(parts[4]),
            failed: parts.slice(5).includes('[miss]') || parts.slice(5).includes('[notarget]') || !parts[4],
            hit: false,
          };
        }

        break;
      }

      case 'cant': {
        if (!isMine) {
          break;
        }

        if (PHNN_SW_KEPT_TURN_REASONS.includes(parts[3])) {
          furyCutterKept = furyCutter > 0;
          rolloutKept = rollout > 0;
        } else {
          reset();
        }

        break;
      }

      case 'switch':
      case 'drag':
      case 'replace': {
        if (toSideIdent(parts[2]).startsWith(`${playerKey}:`)) {
          reset();
        }

        break;
      }

      case 'faint': {
        if (isMine) {
          reset();
        }

        break;
      }

      case 'turn': {
        if (!furyCutterKept) {
          furyCutter = 0;
        }

        if (!rolloutKept) {
          rollout = 0;
        }

        furyCutterKept = false;
        rolloutKept = false;

        break;
      }

      default: {
        if (!pending) {
          break;
        }

        if (PHNN_SW_FAILED_STEPS.includes(kind)) {
          pending.failed = true;
        } else if (kind === '-activate' && /Protect|Detect|Endure/.test(parts[3] || '') && !/Substitute/.test(parts[3] || '')) {
          pending.failed = true;
        } else if (kind === '-damage' && toSideIdent(parts[2]) === pending.target && !parts.slice(4).some((part) => part.startsWith('[from]'))) {
          pending.hit = true;
        }

        break;
      }
    }
  });

  settle();

  output.furyCutter = furyCutter + 1;
  output.rollout = rollout + 1;

  return output;
};
