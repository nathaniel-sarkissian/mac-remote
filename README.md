# Mac iPhone Text Remote

This lets an iPhone on the same Wi-Fi network paste text into the currently focused text field on a Mac. The iPhone only uses Safari; the Mac runs a small local Python server.

It also includes a simple touchpad area for moving the Mac pointer from the iPhone.

## How it works

1. Focus the target text field on the Mac with the Bluetooth mouse.
2. Open the local web page on the iPhone.
3. Type text on the iPhone and tap **Send to Mac**.
4. The Mac sets its clipboard to that text and sends `Command-V` to the active app.

The Mac needs Accessibility permission for this because it sends keyboard and mouse events to the active session.

## Mouse pad

The touch area below the text controls works like a small trackpad:

- Drag with one finger to move the pointer.
- Tap once for left click.
- Double tap and hold on the second tap, then move, to click and drag.
- Drag with two fingers to scroll.
- Use the explicit **Left Click** and **Right Click** buttons when tapping is awkward.
- Tap **Drag Lock**, move on the touch area, then tap **Drag Lock** again to release.
- Use the **Speed** slider to tune pointer movement and drag sensitivity.

## Manual test on the Mac

Copy this folder to the Mac mini, open Terminal in the folder, then run:

```sh
python mac_iphone_text_server.py
```

If the Mac has Python 3 installed, this also works:

```sh
python3 mac_iphone_text_server.py
```

The terminal prints a URL such as:

```text
http://192.168.1.25:8787
```

Open that URL on the iPhone while it is connected to the same Wi-Fi network. You can also try:

```text
http://mac-mini.local:8787
```

Replace `mac-mini` with the Mac's computer name from **System Preferences > Sharing**.

If the iPhone cannot open the page, check that the Mac firewall allows incoming connections for Python, or temporarily turn the firewall off while testing.

## Accessibility permission

If the web page says text or mouse input was sent but nothing happens on the Mac:

- macOS High Sierra or newer: open **System Preferences > Security & Privacy > Privacy > Accessibility** and allow Terminal, Python, or `osascript` if prompted.
- Older macOS versions: open **System Preferences > Accessibility** and enable access for assistive devices.

After changing the permission, stop the server with `Control-C` and run it again.

## Start automatically at login

From Terminal in this folder on the Mac:

```sh
chmod +x install-launch-agent.sh uninstall-launch-agent.sh
./install-launch-agent.sh
```

This installs a per-user LaunchAgent that starts the server when that Mac user logs in. UI scripting only works inside a logged-in user session, so use automatic login if you want it available immediately after boot.

Keep this folder in the same location after installing; the LaunchAgent points to the script in this folder.

Logs are written to:

```text
~/Library/Logs/mac-iphone-text-server.log
~/Library/Logs/mac-iphone-text-server.err.log
```

To remove the startup item:

```sh
./uninstall-launch-agent.sh
```

## Notes

- Anyone on the same local network who can reach the page can paste into the Mac, so use this only on a trusted home network.
- The paste action replaces the Mac clipboard with the text from the iPhone.
- The extra Return, Tab, Esc, and Delete buttons send those keys to the currently active Mac app.

## Reliability note

The server uses a threaded HTTP server with a short timeout on idle client sockets. This prevents an incomplete or speculative browser connection from blocking every other request. Touchpad movement is also coalesced so only one movement request is in flight at a time.

This server is plain HTTP. Use `http://HOST:8787`, not `https://HOST:8787`, unless TLS is added separately.


## Persistent input socket

The browser opens one WebSocket at /ws and uses it for mouse movement, clicks, keyboard buttons, text sends, and system actions. Mouse deltas are coalesced to animation frames, and stale positions are not replayed if the network briefly falls behind. The existing HTTP API remains available automatically as a fallback while the WebSocket reconnects.

The WebSocket has no external Python dependency; it is implemented directly in the server for compatibility with the Mac mini's Python 2.7 environment.


## Update from iPhone via SSH

Once you have cloned the private repository to `~/mac-remote-updates`, update the server and restart its LaunchAgent with a single command:

```sh
bash ~/mac-remote-updates/update-mac.sh
```

The script runs `git pull --ff-only`, validates the new Python source, backs up the installed file as `~/mac_remote_control/mac_iphone_text_server.py.bak`, replaces it, restarts the LaunchAgent and checks `/health`. It assumes the existing installed server is at `~/mac_remote_control/mac_iphone_text_server.py`. It does not change the LaunchAgent's installed path.

On the very first use, pull the new updater script before running it:

```sh
git -C ~/mac-remote-updates pull --ff-only && bash ~/mac-remote-updates/update-mac.sh
```
