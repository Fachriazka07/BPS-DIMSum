import os
import sys
import argparse
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# CLI / ENV configuration
def _parse_args():
    parser = argparse.ArgumentParser(description='DIMSum-BPS static dev server')
    parser.add_argument('--port', type=int, default=int(os.environ.get('PORT', '8000')), help='Port to bind (default: 8000)')
    parser.add_argument('--host', type=str, default=os.environ.get('HOST', '0.0.0.0'), help='Host to bind (default: 0.0.0.0)')
    return parser.parse_args()

_ARGS = _parse_args()
PORT = _ARGS.port
HOST = _ARGS.host

SQLITE_DIR = os.path.join(BASE_DIR, 'sqlite')
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')
INFOGRAFIS_DIR = os.path.join(SQLITE_DIR, 'infografis')
EXCEL_DIR = os.path.join(ASSETS_DIR, 'excel')

os.makedirs(SQLITE_DIR, exist_ok=True)
os.makedirs(INFOGRAFIS_DIR, exist_ok=True)
os.makedirs(EXCEL_DIR, exist_ok=True)


def _safe_filename(name: str) -> str:
    # Basic filename sanitization
    name = name.replace('\\', '/').split('/')[-1]
    # Allow alnum, dash, underscore, dot
    safe = ''.join(c for c in name if c.isalnum() or c in ('-', '_', '.'))
    if not safe:
        safe = 'file.bin'
    return safe[:120]


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Content-Length')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _read_body(self) -> bytes:
        length = int(self.headers.get('Content-Length') or '0')
        if length <= 0:
            return b''
        return self.rfile.read(length)

    def do_POST(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        if parsed.path == '/api/sqlite/save':
            body = self._read_body()
            try:
                target = os.path.join(SQLITE_DIR, 'dimsum.db')
                with open(target, 'wb') as f:
                    f.write(body)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true,"message":"db saved"}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"ok":false,"error":"{str(e)}"}}'.encode('utf-8'))
            return

        if parsed.path == '/api/upload/infografis':
            filename = _safe_filename((qs.get('filename') or ['file.png'])[0])
            body = self._read_body()
            try:
                target = os.path.join(INFOGRAFIS_DIR, filename)
                with open(target, 'wb') as f:
                    f.write(body)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"ok":false,"error":"{str(e)}"}}'.encode('utf-8'))
            return

        if parsed.path == '/api/upload/excel':
            filename = _safe_filename((qs.get('filename') or ['file.xlsx'])[0])
            body = self._read_body()
            try:
                target = os.path.join(EXCEL_DIR, filename)
                with open(target, 'wb') as f:
                    f.write(body)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"ok":false,"error":"{str(e)}"}}'.encode('utf-8'))
            return

        # Default: serve 404 for unknown API
        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        if parsed.path == '/api/delete/infografis':
            filename = _safe_filename((qs.get('filename') or [''])[0])
            target = os.path.join(INFOGRAFIS_DIR, filename)
            try:
                if os.path.isfile(target):
                    os.remove(target)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"ok":false,"error":"{str(e)}"}}'.encode('utf-8'))
            return

        if parsed.path == '/api/delete/excel':
            filename = _safe_filename((qs.get('filename') or [''])[0])
            target = os.path.join(EXCEL_DIR, filename)
            try:
                if os.path.isfile(target):
                    os.remove(target)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"ok":false,"error":"{str(e)}"}}'.encode('utf-8'))
            return

        # Default unknown
        self.send_response(404)
        self.end_headers()


def run_server():
    os.chdir(BASE_DIR)
    httpd = HTTPServer((HOST, PORT), Handler)
    print(f"[dev_server] Serving {BASE_DIR} at http://{HOST}:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == '__main__':
    run_server()