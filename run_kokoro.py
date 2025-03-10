#!/usr/bin/env python
# run_kokoro.py - Script to run Kokoro TTS as a server
# Based on the current Kokoro API (version 0.8.4+)

import argparse
import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import soundfile as sf
import io
import numpy as np
import torch
from kokoro import KPipeline
import logging
import requests
from pathlib import Path
from huggingface_hub import hf_hub_download

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Kokoro-Server")

# Default settings
DEFAULT_HOST = "localhost"
DEFAULT_PORT = 8008
DEFAULT_LANG = "a"  # 'a' for American English
DEFAULT_VOICE = "af_heart"  # Updated to use the voice that's available

# Create voices directory if it doesn't exist
VOICES_DIR = Path("voices")
if not VOICES_DIR.exists():
    VOICES_DIR.mkdir(parents=True)

# Define available voice options and fallbacks
AVAILABLE_VOICES = [
    "af_heart",  # This is available according to the repository
    # Other voices in fallback order
    "af_nicole", 
    "af_sky",
    "af_bella",
    "af_sarah",
    "am_adam",
    "am_michael",
    "bf_emma",
    "bf_isabella",
    "bm_george",
    "bm_lewis"
]

def download_voice(voice_name):
    """Download a voice file from Hugging Face if it doesn't exist locally"""
    voice_path = VOICES_DIR / f"{voice_name}.pt"
    
    if voice_path.exists():
        logger.info(f"Using existing voice file: {voice_path}")
        return voice_path
    
    logger.info(f"Voice file {voice_path} not found locally, attempting to download from Hugging Face...")
    
    try:
        # Try to download from the official repository
        file_path = hf_hub_download(
            repo_id="hexgrad/Kokoro-82M",
            filename=f"voices/{voice_name}.pt"
        )
        
        # Copy to our voices directory for future use
        import shutil
        shutil.copy(file_path, voice_path)
        logger.info(f"Successfully downloaded voice {voice_name} to {voice_path}")
        return voice_path
    except Exception as e:
        logger.warning(f"Failed to download voice {voice_name} from Hugging Face: {e}")
        
        # Try the alternative dataset
        try:
            logger.info(f"Attempting to download voice {voice_name} from alternative source...")
            # Try to download from the alternative voices dataset
            from datasets import load_dataset
            import numpy as np
            
            ds = load_dataset("ecyht2/kokoro-82M-voices", split="train")
            
            # Find the voice
            voice_tensor = None
            for item in ds:
                if item["voices"] == voice_name:
                    voice_tensor = torch.tensor(np.array(item["tensor"]))
                    break
            
            if voice_tensor is not None:
                # Save the tensor to our voices directory
                torch.save(voice_tensor, voice_path)
                logger.info(f"Successfully downloaded voice {voice_name} from alternative source to {voice_path}")
                return voice_path
            else:
                logger.warning(f"Voice {voice_name} not found in alternative source")
                return None
        except Exception as e2:
            logger.warning(f"Failed to download voice {voice_name} from alternative source: {e2}")
            return None

class TTS:
    def __init__(self, lang_code=DEFAULT_LANG):
        logger.info(f"Initializing Kokoro TTS with language code: {lang_code}")
        self.pipeline = KPipeline(lang_code=lang_code)
        logger.info("Kokoro TTS initialized successfully")
        
        # Initialize available voices
        self.available_voices = {}
        self.default_voice = None
        
        # Try to load each voice in order
        for voice_name in AVAILABLE_VOICES:
            voice_path = download_voice(voice_name)
            if voice_path and voice_path.exists():
                try:
                    # Load the voice tensor
                    voice_tensor = torch.load(voice_path, weights_only=True)
                    self.available_voices[voice_name] = voice_tensor
                    
                    # Set the first successful voice as default
                    if self.default_voice is None:
                        self.default_voice = voice_name
                        logger.info(f"Set default voice to: {voice_name}")
                except Exception as e:
                    logger.warning(f"Failed to load voice {voice_name}: {e}")
        
        if not self.available_voices:
            logger.error("No voices could be loaded. TTS functionality will be limited.")
        else:
            logger.info(f"Successfully loaded {len(self.available_voices)} voices: {', '.join(self.available_voices.keys())}")
        
    def synthesize(self, text, voice_name=None, output_file=None):
        """
        Synthesize speech from text
        Args:
            text: Text to synthesize
            voice_name: Name of the voice to use (default: use the default voice)
            output_file: Optional file path to save audio to
        Returns:
            audio_data: Audio data as numpy array
            sample_rate: Sample rate of audio (default: 24000)
        """
        logger.info(f"Synthesizing text: {text[:50]}{'...' if len(text) > 50 else ''}")
        
        # Select voice to use
        selected_voice = None
        selected_voice_name = None
        
        if voice_name and voice_name in self.available_voices:
            selected_voice = self.available_voices[voice_name]
            selected_voice_name = voice_name
        elif self.default_voice:
            selected_voice = self.available_voices[self.default_voice]
            selected_voice_name = self.default_voice
            logger.info(f"Using default voice: {self.default_voice}")
        else:
            logger.error("No voice available for synthesis")
            raise ValueError("No voice available for synthesis")
            
        try:
            # Use the Kokoro pipeline to synthesize speech
            # The KPipeline can return different types of output depending on parameters
            # We need to handle the generator or direct output
            result = self.pipeline(text, voice=selected_voice)
            audio_data = None
            
            # Handle different return types from KPipeline
            if isinstance(result, list) or hasattr(result, '__iter__') and not isinstance(result, (str, bytes, np.ndarray)):
                # It's a generator or list - take the first result
                for gs, ps, audio in result:
                    audio_data = audio
                    break
            else:
                # Direct audio data
                audio_data = result
                
            if audio_data is None:
                raise ValueError("Failed to generate audio from text")
                
            sample_rate = 24000  # Kokoro's default sample rate
            
            # Save to file if requested
            if output_file:
                sf.write(output_file, audio_data, sample_rate)
                logger.info(f"Audio saved to {output_file}")
                
            return audio_data, sample_rate
        except Exception as e:
            logger.error(f"Error synthesizing text: {e}")
            raise

class KokoroHTTPRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, tts=None, **kwargs):
        self.tts = tts
        super().__init__(*args, **kwargs)
    
    def _set_headers(self, content_type="application/json", status_code=200):
        self.send_response(status_code)
        self.send_header("Content-type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        
    def do_OPTIONS(self):
        self._set_headers()
        
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        # Health check endpoint
        if parsed_path.path == "/health":
            self._set_headers()
            response = {
                "status": "ok", 
                "version": "0.8.4",
                "voices": list(self.tts.available_voices.keys()) if self.tts else []
            }
            self.wfile.write(json.dumps(response).encode())
            return
            
        # TTS endpoint with query parameters
        elif parsed_path.path == "/tts":
            query = urllib.parse.parse_qs(parsed_path.query)
            
            if "text" not in query:
                self._set_headers(status_code=400)
                response = {"error": "Missing required parameter: text"}
                self.wfile.write(json.dumps(response).encode())
                return
                
            text = query["text"][0]
            voice = query.get("voice", [None])[0]
            
            try:
                audio_data, sample_rate = self.tts.synthesize(text, voice_name=voice)
                
                # Convert to WAV and send response
                self._set_headers(content_type="audio/wav")
                
                # Write WAV to in-memory file
                wav_io = io.BytesIO()
                sf.write(wav_io, audio_data, sample_rate, format="WAV")
                wav_io.seek(0)
                
                # Send WAV data
                self.wfile.write(wav_io.read())
            except Exception as e:
                logger.error(f"Error processing TTS request: {e}")
                self._set_headers(status_code=500)
                response = {"error": str(e)}
                self.wfile.write(json.dumps(response).encode())
        else:
            self._set_headers(status_code=404)
            response = {"error": "Endpoint not found"}
            self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        
        if self.path == "/tts":
            try:
                request = json.loads(post_data.decode("utf-8"))
                
                if "text" not in request:
                    self._set_headers(status_code=400)
                    response = {"error": "Missing required parameter: text"}
                    self.wfile.write(json.dumps(response).encode())
                    return
                    
                text = request["text"]
                voice = request.get("voice")
                
                audio_data, sample_rate = self.tts.synthesize(text, voice_name=voice)
                
                # Convert to WAV and send response
                self._set_headers(content_type="audio/wav")
                
                # Write WAV to in-memory file
                wav_io = io.BytesIO()
                sf.write(wav_io, audio_data, sample_rate, format="WAV")
                wav_io.seek(0)
                
                # Send WAV data
                self.wfile.write(wav_io.read())
            except json.JSONDecodeError:
                self._set_headers(status_code=400)
                response = {"error": "Invalid JSON"}
                self.wfile.write(json.dumps(response).encode())
            except Exception as e:
                logger.error(f"Error processing TTS request: {e}")
                self._set_headers(status_code=500)
                response = {"error": str(e)}
                self.wfile.write(json.dumps(response).encode())
        else:
            self._set_headers(status_code=404)
            response = {"error": "Endpoint not found"}
            self.wfile.write(json.dumps(response).encode())

def run_server(host, port, lang_code):
    try:
        # Initialize TTS
        tts = TTS(lang_code=lang_code)
        
        # Create a custom handler that includes the TTS instance
        def handler(*args, **kwargs):
            return KokoroHTTPRequestHandler(*args, tts=tts, **kwargs)
        
        # Start the server
        server = HTTPServer((host, port), handler)
        server_address = f"http://{host}:{port}"
        
        logger.info(f"Kokoro TTS server started at {server_address}")
        logger.info("Available endpoints:")
        logger.info(f"  - {server_address}/health - Server health check")
        logger.info(f"  - {server_address}/tts?text=Hello - Generate speech (GET)")
        logger.info(f"  - {server_address}/tts - Generate speech (POST with JSON body)")
        logger.info("Press Ctrl+C to stop the server")
        
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped")
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kokoro TTS Server")
    parser.add_argument("--host", default=DEFAULT_HOST, help=f"Host to bind server to (default: {DEFAULT_HOST})")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Port to bind server to (default: {DEFAULT_PORT})")
    parser.add_argument("--lang", default=DEFAULT_LANG, help=f"Language code (default: {DEFAULT_LANG} for American English, 'b' for British English)")
    parser.add_argument("--no-interactive", action="store_true", help="Run in non-interactive mode (skip prompts)")
    
    args = parser.parse_args()
    
    run_server(args.host, args.port, args.lang) 