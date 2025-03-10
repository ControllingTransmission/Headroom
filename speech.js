// Speech recognition functionality for Headroom

// Configuration will be loaded from config.js

// Check if browser supports the Web Speech API
const isWebSpeechSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// Class to handle speech recognition
class SpeechHandler {
  constructor(onResultCallback, onErrorCallback) {
    this.isListening = false;
    this.recognition = null;
    this.onResultCallback = onResultCallback || (() => {});
    this.onErrorCallback = onErrorCallback || console.error;
    
    // Initialize Web Speech API if available (fallback for testing)
    if (isWebSpeechSupported()) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
          
        this.onResultCallback(transcript);
      };
      
      this.recognition.onerror = (event) => {
        this.onErrorCallback('Speech recognition error:', event.error);
      };
    }
  }
  
  // Start listening for speech
  startListening() {
    if (this.isListening) return;
    
    if (this.recognition) {
      try {
        this.recognition.start();
        this.isListening = true;
        console.log('Speech recognition started');
      } catch (error) {
        this.onErrorCallback('Failed to start speech recognition:', error);
      }
    } else {
      this.onErrorCallback('Speech recognition not supported in this browser');
    }
  }
  
  // Stop listening
  stopListening() {
    if (!this.isListening) return;
    
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.isListening = false;
        console.log('Speech recognition stopped');
      } catch (error) {
        this.onErrorCallback('Failed to stop speech recognition:', error);
      }
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
}

// Export the SpeechHandler class for use in main app.js
window.SpeechHandler = SpeechHandler;