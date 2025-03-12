# Musical Pattern TTS for Headroom

This document explains how to set up and use the Musical Pattern TTS server for Headroom.

## Overview

The Musical Pattern TTS server provides text-to-sound capabilities compatible with the Headroom UI. It generates musical patterns based on the input text that reflect the timing, rhythm, and structure of speech without requiring actual speech synthesis.

This implementation:
- Works completely offline with no internet connection required
- Uses only NumPy for sound generation - no speech engines or complex dependencies
- Provides different voice-like tones and speaking rates

## API Endpoints

The server implements these key endpoints:

- `/health` - Health check endpoint (GET)
- `/voices` - List available voice patterns (GET)
- `/models` - List available models/speeds (GET)
- `/tts` - Generate audio from text (POST)

## Quick Start

Run the Musical Pattern TTS server with:

```bash
./minimal_openvoice_server.py
```

## Using with Headroom

Once the server is running, the Headroom UI will automatically detect and use it. The server runs on port 8008 by default.

## Available Voice Patterns

The server provides different tone patterns to simulate different voice types:

- `default` - Default Pattern (medium pitch)
- `female_1` - Female Pattern 1 (higher pitch)
- `female_2` - Female Pattern 2 (slightly higher variant)
- `male_1` - Male Pattern 1 (lower pitch)
- `male_2` - Male Pattern 2 (slightly higher variant)

## Available Models

The server supports different speaking rates:

- `default` - Normal speed pattern
- `slow` - Slower pattern with longer pauses
- `fast` - Faster pattern with shorter pauses

## Technical Details

- The server generates audio patterns based on the text content:
  - Sentence structure creates pauses
  - Word length affects tone duration
  - Word position determines pitch patterns
  - First letter of words affects frequency variations

- Text analysis includes:
  - Breaking text into sentences and words
  - Calculating appropriate durations based on word count
  - Generating pauses between words and sentences
  - Creating amplitude envelopes for natural-sounding attack/decay

- The audio is generated as WAV files and cached for faster responses on repeated phrases

## No Speech Engines Required

This implementation doesn't require any speech engines, API keys, or internet connections. It works by creating musical patterns that mimic the rhythm and structure of speech, providing:

1. Complete privacy - all processing is done locally
2. Zero external dependencies - just Python and NumPy
3. Consistent behavior across all platforms