// Speech recognition functionality for Headroom

// Check if browser supports the Web Speech API
const isWebSpeechSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// Class to handle speech recognition
class SpeechHandler {
  constructor(config, onResultCallback, onInterimResultCallback, onStartCallback, onStopCallback, onErrorCallback) {
    // Configuration
    this.config = config || {};
    this.language = this.config.language || 'en-US';
    this.continuous = this.config.continuous !== false;
    this.interimResults = this.config.interimResults !== false;
    this.maxAlternatives = this.config.maxAlternatives || 1;
    
    // State
    this.isListening = false;
    this.recognition = null;
    this.autoRestartCount = 0;
    this.maxAutoRestarts = 3;
    this.pauseBeforeRestart = 500; // milliseconds
    
    // Callbacks
    this.onResultCallback = onResultCallback || (() => {});
    this.onInterimResultCallback = onInterimResultCallback || (() => {});
    this.onStartCallback = onStartCallback || (() => {});
    this.onStopCallback = onStopCallback || (() => {});
    this.onErrorCallback = onErrorCallback || console.error;
    
    // Server URL for future custom STT implementation
    this.serverUrl = this.config.url || 'http://localhost:5001/api/stt';
    
    // Initialize Web Speech API if available
    this.initRecognition();
  }
  
  // Initialize speech recognition
  initRecognition() {
    if (!isWebSpeechSupported()) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.lang = this.language;
    this.recognition.continuous = this.continuous;
    this.recognition.interimResults = this.interimResults;
    this.recognition.maxAlternatives = this.maxAlternatives;
    
    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.autoRestartCount = 0;
      console.log('Speech recognition started');
      this.onStartCallback();
    };
    
    this.recognition.onresult = (event) => {
      const results = event.results;
      const currentResult = results[results.length - 1];
      const isFinal = currentResult.isFinal;
      
      // Get the best transcript
      const transcript = currentResult[0].transcript;
      
      // Send to appropriate callback
      if (isFinal) {
        this.onResultCallback(transcript, event);
      } else {
        this.onInterimResultCallback(transcript, event);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.onErrorCallback('Speech recognition error:', event.error);
      
      // Handle specific errors
      if (event.error === 'network') {
        this.onErrorCallback('Network error. Please check your internet connection.');
      } else if (event.error === 'not-allowed') {
        this.onErrorCallback('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'aborted') {
        // This is normal when stopping
        console.log('Speech recognition aborted');
      } else if (event.error === 'no-speech') {
        console.log('No speech detected');
      }
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
      
      // Auto restart if necessary (for continuous mode)
      if (this.continuous && this.shouldAutoRestart) {
        if (this.autoRestartCount < this.maxAutoRestarts) {
          this.autoRestartCount++;
          console.log(`Auto-restarting speech recognition (attempt ${this.autoRestartCount})`);
          
          setTimeout(() => {
            try {
              this.recognition.start();
            } catch (error) {
              console.error('Failed to auto-restart speech recognition:', error);
            }
          }, this.pauseBeforeRestart);
        } else {
          console.warn(`Exceeded maximum auto-restart attempts (${this.maxAutoRestarts})`);
          this.shouldAutoRestart = false;
          this.onStopCallback();
        }
      } else {
        this.onStopCallback();
      }
    };
  }
  
  // Start listening for speech
  startListening() {
    if (this.isListening || !this.recognition) return false;
    
    try {
      this.shouldAutoRestart = this.continuous;
      this.recognition.start();
      return true;
    } catch (error) {
      this.onErrorCallback('Failed to start speech recognition:', error);
      return false;
    }
  }
  
  // Stop listening
  stopListening() {
    if (!this.isListening || !this.recognition) return false;
    
    try {
      this.shouldAutoRestart = false;
      this.recognition.stop();
      return true;
    } catch (error) {
      this.onErrorCallback('Failed to stop speech recognition:', error);
      return false;
    }
  }
  
  // Toggle listening state
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
    return this.isListening;
  }
  
  // Set recognition language
  setLanguage(languageCode) {
    if (!this.recognition) return false;
    
    try {
      this.language = languageCode;
      this.recognition.lang = languageCode;
      return true;
    } catch (error) {
      console.error('Failed to set recognition language:', error);
      return false;
    }
  }
  
  // Check if speech recognition is supported
  static isSupported() {
    return isWebSpeechSupported();
  }
  
  // Get a list of supported languages
  static getSupportedLanguages() {
    // This is a minimal list; the actual supported languages depend on the browser
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'fr-FR', name: 'French (France)' },
      { code: 'de-DE', name: 'German (Germany)' },
      { code: 'it-IT', name: 'Italian (Italy)' },
      { code: 'ja-JP', name: 'Japanese (Japan)' },
      { code: 'ko-KR', name: 'Korean (Korea)' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'zh-TW', name: 'Chinese (Traditional)' },
      { code: 'ru-RU', name: 'Russian (Russia)' }
    ];
  }
}

// Export the SpeechHandler class for use in main app.js
window.SpeechHandler = SpeechHandler;