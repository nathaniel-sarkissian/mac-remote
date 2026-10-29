#!/usr/bin/env python
from __future__ import print_function

import argparse
import json
import os
import socket
import subprocess
import sys
import threading
import time

try:
    from http.server import BaseHTTPRequestHandler, HTTPServer
except ImportError:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer

try:
    from socketserver import ThreadingMixIn
except ImportError:
    from SocketServer import ThreadingMixIn

try:
    from urllib.parse import parse_qs
except ImportError:
    from urlparse import parse_qs

try:
    string_types = (basestring,)
except NameError:
    string_types = (str,)


DEFAULT_PORT = 8787
MAX_BODY_BYTES = 100000
CLIENT_SOCKET_TIMEOUT = 5.0

# Keep Mac-control operations ordered even though HTTP requests are handled
# concurrently. This preserves the original single-threaded input semantics
# without allowing one idle network connection to wedge the entire server.
CONTROL_LOCK = threading.Lock()


INDEX_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Mac Text Remote</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f6f7f8;
      color: #1f2933;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      min-height: 100vh;
      min-height: 100dvh;
      background: #f6f7f8;
    }
    main {
      width: 100%;
      max-width: 720px;
      min-height: 100vh;
      min-height: 100dvh;
      margin: 0 auto;
      padding: 18px 16px;
      padding-top: calc(18px + env(safe-area-inset-top));
      padding-bottom: calc(18px + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
    }
    h1 {
      margin: 10px 0 14px;
      font-size: 28px;
      line-height: 1.1;
      font-weight: 760;
      letter-spacing: 0;
    }
    textarea {
      width: 100%;
      flex: 1 1 auto;
      min-height: 88px;
      resize: none;
      border: 1px solid #9aa6a6;
      border-radius: 8px;
      padding: 14px;
      font: 20px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #111827;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 1px 2px rgba(31, 41, 51, 0.08);
    }
    textarea:focus {
      outline: 3px solid rgba(37, 99, 235, 0.22);
      border-color: #2563eb;
    }
    .pad {
      height: 50vh;
      height: 50dvh;
      min-height: 50vh;
      min-height: 50dvh;
      flex: 0 0 auto;
      margin-top: 0;
      border: 1px solid #9aa6a6;
      border-radius: 8px;
      background: #dfe7e9;
      box-shadow: inset 0 1px 3px rgba(31, 41, 51, 0.16);
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .pad.active {
      border-color: #2563eb;
      box-shadow: inset 0 1px 3px rgba(31, 41, 51, 0.18), 0 0 0 3px rgba(37, 99, 235, 0.18);
    }
    .text-section {
      flex: 1 0 auto;
      min-height: 280px;
      display: flex;
      flex-direction: column;
      margin-top: 12px;
    }
    .bar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
      margin-top: 12px;
    }
    button {
      min-height: 48px;
      border: 0;
      border-radius: 8px;
      padding: 0 18px;
      font: 700 17px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #22577a;
      color: white;
      touch-action: manipulation;
    }
    button.secondary {
      background: #d8ddd9;
      color: #1f2933;
      font-weight: 650;
    }
    button:active {
      transform: translateY(1px);
    }
    .tools {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    .mouse-buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 8px;
    }
    .speed-control {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
      margin-top: 10px;
      color: #3b4b55;
      font-size: 15px;
      font-weight: 650;
    }
    input[type="range"] {
      width: 100%;
      accent-color: #22577a;
    }
    button.active {
      background: #9a3412;
      color: white;
    }
    .system-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
      flex: 0 0 auto;
    }
    button.danger {
      background: #b42318;
      color: white;
    }
    .status {
      min-height: 22px;
      margin: 12px 0 0;
      color: #3b4b55;
      font-size: 15px;
      overflow-wrap: anywhere;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        background: #16191d;
        color: #eef2f4;
      }
      body {
        background: #101417;
      }
      textarea {
        color: #f8fafc;
        background: rgba(13, 18, 23, 0.96);
        border-color: #51606a;
      }
      .pad {
        background: #26323a;
        border-color: #51606a;
      }
      button.secondary {
        background: #364149;
        color: #f8fafc;
      }
      .speed-control {
        color: #b7c2c8;
      }
      .status {
        color: #b7c2c8;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>Mac Text Remote</h1>
    <div id="pad" class="pad" aria-label="Mouse pad"></div>
    <div class="mouse-buttons">
      <button class="secondary" type="button" data-click="left">Left Click</button>
      <button class="secondary" type="button" data-click="right">Right Click</button>
      <button id="dragLock" class="secondary" type="button">Drag Lock</button>
    </div>
    <label class="speed-control" for="mouseSpeed">
      <span>Speed</span>
      <input id="mouseSpeed" type="range" min="0.5" max="10" step="0.1" value="1.35">
      <span id="mouseSpeedValue">1.35x</span>
    </label>
    <div class="text-section">
      <textarea id="text" autocomplete="off" autocapitalize="sentences" spellcheck="true"></textarea>
      <div class="bar">
        <button id="send" type="button">Send to Mac</button>
        <button id="clear" class="secondary" type="button" aria-label="Clear text">Clear</button>
      </div>
      <div class="tools">
        <button class="secondary" type="button" data-key="return">Return</button>
        <button class="secondary" type="button" data-key="tab">Tab</button>
        <button class="secondary" type="button" data-key="escape">Esc</button>
        <button class="secondary" type="button" data-key="delete">Delete</button>
      </div>
      <p id="status" class="status" role="status" aria-live="polite"></p>
    </div>
    <div class="system-actions">
      <button id="shutdownMac" class="danger" type="button">Shut down</button>
      <button id="openChrome" class="secondary" type="button">Open Chrome</button>
    </div>
  </main>
  <script>
    const text = document.getElementById('text');
    const status = document.getElementById('status');
    const send = document.getElementById('send');
    const clear = document.getElementById('clear');
    const pad = document.getElementById('pad');
    const dragLock = document.getElementById('dragLock');
    const mouseSpeed = document.getElementById('mouseSpeed');
    const mouseSpeedValue = document.getElementById('mouseSpeedValue');
    const shutdownMac = document.getElementById('shutdownMac');
    const openChrome = document.getElementById('openChrome');

    function setStatus(message) {
      status.textContent = message;
    }

    async function postJSON(url, payload) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    }

    send.addEventListener('click', async () => {
      const value = text.value;
      if (!value.length) {
        setStatus('Nothing to send.');
        text.focus();
        return;
      }
      send.disabled = true;
      setStatus('Sending...');
      try {
        const data = await postJSON('/api/paste', { text: value });
        setStatus(`Sent ${data.characters} character${data.characters === 1 ? '' : 's'}.`);
      } catch (error) {
        setStatus(`Failed: ${error.message}`);
      } finally {
        send.disabled = false;
        text.focus();
      }
    });

    clear.addEventListener('click', () => {
      text.value = '';
      setStatus('');
      text.focus();
    });

    document.querySelectorAll('[data-key]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await postJSON('/api/key', { key: button.dataset.key });
          setStatus(`${button.textContent} sent.`);
        } catch (error) {
          setStatus(`Failed: ${error.message}`);
        } finally {
          button.disabled = false;
          text.focus();
        }
      });
    });

    document.querySelectorAll('[data-click]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await postJSON('/api/mouse', { action: 'click', button: button.dataset.click });
          setStatus(`${button.textContent} sent.`);
        } catch (error) {
          setStatus(`Failed: ${error.message}`);
        } finally {
          button.disabled = false;
        }
      });
    });

    let dragLocked = false;
    let tracking = false;
    let trackingMode = 'move';
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let startAt = 0;
    let pendingDx = 0;
    let pendingDy = 0;
    let pendingDrag = false;
    let pendingScroll = 0;
    let flushTimer = null;
    let mouseRequestInFlight = false;
    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let clickTimer = null;
    let gestureDragging = false;
    const doubleTapMs = 420;
    const doubleTapDistance = 36;

    function updateMouseSpeedLabel() {
      mouseSpeedValue.textContent = `${Number(mouseSpeed.value).toFixed(1)}x`;
    }

    try {
      const savedSpeed = localStorage.getItem('macTextRemoteMouseSpeed');
      if (savedSpeed !== null) {
        mouseSpeed.value = savedSpeed;
      }
    } catch (error) {}
    updateMouseSpeedLabel();

    mouseSpeed.addEventListener('input', () => {
      updateMouseSpeedLabel();
      try {
        localStorage.setItem('macTextRemoteMouseSpeed', mouseSpeed.value);
      } catch (error) {}
    });

    function currentMouseSpeed() {
      const value = Number(mouseSpeed.value);
      return Number.isFinite(value) ? value : 1.35;
    }

    function averageTouch(touches) {
      let x = 0;
      let y = 0;
      for (let i = 0; i < touches.length; i += 1) {
        x += touches[i].clientX;
        y += touches[i].clientY;
      }
      return { x: x / touches.length, y: y / touches.length };
    }

    function mouseQueueHasData() {
      return Math.abs(pendingDx) >= 0.5 || Math.abs(pendingDy) >= 0.5 || Math.abs(pendingScroll) >= 0.5;
    }

    function scheduleMouseFlush() {
      if (flushTimer || mouseRequestInFlight || !mouseQueueHasData()) return;
      flushTimer = setTimeout(flushMouseQueue, 18);
    }

    async function flushMouseQueue() {
      flushTimer = null;
      if (mouseRequestInFlight || !mouseQueueHasData()) return;

      const dx = Math.round(pendingDx);
      const dy = Math.round(pendingDy);
      const drag = pendingDrag;
      const scroll = Math.round(pendingScroll);
      pendingDx = 0;
      pendingDy = 0;
      pendingDrag = false;
      pendingScroll = 0;
      mouseRequestInFlight = true;

      try {
        if (dx || dy) {
          await postJSON('/api/mouse', { action: drag ? 'drag' : 'move', dx, dy });
        }
        if (scroll) {
          await postJSON('/api/mouse', { action: 'scroll', dy: scroll });
        }
      } catch (error) {
        setStatus(`Mouse failed: ${error.message}`);
      } finally {
        mouseRequestInFlight = false;
        scheduleMouseFlush();
      }
    }

    function queueMouse(payload) {
      if (payload.action === 'move') {
        pendingDx += payload.dx;
        pendingDy += payload.dy;
        pendingDrag = false;
      } else if (payload.action === 'drag') {
        pendingDx += payload.dx;
        pendingDy += payload.dy;
        pendingDrag = true;
      } else if (payload.action === 'scroll') {
        pendingScroll += payload.dy;
      }
      scheduleMouseFlush();
    }

    function cancelPendingClick() {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
    }

    function scheduleClick() {
      cancelPendingClick();
      clickTimer = setTimeout(async () => {
        clickTimer = null;
        try {
          await postJSON('/api/mouse', { action: 'click', button: 'left' });
          setStatus('Click sent.');
        } catch (error) {
          setStatus(`Mouse failed: ${error.message}`);
        }
      }, doubleTapMs);
    }

    pad.addEventListener('touchstart', (event) => {
      event.preventDefault();
      const point = averageTouch(event.touches);
      const now = Date.now();
      const sinceLastTap = now - lastTapAt;
      const tapDistance = Math.abs(point.x - lastTapX) + Math.abs(point.y - lastTapY);
      if (event.touches.length >= 2) {
        cancelPendingClick();
      }
      tracking = true;
      trackingMode = event.touches.length >= 2 ? 'scroll' : 'move';
      lastX = point.x;
      lastY = point.y;
      startX = point.x;
      startY = point.y;
      startAt = now;
      if (!dragLocked && event.touches.length === 1 && sinceLastTap > 0 && sinceLastTap < doubleTapMs && tapDistance < doubleTapDistance) {
        cancelPendingClick();
        lastTapAt = 0;
        gestureDragging = true;
        trackingMode = 'drag';
        postJSON('/api/mouse', { action: 'down', button: 'left' }).then(() => {
          setStatus('Drag started.');
        }).catch((error) => {
          gestureDragging = false;
          setStatus(`Drag failed: ${error.message}`);
        });
      }
      pad.classList.add('active');
    }, { passive: false });

    pad.addEventListener('touchmove', (event) => {
      event.preventDefault();
      if (!tracking) return;
      const nextMode = event.touches.length >= 2 ? 'scroll' : 'move';
      const point = averageTouch(event.touches);
      const dx = point.x - lastX;
      const dy = point.y - lastY;
      lastX = point.x;
      lastY = point.y;
      trackingMode = nextMode;
      if (nextMode === 'scroll') {
        cancelPendingClick();
        queueMouse({ action: 'scroll', dy });
      } else {
        if (Math.abs(point.x - startX) + Math.abs(point.y - startY) > 10) {
          cancelPendingClick();
        }
        const speed = currentMouseSpeed();
        queueMouse({ action: dragLocked || gestureDragging ? 'drag' : 'move', dx: dx * speed, dy: dy * speed });
      }
    }, { passive: false });

    pad.addEventListener('touchend', async (event) => {
      event.preventDefault();
      if (event.touches.length) {
        const point = averageTouch(event.touches);
        lastX = point.x;
        lastY = point.y;
        return;
      }
      const moved = Math.abs(lastX - startX) + Math.abs(lastY - startY);
      const elapsed = Date.now() - startAt;
      tracking = false;
      pad.classList.remove('active');
      if (gestureDragging) {
        gestureDragging = false;
        try {
          await postJSON('/api/mouse', { action: 'up', button: 'left' });
          setStatus('Drag released.');
        } catch (error) {
          setStatus(`Drag failed: ${error.message}`);
        }
        return;
      }
      if (!dragLocked && trackingMode === 'move' && moved < 10 && elapsed < 350) {
        lastTapAt = Date.now();
        lastTapX = startX;
        lastTapY = startY;
        scheduleClick();
      }
    }, { passive: false });

    pad.addEventListener('touchcancel', (event) => {
      event.preventDefault();
      tracking = false;
      if (gestureDragging) {
        gestureDragging = false;
        postJSON('/api/mouse', { action: 'up', button: 'left' }).catch((error) => {
          setStatus(`Drag failed: ${error.message}`);
        });
      }
      pad.classList.remove('active');
    }, { passive: false });

    openChrome.addEventListener('click', async () => {
      openChrome.disabled = true;
      try {
        await postJSON('/api/system', { action: 'open_chrome' });
        setStatus('Chrome opened.');
      } catch (error) {
        setStatus(`Failed: ${error.message}`);
      } finally {
        openChrome.disabled = false;
      }
    });

    shutdownMac.addEventListener('click', async () => {
      if (!window.confirm('Shut down this Mac?')) return;
      shutdownMac.disabled = true;
      setStatus('Shutting down Mac...');
      try {
        await postJSON('/api/system', { action: 'shutdown' });
      } catch (error) {
        setStatus(`Shutdown failed: ${error.message}`);
        shutdownMac.disabled = false;
      }
    });

    dragLock.addEventListener('click', async () => {
      dragLock.disabled = true;
      try {
        if (dragLocked) {
          await postJSON('/api/mouse', { action: 'up', button: 'left' });
          dragLocked = false;
          dragLock.classList.remove('active');
          setStatus('Drag released.');
        } else {
          await postJSON('/api/mouse', { action: 'down', button: 'left' });
          dragLocked = true;
          dragLock.classList.add('active');
          setStatus('Drag lock on.');
        }
      } catch (error) {
        setStatus(`Drag failed: ${error.message}`);
      } finally {
        dragLock.disabled = false;
      }
    });
  </script>
