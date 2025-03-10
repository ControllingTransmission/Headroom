# Headroom

An experimental local voice chatbot that runs entirely on your own machine.

## Overview

Headroom is a web-based chatbot interface that leverages local language models to provide AI chat functionality without sending your data to external services. The application supports text and voice chat through an intuitive interface, letting you interact with AI models running completely on your own machine.

## Features

- **Text Chat**: Interact with the AI through a familiar chat interface
- **Voice Input**: Use your microphone for hands-free interaction
- **Voice Output**: Listen to AI responses with text-to-speech
- **Customizable Settings**: Adjust voices, speech recognition language, and more
- **Local Processing**: All data stays on your machine using Ollama's local models
- **Coming Soon**:
  - Enhanced TTS and STT with dedicated servers
  - Persistent conversation history
  - Multiple language models support

## Requirements

- A modern web browser
- [Ollama](https://ollama.ai/) installed locally
- The huihui_ai/qwen2.5-abliterate:32b model

## Getting Started

1. Please refer to [setup.md](setup.md) for detailed installation and configuration instructions.
2. Install Ollama and the required language model
3. Start the Ollama server with `ollama serve`
4. Start the Headroom server with `npm start` or `node server.js`
5. Open http://localhost:3000 in your browser

## Project Status

Headroom is currently in the early development phase. The text chat functionality with Ollama is implemented, with voice capabilities planned for future iterations.

## License

See the [LICENSE](LICENSE) file for details.
