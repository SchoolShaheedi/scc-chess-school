# Local preview of the built app on :8752 with the live site's headers (read from the build's _headers).
# tools/preview-copy.sh copies this next to the build folder it serves ("school/"), because the preview
# process may not read ~/Desktop. It never chdirs INTO the build folder: a rebuild replaces that folder.
import http.server, os, socketserver, pathlib
ROOT = pathlib.Path(__file__).parent / "school"
os.chdir(ROOT.parent)
HEADERS, block = {}, None
for line in ((ROOT / "_headers").read_text() if (ROOT / "_headers").exists() else "").splitlines():
    if line.startswith("/*"): block = True; continue
    if line and not line.startswith(" "): block = False
    if block and ":" in line and line.startswith("  "):
        k, v = line.strip().split(":", 1); HEADERS[k.strip()] = v.strip()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ROOT), **k)
    def translate_path(self, path):
        p = path.split("?", 1)[0].split("#", 1)[0]
        return str(ROOT / p.lstrip("/")) if p != "/" else str(ROOT / "index.html")
    def end_headers(self):
        for k, v in HEADERS.items(): self.send_header(k, v)
        self.send_header("Cache-Control", "no-cache"); super().end_headers()
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", 8752), H) as s: s.serve_forever()
