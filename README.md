# Headroom

An experimental local voice chatbot that runs entirely on your own machine.

## Overview

Headroom is a web-based chatbot interface that leverages local language models to provide AI chat functionality without sending your data to external services. The application currently supports text chat and will eventually include voice input and output capabilities.

## Features

- **Text Chat**: Interact with the AI through a familiar chat interface
- **Local Processing**: All data stays on your machine using Ollama's local models
- **Coming Soon**:
  - Speech-to-text input capability
  - Text-to-speech output capability
  - Persistent conversation history

## Requirements

- A modern web browser
- [Ollama](https://ollama.ai/) installed locally
- The Qwen 32B model

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
