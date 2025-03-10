# Headroom Setup Guide

This guide will help you set up Headroom, a local voice chatbot that uses Ollama for chat capabilities.

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- [Ollama](https://ollama.ai/) installed on your local machine
- (Optional) [Kokoro](https://github.com/hexgrad/kokoro) TTS server for high-quality voice output

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

### 4. (Optional) Set Up Kokoro TTS Server

For high-quality voice output, you can set up the Kokoro TTS server:

1. Install Python 3.10-3.12 (Kokoro has specific Python version requirements)
2. Create a Python virtual environment:
   ```bash
   python -m venv kokoro_env
   source kokoro_env/bin/activate  # On Windows: kokoro_env\Scripts\activate
   ```
   
3. Install Kokoro and its dependencies:
   ```bash
   pip install kokoro soundfile
   ```
   
4. For additional language support:
   ```bash
   # For Japanese
   pip install misaki[ja]
   
   # For Chinese
   pip install misaki[zh]
   ```
   
5. On some systems, you may need to install espeak:
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install espeak-ng
   
   # On macOS
   brew install espeak
   ```
   
6. Start the Kokoro TTS server using either:
   ```bash
   # Method 1: While in the virtual environment
   python -m kokoro.serve
   
   # Method 2: Use the included helper script
   ./start_kokoro.sh
   ```
   
7. The server should be running on http://localhost:8008 by default

If you don't install Kokoro, Headroom will fall back to using your browser's built-in speech synthesis.

> **Note**: For more details and the latest instructions, please visit the [Kokoro GitHub repository](https://github.com/hexgrad/kokoro).

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
- Start Kokoro TTS server if it's installed
- Launch the Headroom web server
- Provide a way to gracefully shut down all services with Ctrl+C

#### Option 2: Start services manually

If you prefer to start each service individually:

1. Start Ollama server:
   ```bash
   ollama serve
   ```

2. (Optional) Start Kokoro TTS server if installed:
   ```bash
   kokoro serve
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

#### Kokoro TTS Settings (if installed)
- Enable/disable Kokoro TTS
- Select TTS model (base processing model)
- Select language for speech output
- Select specific voice model for the selected language
- Select speaker ID/character for more variety

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
- **Kokoro TTS not working**: 
  - Ensure the Kokoro server is running at http://localhost:8008 (or the URL specified in config.js)
  - Check the Kokoro server logs for any errors
  - Make sure you've enabled Kokoro TTS in the Settings panel
  - The system will automatically fall back to the browser's built-in TTS if Kokoro is unavailable

## Future Features

- Enhanced voice input with custom STT server
- Persistent conversation history
- Multiple language models support
- Mobile-friendly responsive design
- Additional Kokoro TTS features and voice options