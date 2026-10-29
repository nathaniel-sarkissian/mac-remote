#!/bin/bash
set -e

LABEL="local.mac-iphone-text-server"
PORT="8787"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/mac_iphone_text_server.py"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"
OUT_LOG="$LOG_DIR/mac-iphone-text-server.log"
ERR_LOG="$LOG_DIR/mac-iphone-text-server.err.log"

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "Cannot find $SCRIPT_PATH"
  exit 1
fi

# Prefer an interpreter that can import Quartz, since the mouse controls need it.
# This matters on older macOS releases where Apple's Python 2.7 may include
# PyObjC/Quartz while a separately installed Python 3 does not.
PYTHON_BIN=""
for candidate in "$(command -v python3 2>/dev/null || true)" "$(command -v python 2>/dev/null || true)"; do
  [ -n "$candidate" ] || continue
  if "$candidate" -c 'import Quartz' >/dev/null 2>&1; then
    PYTHON_BIN="$candidate"
    break
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(command -v python3 2>/dev/null || command -v python 2>/dev/null || true)"
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "Cannot find python3 or python."
  exit 1
fi

if ! "$PYTHON_BIN" -c 'import Quartz' >/dev/null 2>&1; then
  echo "Warning: $PYTHON_BIN cannot import Quartz; text controls may work, but mouse controls will not."
fi

mkdir -p "$PLIST_DIR" "$LOG_DIR"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON_BIN</string>
    <string>$SCRIPT_PATH</string>
    <string>--host</string>
    <string>0.0.0.0</string>
    <string>--port</string>
    <string>$PORT</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PYTHONUNBUFFERED</key>
    <string>1</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$OUT_LOG</string>
  <key>StandardErrorPath</key>
  <string>$ERR_LOG</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load -w "$PLIST_PATH"

echo "Installed $LABEL using $PYTHON_BIN"
echo "Log: $OUT_LOG"
echo "Errors: $ERR_LOG"
echo "Open on your iPhone: http://$(hostname -s).local:$PORT"
