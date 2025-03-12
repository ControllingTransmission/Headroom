// Text-to-Speech functionality for Headroom using custom TTS server
// Based on https://github.com/myshell-ai/OpenVoice

// TTS Class to handle text-to-speech operations
class TTSHandler {
  constructor(config) {
    console.log('Initializing TTSHandler with config:', config);
    
    // Ensure enabled is a boolean and has a default value
    this.enabled = config && typeof config.enabled !== 'undefined' ? Boolean(config.enabled) : true;
    console.log('TTS enabled initially set to:', this.enabled, '(type:', typeof this.enabled, ')');
    
    // Custom TTS server settings
    this.serverURL = config.openVoiceURL || 'http://localhost:8008';
    this.model = config.openVoiceModel || 'default';
    this.speaker = config.openVoiceSpeaker || 'default';
    
    // Audio element reference for controlling playback
    this.currentAudio = null;
    
    // Request counter to track and prioritize TTS requests
    this.requestCounter = 0;
    this.currentRequestId = 0;
    
    // Initialize server status
    this.checkServerStatus();
  }
  
  // Check if TTS server is available
  async checkServerStatus() {
    try {
      console.log('Checking TTS server health...');
      const response = await fetch(`${this.serverURL}/health`, {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('✅ TTS server is available and ready');
        return true;
      } else {
        console.warn('⚠️ TTS server returned error', response.status);
        return false;
      }
    } catch (error) {
      console.warn('❌ TTS server is not available', error);
      return false;
    }
  }
  
  // Enable or disable TTS
  setEnabled(enabled) {
    console.log(`Setting TTS enabled state to: ${enabled} (type: ${typeof enabled})`);
    // Ensure we're working with a boolean value
    this.enabled = Boolean(enabled);
    console.log(`TTS enabled state is now: ${this.enabled} (type: ${typeof this.enabled})`);
    return this.enabled;
  }
  
  // Set TTS model
  setModel(model) {
    if (model && typeof model === 'string') {
      this.model = model;
      return true;
    }
    return false;
  }
  
  // Set TTS speaker
  setSpeaker(speaker) {
    if (speaker && typeof speaker === 'string') {
      this.speaker = speaker;
      return true;
    }
    return false;
  }
  
  // Get available voices from TTS server
  async getVoices() {
    try {
      const response = await fetch(`${this.serverURL}/voices`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.voices || [];
      } else {
        console.warn('Failed to get TTS voices:', response.status);
        return [];
      }
    } catch (error) {
      console.warn('Error fetching TTS voices:', error);
      return [];
    }
  }
  
  // Stop any currently playing speech
  stopSpeaking() {
    // Increment request counter to invalidate any pending TTS requests
    this.requestCounter++;
    this.currentRequestId = this.requestCounter;
    
    if (this.currentAudio) {
      console.log(`Stopping current speech playback (new request #${this.currentRequestId})`);
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      return true;
    }
    console.log(`No audio playing, but invalidated pending requests (new request #${this.currentRequestId})`);
    return false;
  }
  
  // Speak text using TTS
  async speak(text) {
    if (!text) {
      console.log('Empty text passed to speak(), ignoring request');
      return false;
    }
    
    if (!this.enabled) {
      console.log('TTS is disabled, but received speak request for:', text.substring(0, 30) + '...');
      return false;
    }
    
    // Stop any currently playing speech
    this.stopSpeaking();
    
    // Increment request counter to track this specific request
    this.requestCounter++;
    const thisRequestId = this.requestCounter;
    this.currentRequestId = thisRequestId;
    
    console.log(`TTS speak called [request #${thisRequestId}] with text:`, text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    console.log('TTS settings:', { 
      enabled: this.enabled, 
      serverURL: this.serverURL,
      model: this.model,
      speaker: this.speaker,
      requestId: thisRequestId
    });
    
    try {
      // Check if this request is still valid (no newer requests have been made)
      if (thisRequestId !== this.currentRequestId) {
        console.log(`Request #${thisRequestId} was superseded by #${this.currentRequestId}, aborting`);
        return false;
      }
      
      // Check if the server is accessible
      const healthResponse = await fetch(`${this.serverURL}/health`, {
        method: 'GET'
      }).catch(err => {
        console.error(`TTS health check failed for request #${thisRequestId}:`, err);
        return null;
      });
      
      if (!healthResponse || !healthResponse.ok) {
        console.error(`TTS server is not available for request #${thisRequestId}:`, healthResponse?.status);
        throw new Error('TTS server is not available');
      }
      
      // Check again if this request is still valid
      if (thisRequestId !== this.currentRequestId) {
        console.log(`Request #${thisRequestId} was superseded by #${this.currentRequestId}, aborting`);
        return false;
      }
      
      console.log(`TTS server is available, sending request #${thisRequestId}`);
      const response = await this.sendTTSRequest(text, thisRequestId);
      if (response) {
        console.log(`TTS succeeded for request #${thisRequestId}`);
        return true;
      } else {
        console.error(`TTS failed for request #${thisRequestId}`);
        return false;
      }
    } catch (error) {
      console.error(`TTS error for request #${thisRequestId}:`, error);
      return false;
    }
  }
  
  // Send TTS request to server
  async sendTTSRequest(text, requestId) {
    try {
      console.log(`Making POST request to TTS server [request #${requestId}]:`, 
        `${this.serverURL}/tts`);
      
      // Check if this request is still valid before proceeding
      if (requestId !== this.currentRequestId) {
        console.log(`Request #${requestId} was superseded by #${this.currentRequestId}, aborting TTS request`);
        return false;
      }
      
      const requestBody = {
        text: text,
        model: this.model,
        speaker: this.speaker
      };
      console.log(`Request #${requestId} body:`, requestBody);
      
      const response = await fetch(`${this.serverURL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log(`TTS response status for request #${requestId}:`, response.status);
      
      // Check again if this request is still valid after receiving the response
      if (requestId !== this.currentRequestId) {
        console.log(`Request #${requestId} was superseded by #${this.currentRequestId}, discarding response`);
        return false;
      }
      
      if (response.ok) {
        console.log(`Received successful response from TTS server for request #${requestId}`);
        const audioBlob = await response.blob();
        console.log(`Audio blob received for request #${requestId}:`, audioBlob.type, audioBlob.size, 'bytes');
        
        // Final check before playing audio
        if (requestId !== this.currentRequestId) {
          console.log(`Request #${requestId} was superseded by #${this.currentRequestId}, discarding audio`);
          return false;
        }
        
        console.log(`Creating audio element for request #${requestId} with blob type:`, audioBlob.type);
        
        // Check if we got the right content type
        if (!audioBlob.type.includes('audio/')) {
          console.warn(`Unexpected content type for audio: ${audioBlob.type}, will attempt to play anyway`);
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log(`Created blob URL: ${audioUrl}`);
        
        // Create new audio element with debugging
        const audio = new Audio();
        
        // Add listeners before setting source
        audio.oncanplay = () => console.log(`Audio can play now [request #${requestId}]`);
        audio.oncanplaythrough = () => console.log(`Audio can play through without buffering [request #${requestId}]`);
        audio.onwaiting = () => console.log(`Audio playback waiting for more data [request #${requestId}]`);
        
        // Set the source
        audio.src = audioUrl;
        audio.load(); // Force loading
        
        console.log(`Audio element created and source set [request #${requestId}]`);
        
        // Store reference to the audio element so we can stop it later
        this.currentAudio = audio;
        
        return new Promise((resolve) => {
          // Set volume explicitly
          audio.volume = 1.0;
          
          audio.onended = () => {
            console.log(`Audio playback completed [request #${requestId}]`);
            URL.revokeObjectURL(audioUrl); // Clean up
            this.currentAudio = null; // Clear reference
            resolve(true);
          };
          
          audio.onerror = (event) => {
            console.error(`Audio playback error [request #${requestId}]:`, 
                         audio.error ? audio.error.code : 'unknown error', 
                         audio.error ? audio.error.message : '');
            URL.revokeObjectURL(audioUrl); // Clean up
            this.currentAudio = null; // Clear reference
            resolve(false);
          };
          
          // Wait until the audio is properly loaded before playing
          let retryCount = 0;
          const MAX_RETRIES = 10; // Only try for ~1 second
          
          const checkAndPlay = () => {
            // Check if the audio is actually ready to play
            console.log(`Audio state check: readyState=${audio.readyState}, duration=${audio.duration}`);
            
            // Add check for failed or empty audio
            if (audio.error || (audio.readyState > 1 && audio.duration === 0)) {
              console.log(`Audio appears to be empty or invalid [request #${requestId}], ending playback attempt`);
              URL.revokeObjectURL(audioUrl); // Clean up
              this.currentAudio = null; // Clear reference
              resolve(false);
              return;
            }
            
            // Limit retries to avoid infinite loops
            if (retryCount >= MAX_RETRIES) {
              console.log(`Giving up after ${MAX_RETRIES} retries [request #${requestId}]`);
              URL.revokeObjectURL(audioUrl); // Clean up
              this.currentAudio = null; // Clear reference
              resolve(false);
              return;
            }
            
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or better
              console.log(`Audio is ready to play [request #${requestId}]`);
              
              // Play with promise and catch errors
              const playPromise = audio.play();
              
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log(`Audio playback started successfully [request #${requestId}]`);
                  })
                  .catch(error => {
                    console.error(`Failed to play audio [request #${requestId}]:`, error);
                    URL.revokeObjectURL(audioUrl); // Clean up
                    this.currentAudio = null; // Clear reference
                    resolve(false);
                  });
              } else {
                console.log(`Play didn't return a promise, assuming playback started [request #${requestId}]`);
              }
            } else {
              // Not ready yet, check again in 100ms
              console.log(`Audio not ready yet, waiting... [request #${requestId}], retry #${retryCount+1}`);
              retryCount++;
              setTimeout(checkAndPlay, 100);
            }
          };
          
          // Add error handler for decoding errors
          audio.onerror = function() {
            console.error(`Audio failed to load: ${audio.error ? audio.error.message : 'unknown error'}`);
            URL.revokeObjectURL(audioUrl); // Clean up
            resolve(false);
          };
          
          // Start checking if audio is ready, with a short initial delay
          setTimeout(checkAndPlay, 200);
        });
      } else {
        console.error('TTS server error:', response.status);
        try {
          const errorText = await response.text();
          console.error('Error response:', errorText);
        } catch (e) {
          console.error('Could not read error response');
        }
        return false;
      }
    } catch (error) {
      console.error('TTS request failed:', error);
      return false;
    }
  }
  
  // Set speech rate (0.1 to 10)
  setRate(rate) {
    if (rate >= 0.1 && rate <= 10) {
      this.rate = rate;
      // Convert rate to model name
      if (rate < 0.8) {
        this.model = 'slow';
      } else if (rate > 1.2) {
        this.model = 'fast';
      } else {
        this.model = 'default';
      }
      console.log(`Set rate to ${rate}, model set to ${this.model}`);
      return true;
    }
    return false;
  }
}

// Export the TTSHandler class for use in main app.js
window.TTSHandler = TTSHandler;