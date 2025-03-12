# Headroom

An experimental local voice chatbot that runs entirely on your own machine.

## Overview

Headroom is a web-based chatbot interface that leverages local language models to provide AI chat functionality without sending your data to external services. The application supports text and voice chat through an intuitive interface, letting you interact with AI models running completely on your own machine.

## Features

- **Text Chat**: Interact with the AI through a familiar chat interface
- **Voice Input**: Use your microphone for hands-free interaction
- **Voice Output**: Listen to AI responses with text-to-speech
- **OpenVoice TTS**: High-quality Text-to-Speech with multiple voice models and languages
- **Customizable Settings**: Adjust voices, speech recognition language, and more
- **Local Processing**: All data stays on your machine using Ollama's local models
- **Coming Soon**:
  - Enhanced STT with dedicated servers
  - Persistent conversation history
  - Multiple language models support

## Requirements

- A modern web browser
- [Ollama](https://ollama.ai/) installed locally
- The huihui_ai/qwen2.5-abliterate:32b model
- (Optional) [OpenVoice](https://github.com/myshell-ai/OpenVoice) TTS server for high-quality voice output

### Installing OpenVoice TTS (Optional)

For high-quality text-to-speech capabilities with realistic voice cloning, you can use the OpenVoice TTS server:

1. Install Python 3.9 or newer
2. Run the included setup script to automatically install and configure OpenVoice:
   ```bash
   ./start_openvoice.sh
   ```
   This will:
   - Create a Python virtual environment
   - Install all required dependencies
   - Download the OpenVoice models
   - Start the OpenVoice TTS server

Note: The initial setup may take some time as it downloads and installs the necessary models (about 1GB in total).

The Headroom application will automatically detect and use OpenVoice if it's available. If not, it will fall back to the browser's built-in speech synthesis.

For easier installation, use the included helper script to set up and start OpenVoice:
```bash
./start_openvoice.sh
```
This script will:
- Check if you have a compatible Python version
- Create a virtual environment if needed
- Install the necessary dependencies
- Start the OpenVoice TTS server

## Getting Started

1. Please refer to [setup.md](setup.md) for detailed installation and configuration instructions.
2. Install Ollama and the required language model
3. Use the provided launch script to start all services:
   ```bash
   ./launch.sh
   ```
   This script will:
   - Check for required dependencies
   - Start Ollama if it's not already running
   - Start OpenVoice TTS server if installed
   - Launch the Headroom web application
   - Open http://localhost:3023 in your browser

Alternatively, you can start services manually:
1. Start Ollama with `ollama serve`
2. Start OpenVoice TTS server with `./start_openvoice.sh` (if installed)
3. Start the Headroom server with `node server.js`
4. Open http://localhost:3023 in your browser

## Project Status

Headroom is currently in the early development phase. The text chat functionality with Ollama is implemented, with voice capabilities planned for future iterations.

## License

See the [LICENSE](LICENSE) file for details.
