// Text-to-Speech functionality for Headroom using Kokoro
// Based on https://github.com/hexgrad/kokoro

// TTS Class to handle text-to-speech operations
class TTSHandler {
  constructor(config) {
    this.enabled = config.enabled || false;
    this.useBuiltInFallback = config.useBuiltInFallback !== false;
    this.voice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    
    // Kokoro settings
    this.kokoroEnabled = config.kokoroEnabled !== false;
    this.kokoroURL = config.kokoroURL || 'http://localhost:8008';
    this.kokoroModel = config.kokoroModel || 'default';
    this.kokoroVoice = config.kokoroVoice || 'en_US';
    this.kokoroVoiceModel = config.kokoroVoiceModel || 'default';
    this.kokoroSpeaker = config.kokoroSpeaker || 'default';
    
    // Initialize Web Speech API if available as fallback
    if (this.useBuiltInFallback && 'speechSynthesis' in window) {
      this.initializeVoices();
      // Update voices when they change (some browsers load voices asynchronously)
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = this.initializeVoices.bind(this);
      }
    }
    
    // Initialize Kokoro status
    this.checkKokoroStatus();
  }
  
  // Check if Kokoro server is available
  async checkKokoroStatus() {
    if (!this.kokoroEnabled) return false;
    
    try {
      const response = await fetch(`${this.kokoroURL}/health`, {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('Kokoro TTS server is available');
        return true;
      } else {
        console.warn('Kokoro TTS server returned error', response.status);
        return false;
      }
    } catch (error) {
      console.warn('Kokoro TTS server is not available', error);
      return false;
    }
  }
  
  // Initialize available voices for Web Speech API fallback
  initializeVoices() {
    this.availableVoices = window.speechSynthesis.getVoices();
    console.log('Available fallback voices:', this.availableVoices.length);
    
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
      
      console.log('Selected fallback voice:', this.voice.name);
    }
  }
  
  // Enable or disable TTS
  setEnabled(enabled) {
    this.enabled = enabled;
    return this.enabled;
  }
  
  // Enable or disable Kokoro TTS
  setKokoroEnabled(enabled) {
    this.kokoroEnabled = enabled;
    if (enabled) {
      this.checkKokoroStatus();
    }
    return this.kokoroEnabled;
  }
  
  // Set Kokoro model
  setKokoroModel(model) {
    if (model && typeof model === 'string') {
      this.kokoroModel = model;
      return true;
    }
    return false;
  }
  
  // Set Kokoro voice (language)
  setKokoroVoice(voice) {
    if (voice && typeof voice === 'string') {
      this.kokoroVoice = voice;
      return true;
    }
    return false;
  }
  
  // Set Kokoro voice model
  setKokoroVoiceModel(voiceModel) {
    if (voiceModel && typeof voiceModel === 'string') {
      this.kokoroVoiceModel = voiceModel;
      return true;
    }
    return false;
  }
  
  // Set Kokoro speaker
  setKokoroSpeaker(speaker) {
    if (speaker && typeof speaker === 'string') {
      this.kokoroSpeaker = speaker;
      return true;
    }
    return false;
  }
  
  // Speak text using TTS
  async speak(text) {
    if (!this.enabled || !text) return false;
    
    try {
      // Try to use Kokoro TTS first
      if (this.kokoroEnabled) {
        try {
          const kokoroResponse = await this.useKokoroTTS(text);
          if (kokoroResponse) return true;
        } catch (error) {
          console.warn('Kokoro TTS failed, falling back to browser TTS', error);
        }
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
  
  // Use Kokoro TTS server
  async useKokoroTTS(text) {
    try {
      const response = await fetch(`${this.kokoroURL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          model: this.kokoroModel,
          voice: this.kokoroVoice,
          voice_model: this.kokoroVoiceModel,
          speaker: this.kokoroSpeaker
        })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl); // Clean up
            resolve(true);
          };
          
          audio.onerror = (error) => {
            console.error('Audio playback error:', error);
            URL.revokeObjectURL(audioUrl); // Clean up
            resolve(false);
          };
          
          audio.play().catch(error => {
            console.error('Failed to play audio:', error);
            URL.revokeObjectURL(audioUrl); // Clean up
            resolve(false);
          });
        });
      } else {
        console.error('Kokoro TTS server error:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Kokoro TTS request failed:', error);
      return false;
    }
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
  
  // Get available voices for Web Speech API
  getVoices() {
    return this.availableVoices || [];
  }
  
  // Set voice by name or index for Web Speech API
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