# Headroom Setup Guide

This guide will help you set up Headroom, a local voice chatbot that uses Ollama for chat capabilities.

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- [Ollama](https://ollama.ai/) installed on your local machine
- (Optional) [OpenVoice](https://github.com/myshell-ai/OpenVoice) TTS server for high-quality voice output

## Installation Steps

### 1. Install Ollama

Follow the instructions at [ollama.ai](https://ollama.ai/) to install Ollama for your operating system:

- **macOS**: Download and install the macOS package
- **Linux**: Follow the curl installation command
- **Windows**: Follow the Windows installation instructions

### 2. Pull the Required Model

Once Ollama is installed, open a terminal and run:

```bash
ollama pull huihui_ai/qwen2.5-abliterate:32b
```

This will download the required model, which might take some time depending on your internet connection and hardware.

### 3. Start the Ollama Server

After installing the model, start the Ollama server by running:

```bash
ollama serve
```

This will start the Ollama server on localhost port 11434.

### 4. (Optional) Set Up OpenVoice TTS Server

For real speech output, you can set up the OpenVoice TTS server which uses Google's Text-to-Speech API offline:

1. Install Python 3.9 or newer
   > **Note**: OpenVoice works with Python 3.9 or newer versions.

2. Use the included helper script for automatic installation:
   ```bash
   chmod +x start_openvoice.sh
   ./start_openvoice.sh
   ```
   
   This script will:
   - Create a virtual environment if needed
   - Install the necessary dependencies (primarily gTTS)
   - Start the OpenVoice TTS server

3. Alternatively, you can install manually:
   ```bash
   python -m venv openvoice_env
   source openvoice_env/bin/activate  # On Windows: openvoice_env\Scripts\activate
   pip install gtts
   ```
   
4. Start the OpenVoice server manually:
   ```bash
   # While in the virtual environment
   python openvoice_server.py
   ```
   
5. The server should be running on http://localhost:8008 by default

### OpenVoice Features

- **Real Speech**: Uses Google's Text-to-Speech engine for natural-sounding voices
- **Multiple Voices**: Over 30 different voices across various languages, including:
  - Male and female voices for each language
  - Child voice option for English (US)
  - Regional accents (US, UK, Australian English, etc.)
- **Language Support**: 14 languages including English, French, German, Spanish, Italian, Japanese, Korean, Chinese, Russian, Portuguese, Hindi, and Dutch
- **Speed Control**: Can adjust speech speed (slow, normal, fast)
- **Audio Caching**: Caches generated speech to improve performance
- **Fallback Mechanism**: Falls back to browser TTS if any issues occur

### OpenVoice Installation Troubleshooting

If you encounter dependency errors when installing OpenVoice:

1. Make sure you have Python 3.9 or newer installed:
   ```bash
   python --version
   ```

2. Ensure you have internet access (only needed when generating speech for the first time)

3. If you continue facing issues:
   - The launch.sh script will automatically detect if OpenVoice is unavailable and fall back to browser TTS
   - You can explicitly use browser TTS by setting `"openVoiceEnabled": false` in config.js

If you don't install OpenVoice, Headroom will fall back to using your browser's built-in speech synthesis.

### 5. Launch Headroom

You have two options for launching Headroom:

#### Option 1: Use the all-in-one launch script (recommended)

The easiest way to start all necessary services is to use the included launch script:

1. Open a terminal in the Headroom directory
2. Make the script executable if it's not already:
   ```bash
   chmod +x launch.sh
   ```
3. Run the launch script:
   ```bash
   ./launch.sh
   ```

This script will:
- Check for required dependencies (Node.js, Ollama)
- Verify if the required language model is installed
- Start Ollama if it's not already running
- Start OpenVoice TTS server if it's installed
- Launch the Headroom web server
- Provide a way to gracefully shut down all services with Ctrl+C

#### Option 2: Start services manually

If you prefer to start each service individually:

1. Start Ollama server:
   ```bash
   ollama serve
   ```

2. (Optional) Start OpenVoice TTS server if installed:
   ```bash
   ./start_openvoice.sh
   ```

3. Start the Headroom web server:
   ```bash
   node server.js
   ```

4. Open http://localhost:3023/ in your web browser

Using the Node.js server is recommended as it avoids potential CORS issues with browser security restrictions.

## Usage

### Text Chat
1. Type your message in the text input field
2. Press Enter or click the Send button to send your message
3. Wait for the response from the chatbot

### Voice Input
1. Click the "Enable Voice Input" button
2. Speak clearly into your microphone
3. The app will transcribe your speech in real-time
4. When you finish speaking, the message will be sent automatically
5. Click "Disable Voice Input" to turn off voice recognition

### Voice Output
1. Click the "Enable Audio Response" button
2. The chatbot's responses will be spoken aloud
3. Click "Disable Audio Response" to turn off voice output

### Settings
Click the "Settings" button to adjust:

#### OpenVoice TTS Settings (if installed)
- Enable/disable OpenVoice TTS
- Select voice model
- Select speaker ID/character for the voice output

#### Browser TTS Settings (fallback)
- Voice selection, speed, pitch, and volume for speech output

#### Voice Input Settings
- Language selection for speech recognition
- Continuous mode for speech recognition

## Troubleshooting

- **No response from chat**: Ensure Ollama is running with `ollama serve` in your terminal
- **Model not found**: Make sure you've pulled the required model with `ollama pull huihui_ai/qwen2.5-abliterate:32b`
- **Connection error**: Check that no firewall is blocking localhost connections
- **Voice input not working**: Check that your browser has permission to access your microphone
- **Voice output not working**: Check that your browser has audio output enabled and volume is not muted
- **OpenVoice TTS not working**: 
  - Ensure the OpenVoice server is running at http://localhost:8008 (or the URL specified in config.js)
  - Check the OpenVoice server logs for any errors
  - Make sure you've enabled OpenVoice TTS in the Settings panel
  - The system will automatically fall back to the browser's built-in TTS if OpenVoice is unavailable

## Future Features

- Enhanced voice input with custom STT server
- Persistent conversation history
- Multiple language models support
- Mobile-friendly responsive design
- Additional OpenVoice TTS features and voice options