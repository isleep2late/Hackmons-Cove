#!/bin/bash
# Hourly backup of the Showdown room config (rooms + auth). Keeps the last 72
# NON-EMPTY snapshots, and refuses to let a blank 2-room default overwrite history.
SRC="/srv/phnn/pokemon-showdown/config/chatrooms.json"
DST="/srv/phnn/backups/chatrooms"
[ -f "$SRC" ] || exit 0
count=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$SRC','utf8')).length)}catch(e){console.log(0)}" 2>/dev/null)
if [ "${count:-0}" -gt 2 ]; then
    cp "$SRC" "$DST/chatrooms-$(date +%Y%m%d-%H%M%S).json"
    ls -1t "$DST"/chatrooms-*.json 2>/dev/null | tail -n +73 | xargs -r rm -f
fi
