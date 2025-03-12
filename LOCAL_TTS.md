# Local Offline TTS for Headroom

This document explains how to set up and use the local TTS server for Headroom that works completely offline with no internet connection required.

## Overview

The Local TTS server provides text-to-speech capabilities that work entirely offline, using your system's built-in speech synthesis engines. It's compatible with the Headroom UI and requires no API keys or internet connection.

## Features

- **Completely offline** - works without an internet connection
- **Uses system voices** - leverages your operating system's built-in voices
- **Multiple voice options** - provides access to all voices installed on your system
- **Adjustable speaking rate** - slow, normal, and fast speaking modes
- **Local caching** - saves audio to improve performance for repeated phrases

## API Endpoints

The server implements these key endpoints:

- `/health` - Health check endpoint (GET)
- `/voices` - List available system voices (GET)
- `/models` - List available models/speaking rates (GET)
- `/tts` - Generate speech from text (POST)

## Quick Start

Run the Local TTS server with:

```bash
./start_local_tts.sh
```

## Using with Headroom

Once the server is running, the Headroom UI will automatically detect and use it. The server runs on port 8008 by default.

## Available Voices

The available voices depend on your operating system:

- **macOS**: Includes system voices like Samantha, Alex, etc.
- **Windows**: Includes system voices like Microsoft David, Microsoft Zira, etc.
- **Linux**: Includes any installed speech-dispatcher voices

You can add more voices to your system through your operating system's settings:

- **macOS**: System Settings > Accessibility > Spoken Content > System Voice > Manage Voices
- **Windows**: Settings > Time & Language > Speech > Manage voices
- **Linux**: Install additional speech-dispatcher voices via your package manager

## Available Models

The server offers these model options:

- `default` - Standard speaking rate
- `slow` - Slower, clearer pronunciation
- `fast` - Faster speaking rate

## Technical Details

- The server uses pyttsx3 which is a cross-platform Python wrapper for text-to-speech engines
- On macOS, it uses the NSSpeechSynthesizer
- On Windows, it uses SAPI5
- On Linux, it uses speech-dispatcher
- Audio is cached locally for better performance

## Troubleshooting

If you encounter issues:

1. Make sure pyttsx3 is installed correctly: `pip install pyttsx3`
2. Verify your system has at least one speech synthesis voice installed
3. On Linux, you may need to install additional packages: `sudo apt-get install espeak`
4. Try restarting the server with `./start_local_tts.sh`