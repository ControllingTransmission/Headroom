# Headroom

An experimental local voice chatbot that runs entirely on your own machine.

## Overview

Headroom is a web-based chatbot interface that leverages local language models to provide AI chat functionality without sending your data to external services. The application supports text and voice chat through an intuitive interface, letting you interact with AI models running completely on your own machine.

## Features

- **Text Chat**: Interact with the AI through a familiar chat interface
- **Voice Input**: Use your microphone for hands-free interaction
- **Voice Output**: Listen to AI responses with text-to-speech
- **Kokoro TTS**: High-quality Text-to-Speech with multiple voice models and languages
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
- (Optional) [Kokoro](https://github.com/hexgrad/kokoro) TTS server for high-quality voice output

### Installing Kokoro TTS (Optional)

For high-quality text-to-speech capabilities, you can install Kokoro:

1. Install Python 3.10-3.12 (Kokoro has specific Python version requirements)
2. Create a virtual environment:
   ```bash
   python -m venv kokoro_env
   source kokoro_env/bin/activate  # On Windows: kokoro_env\Scripts\activate
   ```
3. Install Kokoro:
   ```bash
   pip install kokoro soundfile
   ```
4. For Japanese support:
   ```bash
   pip install misaki[ja]
   ```
5. For Chinese support:
   ```bash
   pip install misaki[zh]
   ```
6. On some systems, you may need to install espeak:
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install espeak-ng
   # On macOS
   brew install espeak
   ```

The Headroom application will automatically detect and use Kokoro if it's available. If not, it will fall back to the browser's built-in speech synthesis.

Alternatively, you can use the included helper script to set up and start Kokoro:
```bash
./start_kokoro.sh
```
This script will:
- Check if you have a compatible Python version
- Create a virtual environment if needed
- Install Kokoro and its dependencies
- Offer to install additional language support
- Start the Kokoro TTS server

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
   - Start Kokoro TTS server if installed
   - Launch the Headroom web application
   - Open http://localhost:3023 in your browser

Alternatively, you can start services manually:
1. Start Ollama with `ollama serve`
2. Start Kokoro TTS if installed
3. Start the Headroom server with `node server.js`
4. Open http://localhost:3023 in your browser

## Project Status

Headroom is currently in the early development phase. The text chat functionality with Ollama is implemented, with voice capabilities planned for future iterations.

## License

See the [LICENSE](LICENSE) file for details.