</body>
</html>
"""


KEY_CODES = {
    "return": 36,
    "tab": 48,
    "escape": 53,
    "delete": 51,
}

MOUSE_BUTTONS = {
    "left": ("left", "leftMouseDown", "leftMouseUp"),
    "right": ("right", "rightMouseDown", "rightMouseUp"),
}

QUARTZ = None


def load_quartz():
    global QUARTZ
    if QUARTZ is None:
        try:
            import Quartz
        except ImportError:
            raise RuntimeError("Quartz Python bindings are missing on this Mac")
        QUARTZ = Quartz
    return QUARTZ


def as_bytes(value):
    if isinstance(value, bytes):
        return value
    return value.encode("utf-8")


def as_text(value):
    if isinstance(value, bytes):
        return value.decode("utf-8")
    return value


def local_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"
    finally:
        sock.close()


def run_osascript(lines):
    command = ["osascript"]
    for line in lines:
        command.extend(["-e", line])
    return subprocess.check_output(command, stderr=subprocess.STDOUT)


def paste_text(text, dry_run=False):
    text = as_text(text)
    if dry_run or sys.platform != "darwin":
        print("[dry-run] paste: {0!r}".format(text))
        return

    copier = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
    copier.communicate(as_bytes(text))
    if copier.returncode:
        raise RuntimeError("pbcopy failed with exit code {0}".format(copier.returncode))

    time.sleep(0.05)
    run_osascript([
        'tell application "System Events"',
        'keystroke "v" using {command down}',
        'end tell',
    ])


def press_key(name, dry_run=False):
    code = KEY_CODES[name]
    if dry_run or sys.platform != "darwin":
        print("[dry-run] key: {0}".format(name))
        return

    run_osascript([
        'tell application "System Events"',
        'key code {0}'.format(code),
        'end tell',
    ])


def point_xy(point):
    try:
        return float(point.x), float(point.y)
    except AttributeError:
        return float(point[0]), float(point[1])


def rect_values(rect):
    try:
        return (
            float(rect.origin.x),
            float(rect.origin.y),
            float(rect.size.width),
            float(rect.size.height),
        )
    except AttributeError:
        return (
            float(rect[0][0]),
            float(rect[0][1]),
            float(rect[1][0]),
            float(rect[1][1]),
        )


def current_mouse_position(quartz):
    event = quartz.CGEventCreate(None)
    return point_xy(quartz.CGEventGetLocation(event))


def clamp_mouse_position(quartz, x, y):
    origin_x, origin_y, width, height = rect_values(quartz.CGDisplayBounds(quartz.CGMainDisplayID()))
    max_x = origin_x + width - 1
    max_y = origin_y + height - 1
    return max(origin_x, min(max_x, x)), max(origin_y, min(max_y, y))


def post_mouse_event(quartz, event_type, x, y, button):
    if hasattr(quartz, "CGPointMake"):
        point = quartz.CGPointMake(x, y)
    else:
        point = (x, y)
    event = quartz.CGEventCreateMouseEvent(None, event_type, point, button)
    quartz.CGEventPost(quartz.kCGHIDEventTap, event)


def move_mouse(dx, dy, dry_run=False):
    dx = max(-300, min(300, int(round(float(dx)))))
    dy = max(-300, min(300, int(round(float(dy)))))
    if dry_run or sys.platform != "darwin":
        print("[dry-run] mouse move: {0}, {1}".format(dx, dy))
        return

    quartz = load_quartz()
    x, y = current_mouse_position(quartz)
    x, y = clamp_mouse_position(quartz, x + dx, y + dy)
    post_mouse_event(quartz, quartz.kCGEventMouseMoved, x, y, quartz.kCGMouseButtonLeft)


def drag_mouse(dx, dy, dry_run=False):
    dx = max(-300, min(300, int(round(float(dx)))))
    dy = max(-300, min(300, int(round(float(dy)))))
    if dry_run or sys.platform != "darwin":
        print("[dry-run] mouse drag: {0}, {1}".format(dx, dy))
        return

    quartz = load_quartz()
    x, y = current_mouse_position(quartz)
    x, y = clamp_mouse_position(quartz, x + dx, y + dy)
    post_mouse_event(quartz, quartz.kCGEventLeftMouseDragged, x, y, quartz.kCGMouseButtonLeft)


def mouse_button_down(button_name="left", dry_run=False):
    if button_name not in MOUSE_BUTTONS:
        raise ValueError("unsupported mouse button")
    if dry_run or sys.platform != "darwin":
        print("[dry-run] mouse down: {0}".format(button_name))
        return

    quartz = load_quartz()
    x, y = current_mouse_position(quartz)
    if button_name == "right":
        post_mouse_event(quartz, quartz.kCGEventRightMouseDown, x, y, quartz.kCGMouseButtonRight)
    else:
        post_mouse_event(quartz, quartz.kCGEventLeftMouseDown, x, y, quartz.kCGMouseButtonLeft)


def mouse_button_up(button_name="left", dry_run=False):
    if button_name not in MOUSE_BUTTONS:        raise ValueError("unsupported mouse button")
    if dry_run or sys.platform != "darwin":
        print("[dry-run] mouse up: {0}".format(button_name))
        return

    quartz = load_quartz()
    x, y = current_mouse_position(quartz)
    if button_name == "right":
        post_mouse_event(quartz, quartz.kCGEventRightMouseUp, x, y, quartz.kCGMouseButtonRight)
    else:
        post_mouse_event(quartz, quartz.kCGEventLeftMouseUp, x, y, quartz.kCGMouseButtonLeft)


def click_mouse(button_name="left", dry_run=False):
    if button_name not in MOUSE_BUTTONS:
        raise ValueError("unsupported mouse button")
    if dry_run or sys.platform != "darwin":
        print("[dry-run] mouse click: {0}".format(button_name))
        return

    quartz = load_quartz()
    x, y = current_mouse_position(quartz)
    if button_name == "right":
        button = quartz.kCGMouseButtonRight
        down = quartz.kCGEventRightMouseDown
        up = quartz.kCGEventRightMouseUp
    else:
        button = quartz.kCGMouseButtonLeft
        down = quartz.kCGEventLeftMouseDown
        up = quartz.kCGEventLeftMouseUp

    post_mouse_event(quartz, down, x, y, button)
    time.sleep(0.02)
    post_mouse_event(quartz, up, x, y, button)


def scroll_mouse(dy, dry_run=False):
    dy = max(-120, min(120, int(round(float(dy)))))
    if dry_run or sys.platform != "darwin":
        print("[dry-run] mouse scroll: {0}".format(dy))
        return

    quartz = load_quartz()
    direction = -dy
    units = getattr(quartz, "kCGScrollEventUnitPixel", 0)
    event = quartz.CGEventCreateScrollWheelEvent(None, units, 1, direction)
    quartz.CGEventPost(quartz.kCGHIDEventTap, event)


def open_chrome(dry_run=False):
    if dry_run or sys.platform != "darwin":
        print("[dry-run] open Google Chrome")
        return
    subprocess.Popen(["open", "-a", "Google Chrome"])


def shutdown_mac(dry_run=False):
    if dry_run or sys.platform != "darwin":
        print("[dry-run] shut down Mac")
        return
    subprocess.Popen([
        "osascript",
        "-e",
        'tell application "System Events" to shut down',
    ])


class RemoteHandler(BaseHTTPRequestHandler):
    server_version = "MacTextRemote/1.1"
    protocol_version = "HTTP/1.0"

    def do_GET(self):
        if self.path == "/" or self.path.startswith("/?"):
            self.send_bytes(200, INDEX_HTML, "text/html; charset=utf-8")
        elif self.path == "/health":
            self.send_json(200, {"ok": True})
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        try:
            if self.path == "/api/paste":
                payload = self.read_payload()
                text = payload.get("text", "")
                if not isinstance(text, string_types):
                    raise ValueError("text must be a string")
                with CONTROL_LOCK:
                    paste_text(text, self.server.dry_run)
                self.send_json(200, {"ok": True, "characters": len(as_text(text))})
            elif self.path == "/api/key":
                payload = self.read_payload()
                key = payload.get("key", "")
                if key not in KEY_CODES:
                    raise ValueError("unsupported key")
                with CONTROL_LOCK:
                    press_key(key, self.server.dry_run)
                self.send_json(200, {"ok": True})
            elif self.path == "/api/mouse":
                payload = self.read_payload()
                action = payload.get("action", "")
                with CONTROL_LOCK:
                    if action == "move":
                        move_mouse(payload.get("dx", 0), payload.get("dy", 0), self.server.dry_run)
                    elif action == "drag":
                        drag_mouse(payload.get("dx", 0), payload.get("dy", 0), self.server.dry_run)
                    elif action == "click":
                        click_mouse(payload.get("button", "left"), self.server.dry_run)
                    elif action == "down":
                        mouse_button_down(payload.get("button", "left"), self.server.dry_run)
                    elif action == "up":
                        mouse_button_up(payload.get("button", "left"), self.server.dry_run)
                    elif action == "scroll":
                        scroll_mouse(payload.get("dy", 0), self.server.dry_run)
                    else:
                        raise ValueError("unsupported mouse action")
                self.send_json(200, {"ok": True})
            elif self.path == "/api/system":
                payload = self.read_payload()
                action = payload.get("action", "")
                if action == "open_chrome":
                    open_chrome(self.server.dry_run)
                    self.send_json(200, {"ok": True})
                elif action == "shutdown":
                    # Reply first so the phone receives success before macOS begins shutdown.
                    self.send_json(200, {"ok": True})
                    shutdown_mac(self.server.dry_run)
                else:
                    raise ValueError("unsupported system action")
            else:
                self.send_json(404, {"error": "not found"})
        except Exception as exc:
            self.send_json(400, {"error": str(exc)})

    def read_payload(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("invalid content length")

        if length < 0:
            raise ValueError("invalid content length")
        if length > MAX_BODY_BYTES:
            raise ValueError("request is too large")

        raw = self.rfile.read(length)
        content_type = self.headers.get("Content-Type", "")
        if "application/json" in content_type:
            return json.loads(as_text(raw or b"{}"))

        parsed = parse_qs(as_text(raw), keep_blank_values=True)
        return dict((key, values[-1] if values else "") for key, values in parsed.items())

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, status, body, content_type):
        body = as_bytes(body)
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("{0} - {1}".format(self.address_string(), fmt % args))


class RemoteHTTPServer(ThreadingMixIn, HTTPServer):
    # A browser may open an HTTP connection and leave it idle. With the
    # standard single-threaded HTTPServer, that blocks every other client.
    # Handle each accepted connection independently and reap idle ones.
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 32

    def __init__(self, address, handler, dry_run=False):
        HTTPServer.__init__(self, address, handler)
        self.dry_run = dry_run

    def get_request(self):
        request, client_address = HTTPServer.get_request(self)
        request.settimeout(CLIENT_SOCKET_TIMEOUT)
        return request, client_address


def main():
    parser = argparse.ArgumentParser(description="iPhone web page for pasting text into the active Mac field.")
    parser.add_argument("--host", default="0.0.0.0", help="Host/interface to bind. Default: 0.0.0.0")
    parser.add_argument("--port", default=DEFAULT_PORT, type=int, help="Port to listen on. Default: 8787")
    parser.add_argument("--dry-run", action="store_true", help="Do not control the Mac; print actions instead.")
    args = parser.parse_args()

    server = RemoteHTTPServer((args.host, args.port), RemoteHandler, dry_run=args.dry_run)
    ip = local_ip()
    print("Mac Text Remote is running.")
    print("Open from iPhone: http://{0}:{1}".format(ip, args.port))
    print("Local Mac URL:    http://127.0.0.1:{0}".format(args.port))
    server.serve_forever()


if __name__ == "__main__":
    main()