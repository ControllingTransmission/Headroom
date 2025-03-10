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
  
  // TTS configuration
  let ttsEnabled = window.HEADROOM_CONFIG.TTS.enabled;
  const TTS_URL = window.HEADROOM_CONFIG.TTS.url;
  
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
    ttsEnabled = !ttsEnabled;
    toggleAudioBtn.textContent = ttsEnabled ? 'Disable Audio Response' : 'Enable Audio Response';
    
    if (ttsEnabled) {
      addMessageToChat('Audio responses enabled. Note: This feature requires a TTS server to be running locally.', 'bot');
    } else {
      addMessageToChat('Audio responses disabled.', 'bot');
    }
  });
  
  // Voice input setup
  const voiceStatusDiv = document.getElementById('voice-status');
  const transcriptPreview = document.getElementById('transcript-preview');
  let currentTranscript = '';
  
  // Initialize speech handler if Web Speech API is available
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    voiceInputButton.removeAttribute('disabled');
    
    // Handle speech recognition results
    const handleSpeechResult = (transcript) => {
      currentTranscript = transcript;
      transcriptPreview.textContent = transcript;
    };
    
    // Handle speech recognition errors
    const handleSpeechError = (message, error) => {
      console.error(message, error);
      addMessageToChat(`Speech recognition error: ${error}`, 'bot');
    };
    
    // Create speech handler
    speechHandler = new SpeechHandler(handleSpeechResult, handleSpeechError);
    
    // Toggle voice input
    voiceInputButton.addEventListener('click', () => {
      if (!speechHandler) return;
      
      const isListening = speechHandler.toggleListening();
      sttEnabled = isListening;
      
      voiceInputButton.textContent = isListening ? 'Disable Voice Input' : 'Enable Voice Input';
      voiceStatusDiv.style.display = isListening ? 'block' : 'none';
      
      if (isListening) {
        currentTranscript = '';
        transcriptPreview.textContent = '';
        addMessageToChat('Voice input enabled. Speak into your microphone.', 'bot');
      } else {
        if (currentTranscript.trim()) {
          // Submit the final transcript as a user message
          messageInput.value = currentTranscript.trim();
          sendMessage();
        }
        addMessageToChat('Voice input disabled.', 'bot');
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
      const errorMessage = 'Sorry, I encountered an error connecting to the chat server. Please make sure Ollama is running locally with the Qwen 32B model.';
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
  
  // Function to speak text using TTS (placeholder for future implementation)
  async function speakText(text) {
    if (!ttsEnabled) return;
    
    try {
      // This is a placeholder for the actual TTS API call
      console.log('TTS would speak:', text);
      
      // In the future, this will be replaced with actual TTS API call:
      // const response = await fetch(TTS_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text })
      // });
      // 
      // if (response.ok) {
      //   const audioBlob = await response.blob();
      //   const audioUrl = URL.createObjectURL(audioBlob);
      //   const audio = new Audio(audioUrl);
      //   audio.play();
      // }
      
      // For now, use browser's built-in speech synthesis as a fallback demo
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  }
});