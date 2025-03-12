#!/usr/bin/env python3
"""
Minimal OpenVoice TTS Server for Headroom.
This provides the OpenVoice TTS server API endpoints without any fallbacks to web TTS or system TTS.
It generates error tones instead of speech when OpenVoice is not available.
"""

import os
import sys
import json
import time
import logging
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
import io
import hashlib
import threading
import re

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openvoice")

# Constants
PORT = 8008
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tts_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Import needed libraries
import wave
import struct
import math
# No numpy dependency

# Flag indicating OpenVoice is not available (we're generating error tones)
OPENVOICE_AVAILABLE = False
logger.warning("OpenVoice models not available - synthesizing error tones instead")

class OpenVoiceTTSHandler(BaseHTTPRequestHandler):
    # Handle CORS preflight requests
    def do_OPTIONS(self):
        logger.info("Handling OPTIONS request (CORS preflight)")
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')  # 24 hours
        self.end_headers()
    
    def send_cors_headers(self):
        """Add CORS headers to response."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def do_GET(self):
        if self.path == "/health":
            logger.info("Health check request received")
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok", 
                "engine": "openvoice", 
                "available": False
            }).encode())
        
        elif self.path == "/voices":
            logger.info("Voices request received")
            voices = self.get_voices()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"voices": voices}).encode())
        
        elif self.path == "/models":
            logger.info("Models request received")
            models = [
                {"id": "default", "name": "Default", "status": "unavailable"},
                {"id": "clear", "name": "Clear Speech", "status": "unavailable"},
                {"id": "expressive", "name": "Expressive", "status": "unavailable"}
            ]
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"models": models}).encode())
        
        else:
            logger.warning(f"Unknown GET request for path: {self.path}")
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def get_voices(self):
        """Return available OpenVoice voice options (all marked as unavailable)."""
        voice_list = [
            {"id": "default", "name": "Default Female", "language": "en-US", "gender": "female", "status": "unavailable"},
            {"id": "male", "name": "Default Male", "language": "en-US", "gender": "male", "status": "unavailable"},
            {"id": "emma", "name": "Emma", "language": "en-US", "gender": "female", "status": "unavailable"},
            {"id": "ryan", "name": "Ryan", "language": "en-US", "gender": "male", "status": "unavailable"},
            {"id": "olivia", "name": "Olivia", "language": "en-GB", "gender": "female", "status": "unavailable"},
            {"id": "thomas", "name": "Thomas", "language": "en-GB", "gender": "male", "status": "unavailable"}
        ]
        
        logger.info(f"Returning {len(voice_list)} unavailable OpenVoice voices")
        return voice_list
    
    def do_POST(self):
        if self.path == "/tts":
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request = json.loads(post_data.decode())
                text = request.get("text", "")
                voice_id = request.get("speaker", "default")
                model = request.get("model", "default")
                
                logger.info(f"TTS request: text='{text[:50]}...', voice='{voice_id}', model='{model}'")
                
                # Generate error tone instead of speech
                audio_data = self.generate_error_tone(text, voice_id, model)
                
                # Return audio
                self.send_response(200)
                self.send_header('Content-type', 'audio/wav')
                self.send_header('Content-Length', str(len(audio_data)))
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(audio_data)
                
                logger.info(f"Error tone response sent: {len(audio_data)} bytes")
                
            except Exception as e:
                logger.error(f"Error handling TTS request: {str(e)}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def generate_error_tone(self, text, voice_id, model):
        """Generate different error tones based on input parameters."""
        logger.info(f"Generating error tone for: '{text[:50]}...', voice: {voice_id}, model: {model}")
        
        # Create a cache key
        cache_key = hashlib.md5(f"{text}_{voice_id}_{model}_error_tone".encode()).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.wav")
        
        # Return cached audio if available
        if os.path.exists(cache_path):
            logger.info(f"Using cached error tone for: '{text[:30]}...'")
            with open(cache_path, 'rb') as f:
                return f.read()
        
        try:
            # Different frequency tones based on voice (to simulate different voices)
            # Male voices are lower pitch, female voices are higher
            frequency = 440  # Default (A4)
            if voice_id in ["male", "ryan", "thomas"]:
                frequency = 220  # Lower (A3)
            
            # Duration of tone based on model
            duration = 0.3  # Default
            if model == "clear":
                duration = 0.5  # Slower clear speech = longer tone
            elif model == "expressive":
                duration = 0.2  # Faster expressive speech = shorter tone
            
            # Create a simple tone
            sample_rate = 16000  # Hz
            num_samples = int(duration * sample_rate)
            
            # Generate samples - simple sine wave
            samples = []
            for i in range(num_samples):
                # Add slight decay to avoid clicks
                amplitude = 32767 * 0.3 * (1.0 - i / num_samples)  
                sample = amplitude * math.sin(2 * math.pi * frequency * i / sample_rate)
                samples.append(int(sample))
            
            # Create WAV file in memory
            buffer = io.BytesIO()
            with wave.open(buffer, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                for sample in samples:
                    wf.writeframes(struct.pack('<h', sample))
            
            audio_data = buffer.getvalue()
            
            # Cache the audio
            with open(cache_path, 'wb') as f:
                f.write(audio_data)
            
            return audio_data
            
        except Exception as e:
            logger.error(f"Error generating error tone: {e}")
            
            # As last resort, return a minimal valid WAV file with silence
            header = (
                b'RIFF' +                    # ChunkID
                (36 + 3200).to_bytes(4, 'little') +  # ChunkSize (36 + data size)
                b'WAVE' +                    # Format
                b'fmt ' +                    # Subchunk1ID
                (16).to_bytes(4, 'little') + # Subchunk1Size (16 for PCM)
                (1).to_bytes(2, 'little') +  # AudioFormat (1 for PCM)
                (1).to_bytes(2, 'little') +  # NumChannels (1 for mono)
                (16000).to_bytes(4, 'little') + # SampleRate
                (32000).to_bytes(4, 'little') + # ByteRate (SampleRate * NumChannels * BitsPerSample/8)
                (2).to_bytes(2, 'little') +  # BlockAlign (NumChannels * BitsPerSample/8)
                (16).to_bytes(2, 'little') + # BitsPerSample
                b'data' +                    # Subchunk2ID
                (3200).to_bytes(4, 'little')  # Subchunk2Size (NumSamples * NumChannels * BitsPerSample/8)
            )
            silence = bytes(3200)  # 1600 samples of silence (16-bit samples = 3200 bytes)
            return header + silence

def run_server():
    """Start the HTTP server."""
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, OpenVoiceTTSHandler)
    logger.info(f"Starting OpenVoice TTS server on port {PORT}")
    logger.info(f"Server running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped")

if __name__ == "__main__":
    run_server()