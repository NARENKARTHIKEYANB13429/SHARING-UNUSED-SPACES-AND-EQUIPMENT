"""
ShareSpace Local Development Server
Serves the ShareSpace responsive web application on port 8080 (or port 8000 fallback)
Matching .vscode/launch.json configuration
"""

import http.server
import socketserver
import os
import sys

DEFAULT_PORT = 8080
FALLBACK_PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class ShareSpaceHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    
    port = DEFAULT_PORT
    try:
        httpd = socketserver.TCPServer(("", port), ShareSpaceHTTPRequestHandler)
    except OSError:
        print(f"Port {DEFAULT_PORT} in use, trying fallback port {FALLBACK_PORT}...")
        port = FALLBACK_PORT
        httpd = socketserver.TCPServer(("", port), ShareSpaceHTTPRequestHandler)

    print(f"\n========================================================")
    print(f"  ShareSpace Application Running!")
    print(f"  Local URL: http://localhost:{port}")
    print(f"========================================================\n")
    sys.stdout.flush()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == '__main__':
    run_server()
