#!/usr/bin/env python3
"""
Advanced OpenVoice TTS Server for Headroom using ElevenLabs API.
This implementation connects to ElevenLabs for high-quality voices.
"""

import os
import sys
import json
import time
import logging
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
import io
import requests

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("elevenlabs-openvoice")

# Constants
PORT = 8008
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tts_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# ElevenLabs API settings
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")

class ElevenLabsOpenVoiceTTSHandler(BaseHTTPRequestHandler):
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
            self.wfile.write(json.dumps({"status": "ok", "engine": "elevenlabs-openvoice"}).encode())
        
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
                {"id": "eleven_multilingual_v2", "name": "ElevenLabs Multilingual v2", "status": "ready"},
                {"id": "eleven_turbo_v2", "name": "ElevenLabs Turbo v2", "status": "ready"},
                {"id": "eleven_enhanced", "name": "ElevenLabs Enhanced", "status": "ready"},
                {"id": "eleven_monolingual_v1", "name": "ElevenLabs Monolingual v1", "status": "ready"}
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
        """Get available voices from ElevenLabs or fallback to hardcoded list if API key is missing."""
        # If we have an API key, try to get voices from ElevenLabs
        if ELEVENLABS_API_KEY:
            try:
                headers = {
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json"
                }
                response = requests.get(f"{ELEVENLABS_API_URL}/voices", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    voices = []
                    for voice in data.get("voices", []):
                        voices.append({
                            "id": voice.get("voice_id"),
                            "name": voice.get("name"),
                            "language": "en-US" if "en" in voice.get("labels", {}).get("language", "en") else voice.get("labels", {}).get("language", "unknown"),
                            "status": "ready"
                        })
                    return voices
                else:
                    logger.warning(f"Failed to get voices from ElevenLabs API: {response.status_code}")
            except Exception as e:
                logger.error(f"Error getting voices from ElevenLabs API: {str(e)}")
        
        # Fallback to hardcoded list if API key is missing or API call fails
        return [
            {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "language": "en-US", "status": "ready"},
            {"id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "language": "en-US", "status": "ready"},
            {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "language": "en-US", "status": "ready"},
            {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "language": "en-US", "status": "ready"},
            {"id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "language": "en-US", "status": "ready"},
            {"id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh", "language": "en-US", "status": "ready"},
            {"id": "VR6AewLTigWG4xSOukaG", "name": "Arnold", "language": "en-US", "status": "ready"},
            {"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "language": "en-US", "status": "ready"},
            {"id": "yoZ06aMxZJJ28mfd3POQ", "name": "Sam", "language": "en-US", "status": "ready"},
            {"id": "z9fAnlkpzviPz146aGWa", "name": "Glinda", "language": "en-US", "status": "ready"},
            {"id": "g5CIjZEefAph4nQFvHAz", "name": "Freya (British)", "language": "en-GB", "status": "ready"},
            {"id": "jBpfuIE2acCO8z3wKNLl", "name": "Harry (British)", "language": "en-GB", "status": "ready"},
            {"id": "onwK4e9ZLuTAKqWW03F9", "name": "Giovanni (Italian)", "language": "it-IT", "status": "ready"},
            {"id": "XB0fDUnXU5powFXDhCwa", "name": "Charlotte (German)", "language": "de-DE", "status": "ready"},
            {"id": "jsCqWAovK2LkecY7zXl4", "name": "Pierre (French)", "language": "fr-FR", "status": "ready"},
            {"id": "ZQe5CZNOzWyzPSCn5a3c", "name": "Carmen (Spanish)", "language": "es-ES", "status": "ready"},
            {"id": "kgG7dbiSUj2sV3Ph4ftQ", "name": "Matias (Spanish)", "language": "es-ES", "status": "ready"},
            {"id": "t0jbNlBVZ17f02VDIeMI", "name": "Hiroshi (Japanese)", "language": "ja-JP", "status": "ready"}
        ]
    
    def do_POST(self):
        if self.path == "/tts":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request = json.loads(post_data.decode())
            text = request.get("text", "")
            speaker = request.get("speaker", "21m00Tcm4TlvDq8ikWAM")  # Rachel by default
            model = request.get("model", "eleven_multilingual_v2")
            
            logger.info(f"TTS request: text='{text[:50]}...', speaker='{speaker}', model='{model}'")
            
            try:
                # Generate audio
                audio_data = self.generate_audio(text, speaker, model)
                
                # Return audio
                self.send_response(200)
                self.send_header('Content-type', 'audio/mpeg')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(audio_data)
                
                logger.info(f"Response sent successfully: {len(audio_data)} bytes")
                
            except Exception as e:
                logger.error(f"Error generating TTS: {str(e)}")
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
    
    def map_model_to_elevenlabs(self, model):
        """Map our model names to ElevenLabs model IDs."""
        model_mapping = {
            "eleven_multilingual_v2": "eleven_multilingual_v2",
            "eleven_turbo_v2": "eleven_turbo_v2",
            "eleven_enhanced": "eleven_monolingual_v1",
            "eleven_monolingual_v1": "eleven_monolingual_v1"
        }
        return model_mapping.get(model, "eleven_multilingual_v2")
    
    def generate_audio(self, text, voice_id, model):
        """Generate audio for text using ElevenLabs API or fallback to gTTS."""
        import hashlib
        
        logger.info(f"Generating speech for: '{text[:50]}...'")
        
        # Create a cache key based on the text, voice, and model
        cache_key = hashlib.md5(f"{text}_{voice_id}_{model}".encode()).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.mp3")
        
        # Check if we have this in cache
        if os.path.exists(cache_path):
            logger.info(f"Using cached audio for: '{text[:30]}...'")
            with open(cache_path, "rb") as f:
                return f.read()
        
        # Try ElevenLabs if API key is available
        if ELEVENLABS_API_KEY:
            try:
                logger.info(f"Using ElevenLabs API for voice_id: {voice_id}")
                
                headers = {
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json"
                }
                
                elevenlabs_model = self.map_model_to_elevenlabs(model)
                
                data = {
                    "text": text,
                    "model_id": elevenlabs_model,
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }
                
                response = requests.post(
                    f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}",
                    json=data,
                    headers=headers,
                    stream=True
                )
                
                if response.status_code == 200:
                    # Read all audio data
                    audio_data = response.content
                    
                    # Save to cache
                    with open(cache_path, "wb") as f:
                        f.write(audio_data)
                    
                    return audio_data
                else:
                    logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
                    raise Exception(f"ElevenLabs API error: {response.status_code}")
            
            except Exception as e:
                logger.error(f"Error using ElevenLabs API: {str(e)}")
                logger.info("Falling back to gTTS...")
        
        # Fallback to gTTS if ElevenLabs fails or API key is missing
        try:
            from gtts import gTTS
            
            # Determine language based on voice ID (simplified mapping)
            language_mapping = {
                "onwK4e9ZLuTAKqWW03F9": "it",  # Giovanni
                "XB0fDUnXU5powFXDhCwa": "de",  # Charlotte
                "jsCqWAovK2LkecY7zXl4": "fr",  # Pierre
                "ZQe5CZNOzWyzPSCn5a3c": "es",  # Carmen
                "kgG7dbiSUj2sV3Ph4ftQ": "es",  # Matias
                "t0jbNlBVZ17f02VDIeMI": "ja",  # Hiroshi
                "g5CIjZEefAph4nQFvHAz": "en-gb",  # Freya
                "jBpfuIE2acCO8z3wKNLl": "en-gb",  # Harry
            }
            
            language = language_mapping.get(voice_id, "en")
            
            # Generate speech with gTTS
            tts = gTTS(text=text, lang=language, slow=False)
            
            # Save to memory buffer
            mp3_buffer = io.BytesIO()
            tts.write_to_fp(mp3_buffer)
            mp3_data = mp3_buffer.getvalue()
            
            # Save to cache
            with open(cache_path, "wb") as f:
                f.write(mp3_data)
            
            return mp3_data
            
        except Exception as e:
            logger.error(f"Error generating speech with gTTS: {str(e)}")
            raise Exception(f"Failed to generate speech: {str(e)}")

def run_server():
    """Start the HTTP server."""
    try:
        # Check for ElevenLabs API key
        if not ELEVENLABS_API_KEY:
            logger.warning("No ElevenLabs API key found in environment. Will use fallback to gTTS.")
            logger.warning("To use ElevenLabs, set the ELEVENLABS_API_KEY environment variable.")
            
            # Try to import gTTS to check if it's installed for fallback
            try:
                from gtts import gTTS
                logger.info("gTTS library found - ready for fallback speech synthesis")
            except ImportError:
                logger.error("gTTS library not found. Please install it with: pip install gtts")
                logger.error("It's required for fallback TTS when ElevenLabs API key is not provided.")
                sys.exit(1)
        else:
            logger.info("ElevenLabs API key found - ready to use ElevenLabs API")
        
        # Verify we can make requests
        import requests
        logger.info("Requests library found - ready for API communication")
        
    except ImportError:
        logger.error("Required libraries not found. Please install them with: pip install requests gtts")
        logger.error("Server cannot run without these libraries. Exiting.")
        sys.exit(1)
    
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ElevenLabsOpenVoiceTTSHandler)
    logger.info(f"Starting OpenVoice TTS server with ElevenLabs on port {PORT}")
    logger.info(f"Server running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped")

if __name__ == "__main__":
    run_server()