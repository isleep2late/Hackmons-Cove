# MAINTENANCE GUIDE (Private - Repo Owner Reference)

This repo (PureHackmonsNoNerfs) is a conglomeration of **4 upstream repositories**, each tracked differently:

| Directory | Upstream Repo | Tracking Method | Remote Name |
|---|---|---|---|
| `pokemon-showdown/` | [smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown) | **git subtree** | `upstream-showdown` |
| `pokemon-showdown-client/` | [smogon/pokemon-showdown-client](https://github.com/smogon/pokemon-showdown-client) | **git submodule** | (embedded in `.gitmodules`) |
| `Pokemon-Showdown-Dex/` | [Zarel/Pokemon-Showdown-Dex](https://github.com/Zarel/Pokemon-Showdown-Dex) | **git submodule** | (embedded in `.gitmodules`) |
| `leftovers-again/` | [dramamine/leftovers-again](https://github.com/dramamine/leftovers-again) | **git subtree** | `upstream-leftovers` |

---

## Understanding the Tracking Methods

### Subtrees (`pokemon-showdown/`, `leftovers-again/`)

These directories have their files **committed directly** into this repo. They look like normal directories. The advantage is that anyone who clones this repo gets everything immediately without extra steps. The disadvantage is that pulling upstream changes requires a specific merge command and may produce conflicts with our customizations.

### Submodules (`pokemon-showdown-client/`, `Pokemon-Showdown-Dex/`)

These directories are **pointers** to specific commits in their upstream repos. They appear as links in the git history. Anyone who clones this repo needs to run `git submodule update --init` to actually download the contents. These are backup/reference repos, so this is fine.

---

## Updating Each Repository

### 1. Pokémon Showdown (Subtree)

This is the most important one to keep updated. Our PHNN mod lives inside it.

```bash
# Fetch latest from upstream
git fetch upstream-showdown

# Pull upstream changes into the subtree
git subtree pull --prefix=pokemon-showdown upstream-showdown master --squash
```

**What to expect:**
- The `--squash` flag collapses all upstream commits into one merge commit
- If upstream changed files we also customized, you'll get merge conflicts
- Our customized files that may conflict:
  - `pokemon-showdown/config/formats.ts` (our PHNN format definitions)
  - `pokemon-showdown/data/mods/phnn/*` (unlikely to conflict since upstream doesn't have this dir)
- **Always resolve conflicts in favor of our customizations** for `formats.ts`
- After resolving, run `cd pokemon-showdown && npm install` in case deps changed

**If the merge goes sideways:**
```bash
# Abort the merge
git merge --abort

# Or if already committed and it's broken, revert
git revert HEAD
```

### 2. Pokémon Showdown Client (Submodule)

```bash
# Update to latest commit on the remote
cd pokemon-showdown-client
git pull origin master
cd ..

# Stage the updated submodule pointer
git add pokemon-showdown-client
git commit -m "Update pokemon-showdown-client submodule to latest"
```

Or do it in one shot from the repo root:

```bash
git submodule update --remote pokemon-showdown-client
git add pokemon-showdown-client
git commit -m "Update pokemon-showdown-client submodule to latest"
```

### 3. Pokémon Showdown Dex (Submodule)

Same process as the client:

```bash
git submodule update --remote Pokemon-Showdown-Dex
git add Pokemon-Showdown-Dex
git commit -m "Update Pokemon-Showdown-Dex submodule to latest"
```

### 4. Leftovers-Again (Subtree)

This is a fork of dramamine/leftovers-again that you've personally updated to work with the newest version of Showdown. Upstream is 6+ years old and likely won't change, but the remote is set up in case it does.

```bash
# Fetch latest from upstream
git fetch upstream-leftovers

# Pull upstream changes into the subtree
git subtree pull --prefix=leftovers-again upstream-leftovers master --squash
```

**What to expect:**
- Since you've heavily modified this fork, there will likely be many conflicts if upstream ever updates
- In practice, upstream is dormant, so this is mostly here for completeness
- If conflicts arise, your local changes should always take priority

---

## Updating Everything at Once

Here's a quick script to update all four repos:

```bash
#!/bin/bash
set -e

echo "=== Updating pokemon-showdown (subtree) ==="
git fetch upstream-showdown
git subtree pull --prefix=pokemon-showdown upstream-showdown master --squash

echo "=== Updating pokemon-showdown-client (submodule) ==="
git submodule update --remote pokemon-showdown-client
git add pokemon-showdown-client

echo "=== Updating Pokemon-Showdown-Dex (submodule) ==="
git submodule update --remote Pokemon-Showdown-Dex
git add Pokemon-Showdown-Dex

echo "=== Updating leftovers-again (subtree) ==="
git fetch upstream-leftovers
git subtree pull --prefix=leftovers-again upstream-leftovers master --squash

echo "=== Rebuilding pokemon-showdown ==="
cd pokemon-showdown && npm install && cd ..

echo "=== All updates complete ==="
git status
```

Save this as `update-all.sh` if you want, but be careful - subtree pulls can produce conflicts that need manual resolution, so running this unattended isn't recommended.

---

## Git Remotes Reference

The following remotes should be configured. Verify with `git remote -v`:

```
origin              → your PureHackmonsNoNerfs repo (push/pull your work)
upstream-showdown   → https://github.com/smogon/pokemon-showdown.git
upstream-leftovers  → https://github.com/dramamine/leftovers-again.git
```

If a remote is missing (e.g., on a fresh clone), add it:

```bash
git remote add upstream-showdown https://github.com/smogon/pokemon-showdown.git
git remote add upstream-leftovers https://github.com/dramamine/leftovers-again.git
```

The submodule URLs are stored in `.gitmodules` and don't need separate remotes.

---

## After a Fresh Clone

If you (or someone else) clones this repo fresh, the submodules won't be populated. Run:

```bash
git clone https://github.com/isleep2late/PureHackmonsNoNerfs.git
cd PureHackmonsNoNerfs

# Initialize and download submodules (client + dex)
git submodule update --init --recursive

# Add the upstream remotes (not stored in git, so must be added manually)
git remote add upstream-showdown https://github.com/smogon/pokemon-showdown.git
git remote add upstream-leftovers https://github.com/dramamine/leftovers-again.git

# Install showdown deps
cd pokemon-showdown && npm install && cd ..

# Install bot deps (optional)
cd leftovers-again && npm install && cd ..
```

---

## Troubleshooting

### "fatal: refusing to merge unrelated histories" on subtree pull
This can happen if the subtree metadata gets confused. Add `--allow-unrelated-histories`:
```bash
git subtree pull --prefix=pokemon-showdown upstream-showdown master --squash --allow-unrelated-histories
```

### Submodule shows "modified content" but you didn't change anything
The submodule directory might have untracked build artifacts. Clean it:
```bash
cd pokemon-showdown-client
git checkout .
git clean -fd
cd ..
```

### Subtree push (contributing back upstream)
If you ever want to push changes from `pokemon-showdown/` back to upstream (unlikely but possible):
```bash
git subtree push --prefix=pokemon-showdown upstream-showdown your-branch-name
```
Same pattern works for leftovers-again.

### Checking which upstream commit a subtree is at
There's no simple built-in command for this. Your best bet is to check the merge commit messages:
```bash
git log --oneline --grep="Squashed" | head -5
```
