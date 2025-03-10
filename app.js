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
  let ttsEnabled = ttsHandler.enabled;
  
  // Store conversation history
  let conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'assistant', content: 'Hello! I\'m Headroom. How can I assist you today?' }
  ];
  
  // Event listeners
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  document.getElementById('reset-button').addEventListener('click', resetConversation);
  
  // Toggle TTS functionality
  const toggleAudioBtn = document.getElementById('toggle-audio-button');
  toggleAudioBtn.addEventListener('click', () => {
    ttsEnabled = ttsHandler.setEnabled(!ttsEnabled);
    toggleAudioBtn.textContent = ttsEnabled ? 'Disable Audio Response' : 'Enable Audio Response';
    
    if (ttsEnabled) {
      const message = 'Audio responses enabled. Using browser built-in speech synthesis.';
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
  const voiceSelect = document.getElementById('voice-select');
  const rateSlider = document.getElementById('rate-slider');
  const pitchSlider = document.getElementById('pitch-slider');
  const volumeSlider = document.getElementById('volume-slider');
  const rateValue = document.getElementById('rate-value');
  const pitchValue = document.getElementById('pitch-value');
  const volumeValue = document.getElementById('volume-value');
  const testVoiceButton = document.getElementById('test-voice-button');
  
  // Initialize voice settings
  function initializeVoiceSettings() {
    // Populate voice select dropdown for TTS
    const voices = ttsHandler.getVoices();
    if (voices.length > 0) {
      voiceSelect.innerHTML = '';
      voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice === ttsHandler.voice) {
          option.selected = true;
        }
        voiceSelect.appendChild(option);
      });
    }
    
    // Set slider values from TTS handler
    rateSlider.value = ttsHandler.rate;
    pitchSlider.value = ttsHandler.pitch;
    volumeSlider.value = ttsHandler.volume;
    
    // Update displayed values
    rateValue.textContent = ttsHandler.rate.toFixed(1);
    pitchValue.textContent = ttsHandler.pitch.toFixed(1);
    volumeValue.textContent = ttsHandler.volume.toFixed(1);
    
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
  }
  
  // Settings panel event listeners
  settingsButton.addEventListener('click', () => {
    initializeVoiceSettings();
    settingsPanel.style.display = 'block';
  });
  
  closeSettingsButton.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
  });
  
  voiceSelect.addEventListener('change', () => {
    const selectedIndex = parseInt(voiceSelect.value);
    ttsHandler.setVoice(selectedIndex);
  });
  
  rateSlider.addEventListener('input', () => {
    const value = parseFloat(rateSlider.value);
    ttsHandler.setRate(value);
    rateValue.textContent = value.toFixed(1);
  });
  
  pitchSlider.addEventListener('input', () => {
    const value = parseFloat(pitchSlider.value);
    ttsHandler.setPitch(value);
    pitchValue.textContent = value.toFixed(1);
  });
  
  volumeSlider.addEventListener('input', () => {
    const value = parseFloat(volumeSlider.value);
    ttsHandler.setVolume(value);
    volumeValue.textContent = value.toFixed(1);
  });
  
  testVoiceButton.addEventListener('click', () => {
    ttsHandler.speak('This is a test of the current voice settings. Hello, I am Headroom!');
  });
  
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
    conversationHistory = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'assistant', content: 'Hello! I\'m Headroom. How can I assist you today?' }
    ];
    chatMessages.innerHTML = '';
    addMessageToChat('Hello! I\'m Headroom. How can I assist you today?', 'bot');
  }
  
  // Function to speak text using TTS
  async function speakText(text) {
    if (!ttsEnabled) return;
    
    // Use our TTS handler class
    return ttsHandler.speak(text);
  }
});