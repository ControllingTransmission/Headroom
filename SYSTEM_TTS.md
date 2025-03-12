# System Voice TTS for Headroom

This document explains how to set up and use the System Voice TTS server for Headroom.

## Overview

The System Voice TTS server provides text-to-speech capabilities using your computer's built-in speech synthesis. It works completely offline with no internet connection required and uses the high-quality voices already installed on your system.

## Features

- **100% Offline** - No internet connection required
- **System Voices** - Uses your computer's high-quality built-in voices
- **Multiple Voices** - Access to all system voices installed on your computer
- **Adjustable Speed** - Change between slow, normal, and fast speaking rates
- **Caching** - Saves generated audio for improved performance

## Quick Start

Run the System Voice TTS server with:

```bash
./start_system_tts.sh
```

## Using with Headroom

Once the server is running, the Headroom UI will automatically detect and use it. The server runs on port 8008 by default.

## Available Voices

The server detects all voices installed on your system. On macOS, these include voices like:

- Samantha (US English)
- Alex (US English)
- Daniel (British English)
- Thomas (French)
- Anna (German)
- And many more depending on your system configuration

To add more voices on macOS:
1. Open System Settings
2. Go to Accessibility → Spoken Content → System Voice → Manage Voices
3. Select and download additional voices

## Available Speed Options

The server supports different speaking rates:

- **Normal** - Standard speaking rate
- **Slow** - Slower, clearer pronunciation
- **Fast** - Faster speaking rate

## Technical Details

- The server uses the macOS `say` command to generate speech
- Audio is generated as WAV files
- Generated audio is cached to improve performance for repeated phrases
- No external dependencies or API keys needed

## System Requirements

This TTS implementation is optimized for:
- **macOS**: Uses the built-in `say` command

## Advantages

1. **Privacy** - All processing happens locally on your computer
2. **Reliability** - Works without an internet connection
3. **Quality** - Uses your system's high-quality voices
4. **Consistency** - Provides consistent results