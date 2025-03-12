# ElevenLabs OpenVoice TTS for Headroom

This document explains how to set up and use the ElevenLabs-powered OpenVoice TTS server for Headroom.

## Overview

The ElevenLabs OpenVoice TTS server provides high-quality text-to-speech capabilities compatible with the Headroom UI. It uses the ElevenLabs API for premium voice quality with a wide variety of voices, and falls back to Google's TTS when no API key is provided.

## Features

- **High-quality voices** via ElevenLabs API
- **Extensive voice selection** including multiple accents, genders, and languages
- **Multiple voice models** with varying levels of quality and speed
- **Automatic fallback** to Google TTS when ElevenLabs is unavailable
- **Cache system** for performance optimization

## API Endpoints

The server implements these key endpoints:

- `/health` - Health check endpoint (GET)
- `/voices` - List available voices (GET)
- `/models` - List available models (GET)
- `/tts` - Generate speech from text (POST)

## Quick Start

### With ElevenLabs API Key (Recommended)

1. Sign up for a free ElevenLabs account at https://elevenlabs.io/
2. Get your API key from the ElevenLabs dashboard
3. Set the API key as an environment variable:
   ```bash
   export ELEVENLABS_API_KEY=your_api_key_here
   ```
4. Run the server:
   ```bash
   ./start_elevenlabs.sh
   ```

### Without API Key (Fallback to Google TTS)

If you don't have an ElevenLabs API key, the server will fall back to using Google's TTS service:

```bash
./start_elevenlabs.sh
```

## Using with Headroom

Once the server is running, the Headroom UI will automatically detect and use it. The server runs on port 8008 by default.

## Available Voices

With an ElevenLabs API key, you'll get access to:

- Professional, high-quality voices with natural intonation
- Multiple languages and accents
- Character and celebrity-inspired voices (depending on your ElevenLabs plan)

Without an API key, you'll have access to these sample voices which will use Google TTS:
- American English voices (male and female)
- British English voices
- Various European language voices (German, French, Italian, Spanish)
- Japanese voice

## Available Models

The server offers these model options:

- `eleven_multilingual_v2` - Supports multiple languages (default)
- `eleven_turbo_v2` - Faster generation, slightly lower quality
- `eleven_enhanced` - Higher quality but slower
- `eleven_monolingual_v1` - Original ElevenLabs model

## Technical Details

- The server requires an internet connection
- Audio is cached locally for better performance
- ElevenLabs offers a free tier with limited character usage
- The fallback to Google TTS ensures the system always works

## Upgrading from Standard OpenVoice

If you were previously using the standard OpenVoice implementation with gTTS, this version offers significant improvements in voice quality and variety. Your existing TTS requests should work without any changes to your frontend code.