from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from typing import Tuple

from clustering import cluster_tokens


class ClusterHandler(BaseHTTPRequestHandler):
    def _send_json(self, obj, status=200):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/cluster":
            self._send_json({"error": "not found"}, status=404)
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            payload = json.loads(body.decode("utf-8")) if body else {}
            tokens = payload.get("tokens", [])

            clusters = cluster_tokens(tokens)
            resp = {"total_topics": len(clusters), "clusters": clusters}
            self._send_json(resp)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def log_message(self, format: str, *args: Tuple) -> None:  # reduce noise
        return


def run(host: str = "127.0.0.1", port: int = 8000):
    server = HTTPServer((host, port), ClusterHandler)
    print(f"Starting simple cluster server on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down server")
        server.server_close()


if __name__ == "__main__":
    run()
