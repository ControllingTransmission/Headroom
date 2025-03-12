#!/usr/bin/env python3
"""
Minimal OpenVoice TTS Server for Headroom.
This implementation creates musical patterns based on text.
"""

import os
import sys
import json
import time
import logging
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
import numpy as np
import wave
import struct
import math
import io
import hashlib
import random

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
            self.wfile.write(json.dumps({"status": "ok", "engine": "openvoice-pattern"}).encode())
        
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
            {"id": "default", "name": "Default Pattern", "language": "en-US", "status": "ready"},
            {"id": "female_1", "name": "Female Pattern 1", "language": "en-US", "status": "ready"},
            {"id": "female_2", "name": "Female Pattern 2", "language": "en-US", "status": "ready"},
            {"id": "male_1", "name": "Male Pattern 1", "language": "en-US", "status": "ready"},
            {"id": "male_2", "name": "Male Pattern 2", "language": "en-US", "status": "ready"}
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
                
                # Generate audio patterns based on text
                audio_data = self.generate_audio_pattern(text, voice_id, model)
                
                # Return audio
                self.send_response(200)
                self.send_header('Content-type', 'audio/wav')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(audio_data)
                
                logger.info(f"Response sent successfully: {len(audio_data)} bytes")
                
            except Exception as e:
                logger.error(f"Error handling TTS request: {str(e)}")
                try:
                    # Send a simple tone as fallback
                    fallback_audio = self.generate_simple_tone()
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
    
    def generate_audio_pattern(self, text, voice_id, model):
        """Generate sophisticated audio patterns based on text."""
        # Create a cache key
        cache_key = hashlib.md5(f"{text}_{voice_id}_{model}".encode()).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.wav")
        
        # Return cached audio if available
        if os.path.exists(cache_path):
            with open(cache_path, 'rb') as f:
                return f.read()
        
        # Set parameters based on voice and model
        if voice_id.startswith("female"):
            base_freq = 280  # Female voice range
        else:
            base_freq = 150  # Male voice range
        
        # Adjust for specific voice variations
        if voice_id.endswith("_2"):
            base_freq *= 1.1  # Slightly higher pitch variant
        
        # Set speed based on model
        if model == "slow":
            words_per_min = 100
            pause_factor = 1.5
        elif model == "fast":
            words_per_min = 180
            pause_factor = 0.7
        else:  # default
            words_per_min = 140
            pause_factor = 1.0
        
        # Split text into sentences and words
        sentences = [s.strip() for s in text.replace("?", ".").replace("!", ".").split(".") if s.strip()]
        if not sentences:
            sentences = [text]
        
        # Create audio parameters
        sample_rate = 22050
        
        # Create an empty audio buffer
        all_audio = np.array([], dtype=np.float32)
        
        # Process each sentence
        for sentence in sentences:
            words = [w for w in sentence.split() if w]
            if not words:
                continue
            
            # Estimate duration based on word count and speaking rate
            # Average speaking rate is about 150 words per minute
            word_count = len(words)
            duration = (word_count / words_per_min) * 60
            
            # Add some randomness to make it sound more natural
            duration *= random.uniform(0.9, 1.1)
            
            # Make sure it's not too short
            duration = max(duration, 0.5)
            
            # Make sure it's not too long
            duration = min(duration, 10)
            
            # Generate time array
            time_array = np.linspace(0, duration, int(sample_rate * duration), False)
            
            # Create a sentence pattern
            sentence_audio = np.zeros_like(time_array)
            
            # Add word patterns
            word_time = 0
            for word in words:
                # Word length affects pattern
                word_len = len(word)
                
                # Calculate word duration based on length and speaking rate
                word_duration = (word_len / 5) * (60 / words_per_min)
                word_duration = max(word_duration, 0.1)  # Minimum 100ms per word
                
                # Calculate samples for this word
                word_samples = int(word_duration * sample_rate)
                
                # Calculate which portion of the main array this word occupies
                start_idx = int(word_time * sample_rate)
                end_idx = min(start_idx + word_samples, len(time_array))
                
                if start_idx >= len(time_array) or start_idx >= end_idx:
                    break
                
                # Calculate a frequency shift based on the first letter
                first_char = word[0].lower() if word else 'a'
                freq_shift = (ord(first_char) - ord('a')) / 26.0
                freq_shift = freq_shift * 0.5 + 0.75  # Map to range 0.75 - 1.25
                
                # Initialize word pattern
                word_pattern = np.zeros(end_idx - start_idx)
                
                # Generate different pattern based on word length
                if word_len <= 2:  # Short words
                    # Single tone with slight frequency modulation
                    t = np.linspace(0, word_duration, end_idx - start_idx, False)
                    mod = 1.0 + 0.05 * np.sin(2 * np.pi * 2.0 * t)
                    word_pattern = 0.7 * np.sin(2 * np.pi * base_freq * freq_shift * mod * t)
                    
                elif word_len <= 5:  # Medium words
                    # Two-tone pattern
                    t = np.linspace(0, word_duration, end_idx - start_idx, False)
                    # First half of the word
                    half = (end_idx - start_idx) // 2
                    word_pattern[:half] = 0.7 * np.sin(2 * np.pi * base_freq * freq_shift * t[:half])
                    # Second half slightly higher
                    word_pattern[half:] = 0.7 * np.sin(2 * np.pi * base_freq * freq_shift * 1.2 * t[half:])
                    
                else:  # Long words
                    # Multi-tone pattern
                    t = np.linspace(0, word_duration, end_idx - start_idx, False)
                    # Split into three parts
                    third = (end_idx - start_idx) // 3
                    # First third - base tone
                    word_pattern[:third] = 0.7 * np.sin(2 * np.pi * base_freq * freq_shift * t[:third])
                    # Middle third - slightly higher
                    word_pattern[third:2*third] = 0.7 * np.sin(2 * np.pi * base_freq * freq_shift * 1.2 * t[third:2*third])
                    # Last third - back to base with vibrato
                    vib = 1.0 + 0.1 * np.sin(2 * np.pi * 5.0 * t[2*third:])
                    word_pattern[2*third:] = 0.7 * np.sin(2 * np.pi * base_freq * freq_shift * vib * t[2*third:])
                
                # Apply amplitude envelope (attack/decay)
                envelope = np.ones_like(word_pattern)
                attack_time = min(int(0.1 * len(envelope)), len(envelope) // 4)
                decay_time = min(int(0.2 * len(envelope)), len(envelope) // 3)
                
                # Attack
                if attack_time > 0:
                    envelope[:attack_time] = np.linspace(0, 1, attack_time)
                
                # Decay
                if decay_time > 0 and len(envelope) > decay_time:
                    envelope[-decay_time:] = np.linspace(1, 0, decay_time)
                
                # Apply envelope
                word_pattern *= envelope
                
                # Add to sentence audio
                sentence_audio[start_idx:end_idx] += word_pattern
                
                # Update word time with a small gap between words
                word_time += word_duration + (0.15 * pause_factor)
            
            # Add a pause at the end of the sentence
            sentence_pause = np.zeros(int(0.5 * pause_factor * sample_rate))
            
            # Append sentence audio and pause to the main audio
            all_audio = np.append(all_audio, sentence_audio)
            all_audio = np.append(all_audio, sentence_pause)
        
        # Normalize audio to prevent clipping
        if len(all_audio) > 0:
            all_audio = all_audio / (np.max(np.abs(all_audio)) + 1e-6) * 0.9
        
        # Convert to 16-bit PCM
        audio_int16 = (all_audio * 32767).astype(np.int16)
        
        # Create WAV file in memory
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(audio_int16.tobytes())
        
        # Get the WAV data
        wav_data = buffer.getvalue()
        
        # Cache the audio for future use
        with open(cache_path, 'wb') as f:
            f.write(wav_data)
        
        return wav_data
    
    def generate_simple_tone(self):
        """Generate a simple tone as fallback."""
        sample_rate = 16000
        duration = 0.5
        frequency = 440
        
        t = np.linspace(0, duration, int(duration * sample_rate), False)
        audio = 0.5 * np.sin(2 * np.pi * frequency * t)
        
        # Apply fade in/out
        fade_samples = int(0.1 * sample_rate)
        if fade_samples > 0:
            audio[:fade_samples] *= np.linspace(0, 1, fade_samples)
            audio[-fade_samples:] *= np.linspace(1, 0, fade_samples)
        
        # Convert to 16-bit PCM
        audio_int16 = (audio * 32767).astype(np.int16)
        
        # Create WAV file in memory
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(audio_int16.tobytes())
        
        return buffer.getvalue()

def run_server():
    """Start the HTTP server."""
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, OpenVoiceTTSHandler)
    logger.info(f"Starting OpenVoice Pattern TTS server on port {PORT}")
    logger.info(f"Server running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped")

if __name__ == "__main__":
    run_server()