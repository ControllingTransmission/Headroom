#!/bin/bash

# Script to set up and launch the OpenVoice TTS server
# This script uses gTTS to provide real speech synthesis

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "╔════════════════════════════════════════════════════════════╗"
echo -e "║                 OPENVOICE TTS LAUNCHER                     ║"
echo -e "╚════════════════════════════════════════════════════════════╝"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in your PATH.${NC}"
    echo -e "${RED}Please install Python 3 before continuing.${NC}"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo -e "${GREEN}✓ Found Python $PYTHON_VERSION${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "openvoice_env" ]; then
    echo -e "${BLUE}Creating virtual environment for OpenVoice...${NC}"
    python3 -m venv openvoice_env
    
    if [ ! -d "openvoice_env" ]; then
        echo -e "${RED}Failed to create virtual environment.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
source openvoice_env/bin/activate

# Check for required OpenVoice dependencies
if python -c "import numpy, torch, torchaudio" &> /dev/null; then
    echo -e "${GREEN}✓ Basic dependencies are already installed${NC}"
else
    echo -e "${BLUE}Installing required dependencies...${NC}"
    
    pip install numpy torch torchaudio
    
    # Verify installation
    if ! python -c "import numpy, torch, torchaudio" &> /dev/null; then
        echo -e "${RED}Failed to install required dependencies.${NC}"
        deactivate
        exit 1
    fi
    
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
fi

# Check if we already have the OpenVoice server
if [ -f "openvoice_server.py" ]; then
    echo -e "${GREEN}✓ OpenVoice server already exists${NC}"
else
    echo -e "${BLUE}Creating OpenVoice server script...${NC}"
    
    # Create a basic server script
    cat > openvoice_server.py << 'EOF'
