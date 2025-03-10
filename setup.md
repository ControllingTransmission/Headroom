# Headroom Setup Guide

This guide will help you set up Headroom, a local voice chatbot that uses Ollama for chat capabilities.

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- [Ollama](https://ollama.ai/) installed on your local machine

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

### 4. Open the Headroom Web Interface

You have two options for opening the web interface:

#### Option 1: Directly open the HTML file

Simply open the `index.html` file in your web browser. You can do this by:

- Double-clicking the file
- Dragging the file into your browser window
- Right-clicking and selecting "Open with" your preferred browser

#### Option 2: Use the included Node.js server (recommended)

If you have Node.js installed, you can use the included simple HTTP server:

1. Open a terminal in the Headroom directory
2. Run the following command:

```bash
node server.js
```

3. The server will start at http://localhost:3000/
4. Open this URL in your web browser

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
2. The chatbot's responses will be spoken aloud using your device's speech synthesis
3. Click "Disable Audio Response" to turn off voice output

### Settings
Click the "Settings" button to adjust:
- Voice selection, speed, pitch, and volume for speech output
- Language selection for speech recognition
- Continuous mode for speech recognition

## Troubleshooting

- **No response from chat**: Ensure Ollama is running with `ollama serve` in your terminal
- **Model not found**: Make sure you've pulled the required model with `ollama pull huihui_ai/qwen2.5-abliterate:32b`
- **Connection error**: Check that no firewall is blocking localhost connections
- **Voice input not working**: Check that your browser has permission to access your microphone
- **Voice output not working**: Check that your browser has audio output enabled and volume is not muted

## Future Features

- Enhanced voice input with custom STT server
- Advanced text-to-speech with custom TTS server 
- Persistent conversation history
- Multiple language models support
- Mobile-friendly responsive design