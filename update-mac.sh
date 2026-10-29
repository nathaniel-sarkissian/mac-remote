#!/bin/bash
# Update the installed Mac remote server from GitHub and restart its LaunchAgent.
# Run: bash ~/mac-remote-updates/update-mac.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$REPO_DIR/mac_iphone_text_server.py"
TARGET="$HOME/mac_remote_control/mac_iphone_text_server.py"
LABEL="local.mac-iphone-text-server"
PORT=8787

if [ ! -f "$TARGET" ]; then
  echo "Installed server not found: $TARGET" >&2
  exit 1
fi

echo "Pulling latest code..."
git -C "$REPO_DIR" pull --ff-only

if [ ! -f "$SOURCE" ]; then
  echo "Downloaded server file not found: $SOURCE" >&2
  exit 1
fi

# Check compatibility with the system Python before touching the installed copy.
if ! /usr/bin/python -c 'import sys; compile(open(sys.argv[1], "rb").read(), sys.argv[1], "exec")' "$SOURCE"; then
  echo "Python syntax check failed. Installed server was not changed." >&2
  exit 1
fi

echo "Installing server..."
cp -p "$TARGET" "$TARGET.bak"
TEMP_FILE="$(mktemp "$TARGET.new.XXXXXX")"
trap 'rm -f "$TEMP_FILE"' EXIT
cp "$SOURCE" "$TEMP_FILE"
chmod 644 "$TEMP_FILE"
mv -f "$TEMP_FILE" "$TARGET"

echo "Restarting server..."
if ! launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  # Older launchd configurations may not expose the modern gui/ target.
  # Terminate only the process whose command explicitly references our file.
  PIDS="$(lsof -nP -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$PIDS" ]; then
    echo "Could not restart: LaunchAgent is not running. Check $HOME/Library/LaunchAgents/$LABEL.plist" >&2
    exit 1
  fi
  RESTARTED=0
  for PID in $PIDS; do
    CMD="$(ps -p "$PID" -o command= 2>/dev/null || true)"
    case "$CMD" in
      *"$TARGET"*)
        kill "$PID"
        RESTARTED=1
        ;;
    esac
  done
  if [ "$RESTARTED" -ne 1 ]; then
    echo "Could not locate the installed server process on port $PORT." >&2
    exit 1
  fi
fi

echo "Checking health..."
ATTEMPT=0
while [ "$ATTEMPT" -lt 12 ]; do
  if curl -fsS --max-time 1 "http://127.0.0.1:$PORT/health" 2>/dev/null | grep -q '"ok": true'; then
    echo "Updated and running: http://$(hostname -s).local:$PORT"
    exit 0
  fi
  ATTEMPT=$((ATTEMPT + 1))
  sleep 1
done

echo "Update copied, but the server did not pass its health check." >&2
echo "Inspect: $HOME/Library/Logs/mac-iphone-text-server.err.log" >&2
exit 1