#!/usr/bin/env python3
"""
OpenVoice TTS Server for Headroom using gTTS.
This implementation provides real speech synthesis using Google's Text-to-Speech API.
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
            self.wfile.write(json.dumps({"status": "ok", "engine": "openvoice-gtts"}).encode())
        
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
                {"id": "slow", "name": "Slow", "status": "ready"},
                {"id": "fast", "name": "Fast", "status": "ready"}
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
        """Return available voice options."""
        return [
            {"id": "default", "name": "Default (en-US)", "language": "en-US", "status": "ready"},
            {"id": "en-US", "name": "English (US)", "language": "en-US", "status": "ready"},
            {"id": "en-GB", "name": "English (UK)", "language": "en-GB", "status": "ready"},
            {"id": "en-AU", "name": "English (Australia)", "language": "en-AU", "status": "ready"},
            {"id": "fr-FR", "name": "French", "language": "fr-FR", "status": "ready"},
            {"id": "de-DE", "name": "German", "language": "de-DE", "status": "ready"},
            {"id": "es-ES", "name": "Spanish", "language": "es-ES", "status": "ready"},
            {"id": "it-IT", "name": "Italian", "language": "it-IT", "status": "ready"},
            {"id": "ja-JP", "name": "Japanese", "language": "ja-JP", "status": "ready"},
            {"id": "ko-KR", "name": "Korean", "language": "ko-KR", "status": "ready"},
            {"id": "zh-CN", "name": "Chinese (Mandarin)", "language": "zh-CN", "status": "ready"},
        ]
    
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
                
                # Generate audio using gTTS
                audio_data = self.generate_audio(text, voice_id, model)
                
                # Return audio
                self.send_response(200)
                self.send_header('Content-type', 'audio/mp3')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(audio_data)
                
                logger.info(f"Response sent successfully: {len(audio_data)} bytes")
                
            except Exception as e:
                logger.error(f"Error handling TTS request: {str(e)}")
                try:
                    # Send a simple tone as fallback
                    fallback_audio = self.generate_fallback_audio()
                    self.send_response(200)
                    self.send_header('Content-type', 'audio/wav')
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(fallback_audio)
                except Exception:
                    # If even that fails, send error
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
    
    def generate_audio(self, text, voice_id, model):
        """Generate audio for text using gTTS."""
        from gtts import gTTS
        import gtts.lang
        
        logger.info(f"Generating speech for: '{text[:50]}...' with voice '{voice_id}'")
        
        # Create a cache key based on the text, voice, and model
        cache_key = hashlib.md5(f"{text}_{voice_id}_{model}".encode()).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.mp3")
        
        # Check if we have this in cache
        if os.path.exists(cache_path):
            logger.info(f"Using cached audio for: '{text[:30]}...'")
            with open(cache_path, "rb") as f:
                return f.read()
        
        # Map voice_id to language code
        if voice_id == "default":
            lang = "en"
        else:
            # Convert from our voice ID format to gTTS format
            lang = voice_id.split("-")[0]  # Extract language part (e.g., "en" from "en-US")
            # Check if language is supported by gTTS
            if lang not in gtts.lang.tts_langs():
                logger.warning(f"Language '{lang}' not supported by gTTS, falling back to English")
                lang = "en"
        
        # Set speed based on model
        slow = False
        if model == "slow":
            slow = True
        
        # Create a temporary file to save the audio
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
            temp_path = temp_file.name
        
        try:
            # Create gTTS object
            tts = gTTS(text=text, lang=lang, slow=slow)
            
            # Save to temp file
            tts.save(temp_path)
            
            # Read the audio data
            with open(temp_path, 'rb') as f:
                audio_data = f.read()
            
            # Cache the audio for future use
            with open(cache_path, 'wb') as f:
                f.write(audio_data)
            
            return audio_data
            
        except Exception as e:
            logger.error(f"Error generating speech: {str(e)}")
            # Return a simple beep sound as fallback
            return self.generate_fallback_audio()
        
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def generate_fallback_audio(self):
        """Generate a simple beep sound as fallback when TTS fails."""
        import wave
        import struct
        import math
        
        # Create a simple beep sound
        duration = 0.5  # seconds
        frequency = 440  # Hz
        sample_rate = 16000  # Hz
        amplitude = 32767 / 2  # Half max amplitude
        
        # Generate samples
        num_samples = int(duration * sample_rate)
        samples = []
        
        for i in range(num_samples):
            # Fade in/out
            if i < sample_rate * 0.1:  # Fade in
                fade = i / (sample_rate * 0.1)
            elif i > num_samples - sample_rate * 0.1:  # Fade out
                fade = (num_samples - i) / (sample_rate * 0.1)
            else:
                fade = 1.0
                
            sample = amplitude * fade * math.sin(2 * math.pi * frequency * i / sample_rate)
            samples.append(int(sample))
        
        # Create WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
        
        try:
            with wave.open(temp_path, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                
                # Convert samples to bytes
                for sample in samples:
                    wav_file.writeframes(struct.pack('<h', sample))
            
            # Read data
            with open(temp_path, 'rb') as f:
                return f.read()
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

def run_server():
    """Start the HTTP server."""
    try:
        # Try to import gTTS to check if it's installed
        from gtts import gTTS
        logger.info("gTTS library found - ready for text-to-speech")
    except ImportError:
        logger.error("gTTS library not found. Attempting to install it...")
        import subprocess
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "gtts"])
            from gtts import gTTS
            logger.info("gTTS installed successfully")
        except Exception as e:
            logger.error(f"Failed to install gTTS: {str(e)}")
            logger.error("Please install it manually with: pip install gtts")
            sys.exit(1)
    
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
EOF
    
    # Make it executable
    chmod +x openvoice_server.py
    
    echo -e "${GREEN}✓ OpenVoice server script created${NC}"
fi

# Create the tts_cache directory if it doesn't exist
if [ ! -d "tts_cache" ]; then
    echo -e "${BLUE}Creating cache directory...${NC}"
    mkdir -p tts_cache
    echo -e "${GREEN}✓ Cache directory created${NC}"
fi

echo
echo -e "${BLUE}Starting OpenVoice TTS server...${NC}"
echo -e "${BLUE}The server will run on http://localhost:8008${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server.${NC}"
echo

# Start the OpenVoice server
python openvoice_server.py

# Deactivate virtual environment when done
deactivate