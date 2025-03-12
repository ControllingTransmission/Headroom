document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const chatMessages = document.getElementById('chat-messages');
  const voiceInputButton = document.getElementById('voice-input-button');
  const toggleAudioButton = document.getElementById('toggle-audio-button');
  
  // Speech recognition status
  let sttEnabled = false;
  let speechHandler = null;
  
  // Get configuration from config.js
  const OLLAMA_URL = window.HEADROOM_CONFIG.OLLAMA.url;
  const MODEL = window.HEADROOM_CONFIG.OLLAMA.model;
  const SYSTEM_PROMPT = window.HEADROOM_CONFIG.OLLAMA.systemPrompt;
  
  // Initialize TTS handler
  const ttsHandler = new TTSHandler(window.HEADROOM_CONFIG.TTS);
  
  // Make sure ttsEnabled is synchronized with the handler's state
  let ttsEnabled = ttsHandler.enabled;
  console.log('Initial TTS enabled state:', ttsEnabled);
  
  // Initial welcome message to be shown and spoken on page load
  const initialMessage = 'Hello! I\'m Headroom. How can I assist you today?';

  // Store conversation history
  let conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'assistant', content: initialMessage }
  ];
  
  // Event listeners
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  document.getElementById('reset-button').addEventListener('click', resetConversation);
  
  // Create a comprehensive permissions panel for both audio output and microphone input
  
  // Make sure audio is enabled by default in the settings
  ttsHandler.enabled = true;
  ttsEnabled = true;
  
  // Set initial button text to properly reflect that audio is enabled
  const toggleAudioBtn = document.getElementById('toggle-audio-button');
  toggleAudioBtn.textContent = 'Disable Audio Response';
  
  // Create a modal overlay for permissions
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  
  // Create the permission dialog with a modern design
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background-color: white;
    border-radius: 12px;
    padding: 30px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  `;
  
  // Add content to the dialog
  dialog.innerHTML = `
    <h2 style="margin-top: 0; color: #333; font-size: 24px;">Welcome to Headroom</h2>
    <p style="color: #555; margin-bottom: 25px; line-height: 1.5;">
      Headroom needs permission to access your device's microphone and audio playback.
      All speech processing happens completely locally on your device - no internet needed.
    </p>
    
    <div style="display: flex; margin-bottom: 30px; justify-content: space-between; flex-wrap: wrap;">
      <!-- Audio output permission section -->
      <div style="flex: 1; min-width: 200px; padding: 15px; border: 1px solid #eee; border-radius: 8px; margin: 0 10px 10px 0;">
        <div style="font-size: 40px; color: #4CAF50; margin-bottom: 10px;">🔊</div>
        <h3 style="margin: 0 0 10px 0; color: #444;">Speech Output</h3>
        <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
          Allows Headroom to speak responses using custom OpenVoice technology (100% offline)
        </p>
        <div id="audio-output-status" style="
          background-color: #fff9c4;
          color: #856404;
          padding: 5px;
          border-radius: 4px;
          font-size: 12px;
          margin-bottom: 10px;
        ">Waiting for permission</div>
      </div>
      
      <!-- Microphone input permission section -->
      <div style="flex: 1; min-width: 200px; padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px;">
        <div style="font-size: 40px; color: #2196F3; margin-bottom: 10px;">🎤</div>
        <h3 style="margin: 0 0 10px 0; color: #444;">Voice Input</h3>
        <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
          Allows you to speak to Headroom using your microphone
        </p>
        <div id="mic-status" style="
          background-color: #fff9c4;
          color: #856404;
          padding: 5px;
          border-radius: 4px;
          font-size: 12px;
          margin-bottom: 10px;
        ">Waiting for permission</div>
      </div>
    </div>
    
    <button id="enable-permissions-btn" style="
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: block;
      margin: 0 auto;
    ">Enable Permissions</button>
    
    <p style="font-size: 12px; color: #999; margin-top: 20px;">
      You can change these permissions later in your browser settings.
    </p>
  `;
  
  // Add the dialog to the overlay
  overlay.appendChild(dialog);
  
  // Add the overlay to the document
  document.body.appendChild(overlay);
  
  // Function to initialize chat after permissions are granted
  const initializeChat = () => {
    // Remove the overlay
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    
    // Set local storage flag to remember this device has given permission
    try {
      localStorage.setItem('headroom_permissions_granted', 'true');
    } catch (e) {
      console.warn('Unable to store permissions in localStorage');
    }
    
    // Initialize the conversation
    console.log('Initializing conversation with welcome message');
    resetConversation();
  };
  
  // Add hover effect to button
  setTimeout(() => {
    const permissionsBtn = document.getElementById('enable-permissions-btn');
    
    if (permissionsBtn) {
      permissionsBtn.onmouseover = () => {
        permissionsBtn.style.backgroundColor = '#45a049';
        permissionsBtn.style.transform = 'translateY(-2px)';
        permissionsBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      };
      
      permissionsBtn.onmouseout = () => {
        permissionsBtn.style.backgroundColor = '#4CAF50';
        permissionsBtn.style.transform = 'translateY(0)';
        permissionsBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      };
      
      // Add click handler for the permissions button
      permissionsBtn.addEventListener('click', async () => {
        console.log('User clicked to enable permissions');
        permissionsBtn.disabled = true;
        permissionsBtn.textContent = 'Requesting permissions...';
        
        // Request audio output permission by playing silent audio
        const audioOutputStatus = document.getElementById('audio-output-status');
        const micStatus = document.getElementById('mic-status');
        
        try {
          // Step 1: Request audio output permission
          audioOutputStatus.textContent = 'Requesting permission...';
          audioOutputStatus.style.backgroundColor = '#fff9c4';
          audioOutputStatus.style.color = '#856404';
          
          // Play a silent sound to unlock audio
          const silentSound = new Audio("data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
          await silentSound.play();
          
          console.log('Audio output permission granted');
          audioOutputStatus.textContent = 'Permission granted ✓';
          audioOutputStatus.style.backgroundColor = '#d4edda';
          audioOutputStatus.style.color = '#155724';
          
          // Step 2: Request microphone permission
          micStatus.textContent = 'Requesting permission...';
          micStatus.style.backgroundColor = '#fff9c4';
          micStatus.style.color = '#856404';
          
          // Request microphone access
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          console.log('Microphone permission granted');
          micStatus.textContent = 'Permission granted ✓';
          micStatus.style.backgroundColor = '#d4edda';
          micStatus.style.color = '#155724';
          
          // Stop the microphone stream since we just needed permission
          stream.getTracks().forEach(track => track.stop());
          
          // Update button to show success
          permissionsBtn.textContent = 'All Permissions Granted ✓';
          permissionsBtn.style.backgroundColor = '#28a745';
          
          // Wait a moment to show the success state before proceeding
          setTimeout(() => {
            // Initialize the chat with audio enabled
            initializeChat();
          }, 1000);
          
        } catch (error) {
          console.error('Error requesting permissions:', error);
          
          // Check which permission failed
          if (audioOutputStatus.textContent !== 'Permission granted ✓') {
            audioOutputStatus.textContent = 'Permission denied ✗';
            audioOutputStatus.style.backgroundColor = '#f8d7da';
            audioOutputStatus.style.color = '#721c24';
          }
          
          if (micStatus.textContent !== 'Permission granted ✓') {
            micStatus.textContent = 'Permission denied ✗';
            micStatus.style.backgroundColor = '#f8d7da';
            micStatus.style.color = '#721c24';
          }
          
          // Update button to allow retry
          permissionsBtn.disabled = false;
          permissionsBtn.textContent = 'Retry Permissions';
          
          // Show a message explaining the issue
          const errorMessage = document.createElement('p');
          errorMessage.style.cssText = 'color: #721c24; background-color: #f8d7da; padding: 10px; border-radius: 4px; margin-top: 15px;';
          errorMessage.textContent = 'Some permissions were denied. The app will still work, but with limited functionality.';
          
          // Add a skip button to proceed anyway
          const skipButton = document.createElement('button');
          skipButton.textContent = 'Continue Anyway';
          skipButton.style.cssText = 'background-color: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer;';
          skipButton.onclick = () => {
            initializeChat();
          };
          
          // Add these elements to the dialog
          dialog.appendChild(errorMessage);
          dialog.appendChild(skipButton);
        }
      });
    }
  }, 100); // Small delay to ensure DOM is ready
  
  // Toggle TTS functionality - the variable is already declared above
  // No need to redeclare toggleAudioBtn
  
  toggleAudioBtn.addEventListener('click', () => {
    // Get the current state directly from the handler
    const currentState = ttsHandler.enabled;
    console.log('Current TTS state before toggle:', currentState);
    
    // Toggle the TTS state
    const newState = !currentState;
    ttsEnabled = ttsHandler.setEnabled(newState);
    console.log('TTS state toggled to:', ttsEnabled, 'handler state:', ttsHandler.enabled);
    
    // Update button text based on the actual new state from the handler
    toggleAudioBtn.textContent = ttsHandler.enabled ? 'Disable Audio Response' : 'Enable Audio Response';
    console.log('Updated TTS button text to:', toggleAudioBtn.textContent);
    
    if (ttsEnabled) {
      let message;
      if (ttsHandler.openVoiceEnabled) {
        message = 'Audio responses enabled. Using OpenVoice TTS.';
      } else {
        message = 'Audio responses enabled. Using browser built-in speech synthesis.';
      }
      addMessageToChat(message, 'bot');
      // Speak the confirmation message
      ttsHandler.speak(message);
    } else {
      addMessageToChat('Audio responses disabled.', 'bot');
    }
  });
  
  // Settings panel functionality
  const settingsButton = document.getElementById('settings-button');
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettingsButton = document.getElementById('close-settings-button');
  
  // These elements are hidden or removed from the UI but we keep references for compatibility
  const voiceSelect = document.getElementById('voice-select');
  
  // We don't need references to these removed elements anymore
  // const rateSlider = document.getElementById('rate-slider');
  // const pitchSlider = document.getElementById('pitch-slider');
  // const volumeSlider = document.getElementById('volume-slider');
  // const rateValue = document.getElementById('rate-value');
  // const pitchValue = document.getElementById('pitch-value');
  // const volumeValue = document.getElementById('volume-value');
  // const testVoiceButton = document.getElementById('test-voice-button');
  
  // Initialize voice settings
  function initializeVoiceSettings() {
    // Set OpenVoice TTS settings
    const openVoiceEnabledCheckbox = document.getElementById('openvoice-enabled-checkbox');
    const openVoiceModelSelect = document.getElementById('openvoice-model-select');
    const openVoiceSpeakerSelect = document.getElementById('openvoice-speaker-select');
    
    // Always set as checked and disabled
    openVoiceEnabledCheckbox.checked = true;
    openVoiceEnabledCheckbox.disabled = true;
    
    // The browser TTS section is now hidden via HTML
    
    // Update the checkbox label to indicate it's using local TTS
    const checkboxLabel = openVoiceEnabledCheckbox.nextElementSibling;
    if (checkboxLabel && checkboxLabel.tagName === 'LABEL') {
      checkboxLabel.textContent = 'Use Local TTS (system voices)';
    }
    
    // Add a note that only local TTS is available
    const noteElement = document.createElement('div');
    noteElement.innerHTML = '<p style="margin: 10px 0; color: #3498db;">Using local system voices exclusively. Web speech is disabled.</p>';
    openVoiceEnabledCheckbox.parentNode.appendChild(noteElement);
    
    // Update the test button label
    const testButton = document.getElementById('test-openvoice-button');
    if (testButton) {
      testButton.textContent = 'Test Local TTS';
    }
    
    // Set selected OpenVoice model
    if (ttsHandler.openVoiceModel && openVoiceModelSelect.querySelector(`option[value="${ttsHandler.openVoiceModel}"]`)) {
      openVoiceModelSelect.value = ttsHandler.openVoiceModel;
    }
    
    // Set selected OpenVoice speaker
    if (ttsHandler.openVoiceSpeaker && openVoiceSpeakerSelect.querySelector(`option[value="${ttsHandler.openVoiceSpeaker}"]`)) {
      openVoiceSpeakerSelect.value = ttsHandler.openVoiceSpeaker;
    }
    
    // Clear browser voice select dropdown if it exists
    if (voiceSelect) {
      voiceSelect.innerHTML = '';
      voiceSelect.innerHTML = '<option value="">Web TTS not available</option>';
    }
    
    // We've removed the sliders from the UI
    // No need to set their values anymore
    
    // Populate STT language dropdown
    const sttLanguageSelect = document.getElementById('stt-language-select');
    const languages = SpeechHandler.getSupportedLanguages();
    if (languages.length > 0) {
      sttLanguageSelect.innerHTML = '';
      languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        if (speechHandler && lang.code === speechHandler.language) {
          option.selected = true;
        }
        sttLanguageSelect.appendChild(option);
      });
    }
    
    // Set continuous mode checkbox
    const continuousCheckbox = document.getElementById('continuous-checkbox');
    if (speechHandler) {
      continuousCheckbox.checked = speechHandler.continuous;
    }
    
    // Display current model
    const modelNameDisplay = document.getElementById('model-name-display');
    modelNameDisplay.textContent = MODEL;
    
    // Load OpenVoice voices if available
    loadOpenVoiceOptions();
  }
  
  // Function to load available OpenVoice voices from server
  async function loadOpenVoiceOptions() {
    const openVoiceModelSelect = document.getElementById('openvoice-model-select');
    const openVoiceSpeakerSelect = document.getElementById('openvoice-speaker-select');
    
    if (ttsHandler.openVoiceEnabled) {
      try {
        // Try to fetch available voices from OpenVoice server
        const voicesResponse = await fetch(`${ttsHandler.openVoiceURL}/voices`, {
          method: 'GET'
        }).catch(error => {
          console.warn('Failed to fetch OpenVoice voices:', error);
          return null;
        });
        
        if (voicesResponse && voicesResponse.ok) {
          const voicesData = await voicesResponse.json();
          
          // Clear existing options except default
          while (openVoiceSpeakerSelect.options.length > 0) {
            openVoiceSpeakerSelect.remove(0);
          }
          
          // Add available voices
          if (voicesData.voices && Array.isArray(voicesData.voices)) {
            voicesData.voices.forEach(voice => {
              const option = document.createElement('option');
              option.value = voice.id;
              option.textContent = voice.name;
              openVoiceSpeakerSelect.appendChild(option);
            });
            
            // Select current voice if it exists in the list
            if (ttsHandler.openVoiceSpeaker) {
              for (let i = 0; i < openVoiceSpeakerSelect.options.length; i++) {
                if (openVoiceSpeakerSelect.options[i].value === ttsHandler.openVoiceSpeaker) {
                  openVoiceSpeakerSelect.selectedIndex = i;
                  break;
                }
              }
            }
          } else {
            // Add default options if no voices are returned
            const defaultVoices = [
              { id: 'female_1', name: 'Female Voice 1' },
              { id: 'male_1', name: 'Male Voice 1' },
              { id: 'female_2', name: 'Female Voice 2' },
              { id: 'male_2', name: 'Male Voice 2' }
            ];
            
            defaultVoices.forEach(voice => {
              const option = document.createElement('option');
              option.value = voice.id;
              option.textContent = voice.name;
              openVoiceSpeakerSelect.appendChild(option);
            });
            
            // Select the first voice by default
            if (openVoiceSpeakerSelect.options.length > 0) {
              openVoiceSpeakerSelect.selectedIndex = 0;
              ttsHandler.setOpenVoiceSpeaker(openVoiceSpeakerSelect.value);
            }
          }
        }
        
        // Try to fetch available models from OpenVoice server
        const modelsResponse = await fetch(`${ttsHandler.openVoiceURL}/models`, {
          method: 'GET'
        }).catch(error => {
          console.warn('Failed to fetch OpenVoice models:', error);
          return null;
        });
        
        if (modelsResponse && modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          
          // Clear existing options except default
          while (openVoiceModelSelect.options.length > 0) {
            openVoiceModelSelect.remove(0);
          }
          
          // Add available models
          if (modelsData.models && Array.isArray(modelsData.models)) {
            modelsData.models.forEach(model => {
              const option = document.createElement('option');
              option.value = model.id || model.name;
              option.textContent = model.name || model.id;
              openVoiceModelSelect.appendChild(option);
            });
          }
          
          // Add default option if no models returned
          if (openVoiceModelSelect.options.length === 0) {
            const option = document.createElement('option');
            option.value = 'default';
            option.textContent = 'Default';
            openVoiceModelSelect.appendChild(option);
          }
          
          // Select current model if it exists in the list
          if (ttsHandler.openVoiceModel) {
            let modelFound = false;
            for (let i = 0; i < openVoiceModelSelect.options.length; i++) {
              if (openVoiceModelSelect.options[i].value === ttsHandler.openVoiceModel) {
                openVoiceModelSelect.selectedIndex = i;
                modelFound = true;
                break;
              }
            }
            
            // If model not found, select the first one
            if (!modelFound && openVoiceModelSelect.options.length > 0) {
              openVoiceModelSelect.selectedIndex = 0;
              ttsHandler.setOpenVoiceModel(openVoiceModelSelect.value);
            }
          }
        }
      } catch (error) {
        console.error('Error loading OpenVoice options:', error);
      }
    }
  }
  
  // Settings panel event listeners
  settingsButton.addEventListener('click', () => {
    initializeVoiceSettings();
    settingsPanel.style.display = 'block';
  });
  
  closeSettingsButton.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
  });
  
  // OpenVoice TTS event listeners
  const openVoiceEnabledCheckbox = document.getElementById('openvoice-enabled-checkbox');
  const openVoiceModelSelect = document.getElementById('openvoice-model-select');
  const openVoiceSpeakerSelect = document.getElementById('openvoice-speaker-select');
  
  openVoiceEnabledCheckbox.addEventListener('change', () => {
    const enabled = openVoiceEnabledCheckbox.checked;
    console.log('Setting OpenVoice enabled to:', enabled);
    ttsHandler.setOpenVoiceEnabled(enabled);
    
    // Load OpenVoice options if enabled
    if (enabled) {
      loadOpenVoiceOptions();
    }
    
    // Log the new status
    console.log('OpenVoice enabled status is now:', ttsHandler.openVoiceEnabled);
  });
  
  openVoiceModelSelect.addEventListener('change', () => {
    const model = openVoiceModelSelect.value;
    ttsHandler.setOpenVoiceModel(model);
    
    // Also adjust the rate based on model
    if (model === 'slow') {
      ttsHandler.rate = 0.7;
    } else if (model === 'fast') {
      ttsHandler.rate = 1.5;
    } else {
      ttsHandler.rate = 1.0;
    }
    
    console.log(`Changed speech model to ${model}, rate is now ${ttsHandler.rate}`);
  });
  
  openVoiceSpeakerSelect.addEventListener('change', () => {
    ttsHandler.setOpenVoiceSpeaker(openVoiceSpeakerSelect.value);
  });
  
  // Test OpenVoice TTS button
  const testOpenVoiceButton = document.getElementById('test-openvoice-button');
  testOpenVoiceButton.addEventListener('click', () => {
    console.log('Testing local TTS with current settings...');
    // Save current enabled state
    const wasEnabled = ttsHandler.enabled;
    
    // Force enable for testing
    ttsHandler.enabled = true;
    
    // Test with a short sample
    ttsHandler.speak('This is a test of the local text-to-speech system. Hello, I am Headroom!');
    
    // Restore original settings after testing
    setTimeout(() => {
      ttsHandler.enabled = wasEnabled;
    }, 100);
    
    return false; // Prevent default
  });
  
  // We don't need browser TTS event listeners since we've removed that UI
  // But let's keep the code with checks to prevent errors
  
  if (voiceSelect) {
    voiceSelect.addEventListener('change', () => {
      const selectedIndex = parseInt(voiceSelect.value);
      ttsHandler.setVoice(selectedIndex);
    });
  }
  
  // We've removed these UI elements so we shouldn't try to add listeners
  // But adding null checks to prevent errors
  
  // STT settings event listeners
  const sttLanguageSelect = document.getElementById('stt-language-select');
  sttLanguageSelect.addEventListener('change', () => {
    if (speechHandler) {
      const selectedLanguage = sttLanguageSelect.value;
      speechHandler.setLanguage(selectedLanguage);
      
      // If currently listening, restart recognition with new language
      if (speechHandler.isListening) {
        speechHandler.stopListening();
        setTimeout(() => speechHandler.startListening(), 300);
      }
    }
  });
  
  const continuousCheckbox = document.getElementById('continuous-checkbox');
  continuousCheckbox.addEventListener('change', () => {
    if (speechHandler) {
      speechHandler.continuous = continuousCheckbox.checked;
      
      // If currently listening, restart recognition with new setting
      if (speechHandler.isListening) {
        speechHandler.stopListening();
        setTimeout(() => speechHandler.startListening(), 300);
      }
    }
  });
  
  // Voice input setup
  const voiceStatusDiv = document.getElementById('voice-status');
  const transcriptPreview = document.getElementById('transcript-preview');
  let currentTranscript = '';
  
  // Initialize speech handler if Web Speech API is available
  if (SpeechHandler.isSupported()) {
    voiceInputButton.removeAttribute('disabled');
    
    // Handle final speech recognition results
    const handleSpeechResult = (transcript) => {
      currentTranscript = transcript;
      transcriptPreview.textContent = transcript;
      
      // Automatically send message when done speaking
      if (transcript.trim()) {
        messageInput.value = transcript.trim();
      }
    };
    
    // Handle interim speech recognition results (while still speaking)
    const handleInterimResult = (transcript) => {
      currentTranscript = transcript;
      transcriptPreview.textContent = transcript;
    };
    
    // Handle speech recognition start
    const handleSpeechStart = () => {
      sttEnabled = true;
      voiceInputButton.textContent = 'Disable Voice Input';
      voiceStatusDiv.style.display = 'block';
      currentTranscript = '';
      transcriptPreview.textContent = '';
    };
    
    // Handle speech recognition stop
    const handleSpeechStop = () => {
      sttEnabled = false;
      voiceInputButton.textContent = 'Enable Voice Input';
      voiceStatusDiv.style.display = 'none';
      
      // If we have a transcript, send it
      if (currentTranscript.trim()) {
        sendMessage();
      }
    };
    
    // Handle speech recognition errors
    const handleSpeechError = (message, error) => {
      console.error(message, error);
      
      // Only show user-facing errors in the chat
      if (typeof error === 'string' && (
        error.includes('denied') || 
        error.includes('network') || 
        error === 'not-allowed'
      )) {
        addMessageToChat(`Speech recognition error: ${error}`, 'bot');
      }
    };
    
    // Create speech handler with all callbacks
    speechHandler = new SpeechHandler(
      window.HEADROOM_CONFIG.STT,
      handleSpeechResult,
      handleInterimResult,
      handleSpeechStart,
      handleSpeechStop,
      handleSpeechError
    );
    
    // Toggle voice input
    voiceInputButton.addEventListener('click', () => {
      if (!speechHandler) return;
      speechHandler.toggleListening();
      
      if (!sttEnabled) {
        // If we're enabling voice input, show a helpful message
        addMessageToChat('Voice input enabled. Speak into your microphone.', 'bot');
      } else {
        // If we're disabling voice input, show a message only if we didn't already send a message
        if (!currentTranscript.trim()) {
          addMessageToChat('Voice input disabled.', 'bot');
        }
      }
    });
  } else {
    voiceInputButton.title = 'Speech recognition is not supported in your browser';
  }
  
  // Function to send message to the chat
  async function sendMessage() {
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;
    
    // Stop any currently playing speech when a new message is sent
    if (ttsHandler && typeof ttsHandler.stopSpeaking === 'function') {
      ttsHandler.stopSpeaking();
    }
    
    // Add user message to chat interface and history
    addMessageToChat(userMessage, 'user');
    conversationHistory.push({ role: 'user', content: userMessage });
    messageInput.value = '';
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();
    
    try {
      // Send message to Ollama with conversation history
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: conversationHistory,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const botMessage = data.message.content;
      
      // Add bot response to history
      conversationHistory.push({ role: 'assistant', content: botMessage });
      
      // Remove typing indicator and add bot response
      removeTypingIndicator(typingIndicator);
      addMessageToChat(botMessage, 'bot');
      
      // If TTS is enabled, speak the response
      if (ttsEnabled) {
        speakText(botMessage);
      }
    } catch (error) {
      // Remove typing indicator and show error message
      removeTypingIndicator(typingIndicator);
      const errorMessage = `Sorry, I encountered an error connecting to the chat server. Please make sure Ollama is running locally with the ${MODEL} model.`;
      addMessageToChat(errorMessage, 'bot');
      conversationHistory.push({ role: 'assistant', content: errorMessage });
      console.error('Error:', error);
    }
  }
  
  // Function to add message to chat interface
  function addMessageToChat(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    messageElement.textContent = message;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Function to add typing indicator
  function addTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot-message typing-indicator';
    typingIndicator.textContent = 'Thinking...';
    
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingIndicator;
  }
  
  // Function to remove typing indicator
  function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }
  
  // Function to reset conversation
  function resetConversation() {
    console.log('Resetting conversation');
    
    // Clear chat history and UI
    conversationHistory = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'assistant', content: initialMessage }
    ];
    chatMessages.innerHTML = '';
    
    // Add welcome message to chat
    addMessageToChat(initialMessage, 'bot');
    
    // Speak the initial message - always enable TTS for this
    // Stop any currently playing speech first
    if (ttsHandler && typeof ttsHandler.stopSpeaking === 'function') {
      ttsHandler.stopSpeaking();
    }
    
    console.log('Speaking welcome message after reset');
    
    // Force TTS to be temporarily enabled for this message
    const originalEnabled = ttsHandler.enabled;
    console.log('Original TTS enabled state before welcome message:', originalEnabled);
    
    // Force enable TTS just for this message
    ttsHandler.enabled = true;
    
    // Ensure the TTS button reflects the correct state even with our temporary override
    const toggleAudioBtn = document.getElementById('toggle-audio-button');
    const buttonText = originalEnabled ? 'Disable Audio Response' : 'Enable Audio Response';
    toggleAudioBtn.textContent = buttonText;
    console.log('Preserved button state as:', buttonText, 'while forcing TTS on');
    
    setTimeout(() => {
      // Speak the welcome message with a forced enable
      console.log('Speaking welcome message with forced TTS enable');
      
      speakText(initialMessage)
        .then(() => {
          // Important: restore original TTS setting after speaking
          console.log('Welcome message speech completed, restoring TTS to:', originalEnabled);
          ttsHandler.enabled = originalEnabled;
          ttsEnabled = originalEnabled;
          
          // Make sure button text is consistent with restored state
          toggleAudioBtn.textContent = originalEnabled ? 'Disable Audio Response' : 'Enable Audio Response';
        })
        .catch(err => {
          console.error('Error during welcome message speech:', err);
          // Still restore original settings
          ttsHandler.enabled = originalEnabled;
          ttsEnabled = originalEnabled;
          toggleAudioBtn.textContent = originalEnabled ? 'Disable Audio Response' : 'Enable Audio Response';
        });
    }, 800); // Longer delay to ensure UI is ready
  }
  
  // Function to speak text using TTS
  async function speakText(text) {
    console.log(`speakText called with text: "${text.substring(0, 30)}..."`, 
                `ttsEnabled: ${ttsEnabled}, handler enabled: ${ttsHandler.enabled}`);
    
    if (!ttsEnabled) {
      console.log('TTS is disabled, not speaking');
      return;
    }
    
    // Use our TTS handler class
    console.log('Calling TTS handler speak method');
    return ttsHandler.speak(text);
  }
});