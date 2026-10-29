#!/bin/bash
set -e

LABEL="local.mac-iphone-text-server"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -f "$PLIST_PATH" ]; then
  launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
  rm "$PLIST_PATH"
  echo "Removed $LABEL"
else
  echo "$LABEL is not installed"
fi
