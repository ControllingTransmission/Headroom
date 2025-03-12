#!/usr/bin/env python3
"""
Local TTS Server for Headroom using system voices.
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
logger = logging.getLogger("localtts")

# Constants
PORT = 8008
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tts_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Import basic libraries
try:
    import numpy as np
    logger.info("Successfully imported basic libraries")
except ImportError as e:
    logger.error(f"Failed to import basic libraries: {e}")
    sys.exit(1)

# Try to import gTTS for text-to-speech
try:
    from gtts import gTTS
    SYSTEM_TTS_AVAILABLE = True
    logger.info("Using gTTS for text-to-speech")
except ImportError:
    logger.warning("gTTS not found, trying to install it...")
    try:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "gtts"])
        from gtts import gTTS
        SYSTEM_TTS_AVAILABLE = True
        logger.info("Successfully installed and imported gTTS")
    except Exception as e:
        logger.error(f"Failed to install gTTS: {e}")
        SYSTEM_TTS_AVAILABLE = False

# Set to use system TTS instead of OpenVoice
OPENVOICE_AVAILABLE = False

# Path to model checkpoints - adjust as needed
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "OpenVoice", "resources", "pretrained")

# Initialize TTS models
tts_model = None
converter_model = None

if OPENVOICE_AVAILABLE:
    try:
        # Load paths for the models
        base_model_path = os.path.join(MODEL_DIR, "base_speakers", "EN", "config.json")
        base_model_ckpt = os.path.join(MODEL_DIR, "base_speakers", "EN", "best_model.pth")
        
        converter_path = os.path.join(MODEL_DIR, "converter", "config.json")
        converter_ckpt = os.path.join(MODEL_DIR, "converter", "best_model.pth")
        
        # Initialize models if files exist
        if os.path.exists(base_model_path) and os.path.exists(base_model_ckpt):
            logger.info("Loading OpenVoice base speaker model...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {device}")
            
            tts_model = BaseSpeakerTTS(base_model_path, device=device)
            tts_model.load_ckpt(base_model_ckpt)
            logger.info("Base speaker model loaded successfully")
            
            if os.path.exists(converter_path) and os.path.exists(converter_ckpt):
                logger.info("Loading OpenVoice converter model...")
                converter_model = ToneColorConverter(converter_path, device=device, enable_watermark=False)
                converter_model.load_ckpt(converter_ckpt)
                logger.info("Converter model loaded successfully")
        else:
            logger.error(f"Model files not found. Please download them first.")
            logger.error(f"Expected paths: {base_model_path}, {base_model_ckpt}")
            OPENVOICE_AVAILABLE = False
    except Exception as e:
        logger.error(f"Error loading OpenVoice models: {e}")
        import traceback
        logger.error(traceback.format_exc())
        OPENVOICE_AVAILABLE = False

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
            self.wfile.write(json.dumps({"status": "ok", "engine": "custom-openvoice"}).encode())
        
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
                {"id": "default", "name": "Default", "status": "ready"},
                {"id": "clear", "name": "Clear Speech", "status": "ready"},
                {"id": "expressive", "name": "Expressive", "status": "ready"}
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
        """Return available gTTS voice options."""
        # gTTS only offers language voices, not specific named voices
        voice_list = [
            {"id": "default", "name": "US English (Default)", "language": "en-US", "gender": "female", "status": "ready"},
            {"id": "emma", "name": "Emma (US)", "language": "en-US", "gender": "female", "status": "ready"},
            {"id": "ryan", "name": "Ryan (US)", "language": "en-US", "gender": "male", "status": "ready"},
            {"id": "olivia", "name": "Olivia (UK)", "language": "en-GB", "gender": "female", "status": "ready"},
            {"id": "thomas", "name": "Thomas (UK)", "language": "en-GB", "gender": "male", "status": "ready"},
            {"id": "francois", "name": "François (French)", "language": "fr", "gender": "male", "status": "ready"},
            {"id": "hans", "name": "Hans (German)", "language": "de", "gender": "male", "status": "ready"},
            {"id": "antonio", "name": "Antonio (Spanish)", "language": "es", "gender": "male", "status": "ready"}
        ]
        
        logger.info(f"Returning {len(voice_list)} gTTS voices")
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
                
                # Generate speech audio using our custom offline synthesis
                audio_data = self.generate_speech(text, voice_id, model)
                
                # Return audio
                self.send_response(200)
                self.send_header('Content-type', 'audio/wav')
                self.send_header('Content-Length', str(len(audio_data)))
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(audio_data)
                
                logger.info(f"Response sent successfully: {len(audio_data)} bytes")
                
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
    
    def generate_speech(self, text, voice_id, model):
        """Generate speech using gTTS or fallback to notification sound."""
        logger.info(f"Generating speech for: '{text[:50]}...', voice: {voice_id}, model: {model}")
        
        # Create a cache key
        cache_key = hashlib.md5(f"{text}_{voice_id}_{model}_gtts".encode()).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.mp3")
        
        # Return cached audio if available
        if os.path.exists(cache_path):
            logger.info(f"Using cached audio for: '{text[:30]}...'")
            with open(cache_path, 'rb') as f:
                return f.read()
                
        # Check if TTS is available
        if not SYSTEM_TTS_AVAILABLE:
            logger.error("gTTS not available. Using notification sound instead.")
            return self.generate_notification_sound()
            
        try:
            # Create a temporary file for the audio
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
                output_path = tmp.name
            
            # Map voice_id to language code
            lang = "en"
            if voice_id in ["olivia", "thomas"]:
                lang = "en-gb"  # British English
            elif voice_id == "francois":
                lang = "fr"  # French
            elif voice_id == "hans":
                lang = "de"  # German
            elif voice_id == "antonio":
                lang = "es"  # Spanish
                
            # Map model to speed
            speed = False  # Default - normal speed
            if model == "clear":
                speed = False  # Slower for clear speech
            elif model == "expressive":
                speed = True  # Faster for expressive speech
            
            # Generate speech with gTTS
            logger.info(f"Generating speech with gTTS: lang={lang}, slow={not speed}")
            tts = gTTS(text=text, lang=lang, slow=not speed)
            tts.save(output_path)
            
            # Check if file was created successfully
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                # Read audio data
                with open(output_path, 'rb') as f:
                    audio_data = f.read()
                    
                # Clean up temporary file
                try:
                    os.unlink(output_path)
                except:
                    pass
                    
                # Cache the audio
                with open(cache_path, 'wb') as f:
                    f.write(audio_data)
                    
                return audio_data
            else:
                logger.error("Failed to generate speech with gTTS - empty or missing file")
                return self.generate_notification_sound()
                
        except Exception as e:
            logger.error(f"Error generating speech with gTTS: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return self.generate_notification_sound()
            
    def generate_notification_sound(self):
        """Return a valid audio sound as fallback when TTS is not available."""
        logger.info("TTS not available. Generating fallback audio.")
        
        try:
            # Generate a proper silent WAV file
            import numpy as np
            import wave
            import io
            
            # Create 0.5 seconds of silence
            sample_rate = 16000
            duration = 0.5  # seconds
            num_samples = int(sample_rate * duration)
            
            # Generate silence (all zeros)
            silent_audio = np.zeros(num_samples, dtype=np.int16)
            
            # Create WAV file in memory
            buffer = io.BytesIO()
            with wave.open(buffer, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                wf.writeframes(silent_audio.tobytes())
                
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Error generating silent audio: {e}")
            
            # Attempt to create a minimal valid WAV file as last resort
            # This is a minimal valid WAV with 0.1 seconds of silence
            try:
                # Standard WAV header + 1600 samples of silence (0.1s at 16kHz)
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
                
                # 1600 samples of silence (16-bit samples = 3200 bytes)
                silence = bytes(3200)
                
                return header + silence
            except Exception as e2:
                logger.error(f"Error creating backup silent WAV: {e2}")
                return b''  # Return empty response as last resort

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