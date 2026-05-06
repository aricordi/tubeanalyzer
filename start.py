#!/usr/bin/env python3
"""
TubeAnalyzer — one-click launcher
Run: python start.py  (or double-click it)
Opens your browser at http://localhost:8765
"""
import http.server
import socketserver
import webbrowser
import threading
import os
import sys

PORT = 8765
HOST = "localhost"
URL  = f"http://{HOST}:{PORT}"

# ── Move to the repo root (wherever this script lives) ──────────────────────
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# ── Serve with proper MIME types and CORS (needed for Babel standalone) ──────
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        # Allow Google Identity Services popup to communicate with the parent.
        # Without this, browsers print COOP warnings on every OAuth popup tick.
        self.send_header("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Silence the default per-request logs — keep terminal clean
        pass

    def log_error(self, fmt, *args):
        # Suppress 404s for favicon etc.
        pass

# ── Try to start the server ──────────────────────────────────────────────────
try:
    server = socketserver.TCPServer((HOST, PORT), Handler)
    server.allow_reuse_address = True
except OSError as e:
    if e.errno in (98, 48):   # 98=Linux already-in-use, 48=macOS
        print(f"\n  Port {PORT} is already in use.")
        print(f"  TubeAnalyzer may already be running — try opening {URL} in your browser.\n")
    else:
        print(f"\n  Could not start server: {e}\n")
    sys.exit(1)

print()
print("  ╔══════════════════════════════════════╗")
print("  ║         TubeAnalyzer — running       ║")
print("  ╚══════════════════════════════════════╝")
print()
print(f"   → Open in browser:  {URL}")
print()
print("   Press Ctrl+C to stop the server.")
print()

# ── Open browser after a short delay ─────────────────────────────────────────
def open_browser():
    import time
    time.sleep(0.8)
    webbrowser.open(URL)

threading.Thread(target=open_browser, daemon=True).start()

# ── Serve forever (Ctrl+C to stop) ───────────────────────────────────────────
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\n\n  Server stopped. Goodbye!\n")
    server.shutdown()
