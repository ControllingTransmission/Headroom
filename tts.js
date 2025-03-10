// Text-to-Speech functionality for Headroom

// TTS Class to handle text-to-speech operations
class TTSHandler {
  constructor(config) {
    this.enabled = config.enabled || false;
    this.url = config.url || 'http://localhost:5002/api/tts';
    this.useBuiltInFallback = config.useBuiltInFallback !== false;
    this.voice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    
    // Initialize Web Speech API if available
    if (this.useBuiltInFallback && 'speechSynthesis' in window) {
      this.initializeVoices();
      // Update voices when they change (some browsers load voices asynchronously)
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = this.initializeVoices.bind(this);
      }
    }
  }
  
  // Initialize available voices
  initializeVoices() {
    this.availableVoices = window.speechSynthesis.getVoices();
    console.log('Available voices:', this.availableVoices.length);
    
    // Try to select a good default voice
    if (this.availableVoices.length > 0) {
      // Prefer a female voice if available
      const preferredVoices = this.availableVoices.filter(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Samantha') || 
        voice.name.includes('Google UK English Female')
      );
      
      if (preferredVoices.length > 0) {
        this.voice = preferredVoices[0];
      } else {
        // Otherwise use the first voice
        this.voice = this.availableVoices[0];
      }
      
      console.log('Selected voice:', this.voice.name);
    }
  }
  
  // Enable or disable TTS
  setEnabled(enabled) {
    this.enabled = enabled;
    return this.enabled;
  }
  
  // Speak text using TTS
  async speak(text) {
    if (!this.enabled || !text) return false;
    
    try {
      // Try to use the external TTS server first
      try {
        const serverResponse = await this.useServerTTS(text);
        if (serverResponse) return true;
      } catch (error) {
        console.warn('External TTS server failed, falling back to browser TTS', error);
      }
      
      // Fall back to browser's built-in speech synthesis
      if (this.useBuiltInFallback && 'speechSynthesis' in window) {
        return this.useBuiltInTTS(text);
      } else {
        console.error('No TTS method available');
        return false;
      }
    } catch (error) {
      console.error('TTS error:', error);
      return false;
    }
  }
  
  // Use external TTS server
  async useServerTTS(text) {
    // This is a placeholder for an actual TTS server implementation
    // Will be implemented in a future update
    
    // In the future, this will be replaced with:
    // const response = await fetch(this.url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ text })
    // });
    // 
    // if (response.ok) {
    //   const audioBlob = await response.blob();
    //   const audioUrl = URL.createObjectURL(audioBlob);
    //   const audio = new Audio(audioUrl);
    //   await audio.play();
    //   return true;
    // }
    
    // For now, consider external server not working
    return false;
  }
  
  // Use browser's built-in speech synthesis
  useBuiltInTTS(text) {
    if (!('speechSynthesis' in window)) return false;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice if available
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    // Set other speech properties
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
    return true;
  }
  
  // Get available voices
  getVoices() {
    return this.availableVoices || [];
  }
  
  // Set voice by name or index
  setVoice(voiceNameOrIndex) {
    if (!this.availableVoices || this.availableVoices.length === 0) return false;
    
    if (typeof voiceNameOrIndex === 'number') {
      // Set by index
      if (voiceNameOrIndex >= 0 && voiceNameOrIndex < this.availableVoices.length) {
        this.voice = this.availableVoices[voiceNameOrIndex];
        return true;
      }
    } else if (typeof voiceNameOrIndex === 'string') {
      // Set by name
      const matchingVoice = this.availableVoices.find(v => 
        v.name.toLowerCase().includes(voiceNameOrIndex.toLowerCase())
      );
      
      if (matchingVoice) {
        this.voice = matchingVoice;
        return true;
      }
    }
    
    return false;
  }
  
  // Set speech rate (0.1 to 10)
  setRate(rate) {
    if (rate >= 0.1 && rate <= 10) {
      this.rate = rate;
      return true;
    }
    return false;
  }
  
  // Set speech pitch (0 to 2)
  setPitch(pitch) {
    if (pitch >= 0 && pitch <= 2) {
      this.pitch = pitch;
      return true;
    }
    return false;
  }
  
  // Set speech volume (0 to 1)
  setVolume(volume) {
    if (volume >= 0 && volume <= 1) {
      this.volume = volume;
      return true;
    }
    return false;
  }
}

// Export the TTSHandler class for use in main app.js
window.TTSHandler = TTSHandler;