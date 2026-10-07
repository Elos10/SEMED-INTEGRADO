from http.server import BaseHTTPRequestHandler
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import parse_qs, urlparse
import json
import os
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        expected = os.environ.get('QR_HMAC_SECRET', '')
        if not expected or self.headers.get('X-OMR-Secret') != expected:
            self.respond(403, {'message': 'Acesso não autorizado ao processador OMR.'})
            return
        try:
            from workers.omr.omr_worker import processar_arquivo
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > 15 * 1024 * 1024:
                raise ValueError('Arquivo vazio ou acima de 15 MB.')
            extension = parse_qs(urlparse(self.path).query).get('ext', ['.bin'])[0]
            extension = extension if extension in ('.pdf', '.png', '.jpg', '.jpeg') else '.bin'
            with NamedTemporaryFile(prefix='omr-', suffix=extension, delete=False, dir='/tmp') as temporary:
                temporary.write(self.rfile.read(length))
                temporary_path = Path(temporary.name)
            try:
                self.respond(200, processar_arquivo(temporary_path))
            finally:
                temporary_path.unlink(missing_ok=True)
        except Exception as error:
            self.respond(422, {'message': str(error)[:500]})

    def respond(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
