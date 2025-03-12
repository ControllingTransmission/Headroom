# This is a simplified TTS server that doesn't use the full Kokoro stack
import os
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from loguru import logger

PORT = 8008

class SimpleTTSHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def do_POST(self):
        if self.path == "/tts":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request = json.loads(post_data.decode())
            text = request.get("text", "")
            
            logger.info(f"TTS request: {text}")
            
            # For a simplified server, we just return a static WAV file
            # In a real server, we would generate audio from the text
            self.send_response(200)
            self.send_header('Content-type', 'audio/wav')
            self.end_headers()
            
            # Generate a simple sine wave 
            # (this is just a placeholder, would normally use TTS)
            import numpy as np
            import wave
            import io
            
            duration = min(len(text) / 10, 5)  # Duration in seconds based on text length
            sample_rate = 24000
            frequency = 440  # A4 note frequency
            
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            sine_wave = np.sin(2 * np.pi * frequency * t) * 32767 * 0.3
            audio_data = sine_wave.astype(np.int16)
            
            # Create a WAV file in memory
            buffer = io.BytesIO()
            with wave.open(buffer, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                wf.writeframes(audio_data.tobytes())
            
            # Send the WAV file
            self.wfile.write(buffer.getvalue())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, SimpleTTSHandler)
    print(f"Starting simple TTS server on port {PORT}")
    print("This is a minimal implementation that generates simple tones (no actual TTS)")
    print(f"Server running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Server stopped")

if __name__ == "__main__":
    run_server()
