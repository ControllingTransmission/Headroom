// Configuration for Headroom application

// Ollama chat server configuration
const OLLAMA_CONFIG = {
  url: 'http://localhost:11434/api/chat',
  model: 'qwen:32b',  // The model name to use
  systemPrompt: 'You are a helpful and friendly AI assistant called Headroom. Keep your responses concise and informative.'
};

// Text-to-Speech (TTS) configuration
const TTS_CONFIG = {
  url: 'http://localhost:5002/api/tts',  // Will be used when a real TTS server is implemented
  enabled: false,  // Whether TTS is enabled by default
  useBuiltInFallback: true  // Use browser's built-in speech synthesis as fallback
};

// Speech-to-Text (STT) configuration
const STT_CONFIG = {
  url: 'http://localhost:5001/api/stt',  // Will be used when a real STT server is implemented
  enabled: false,  // Whether STT is enabled by default
  useBuiltInFallback: true  // Use browser's built-in speech recognition as fallback
};

// Expose configuration globally
window.HEADROOM_CONFIG = {
  OLLAMA: OLLAMA_CONFIG,
  TTS: TTS_CONFIG,
  STT: STT_CONFIG
};