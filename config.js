// Configuration for Headroom application

// Ollama chat server configuration
const OLLAMA_CONFIG = {
  url: 'http://localhost:11434/api/chat',
  model: 'huihui_ai/qwen2.5-abliterate:32b',  // The model name to use
  systemPrompt: 'You are a helpful and friendly AI assistant called Headroom. Keep your responses concise and informative.'
};

// Text-to-Speech (TTS) configuration
const TTS_CONFIG = {
  enabled: true,  // Whether TTS is enabled by default
  
  // TTS server configuration
  openVoiceURL: 'http://localhost:8008',  // Custom TTS server URL
  openVoiceModel: 'clear',  // The model to use
  openVoiceSpeaker: 'default' // The speaker ID to use
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