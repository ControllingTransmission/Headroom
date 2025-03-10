#!/bin/bash

# launch.sh - Script to launch all required services for Headroom
# This script starts Ollama, Kokoro TTS server (if installed), and the Headroom web server

# ANSI color codes for prettier output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║                   HEADROOM LAUNCHER                        ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if a process is running
is_process_running() {
  pgrep -f "$1" >/dev/null
}

# Check for required dependencies
echo -e "${BOLD}Checking dependencies...${NC}"

# Check if Node.js is installed
if ! command_exists node; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run Headroom.${NC}"
  exit 1
else
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓ Node.js is installed (${NODE_VERSION})${NC}"
fi

# Check if Ollama is installed
if ! command_exists ollama; then
  echo -e "${RED}Error: Ollama is not installed. Please install Ollama from https://ollama.ai/${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Ollama is installed${NC}"
fi

# Check if Kokoro is installed (optional)
KOKORO_INSTALLED=false
KOKORO_PATH=""

# Check if the virtual environment for Kokoro exists
if [ -d "./kokoro_env" ]; then
  # Check if run_kokoro.py exists
  if [ -f "./run_kokoro.py" ]; then
    KOKORO_INSTALLED=true
    KOKORO_PATH="./run_kokoro.py"
    echo -e "${GREEN}✓ Kokoro TTS is found with new server implementation${NC}"
  else
    echo -e "${YELLOW}⚠ Kokoro TTS virtual environment found but missing run_kokoro.py script.${NC}"
    echo -e "${YELLOW}  Will use browser's built-in TTS.${NC}"
  fi
else
  # Check common paths where Kokoro might be installed
  KOKORO_POSSIBLE_PATHS=(
    "/usr/local/bin/kokoro"
    "/usr/bin/kokoro"
    "$HOME/.local/bin/kokoro"
    "$HOME/kokoro/kokoro"
  )

  # Check for Kokoro installation
  for path in "${KOKORO_POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ] && [ -x "$path" ]; then
      KOKORO_INSTALLED=true
      KOKORO_PATH="$path"
      break
    fi
  done

  if $KOKORO_INSTALLED; then
    echo -e "${GREEN}✓ Kokoro TTS is installed${NC}"
  else
    echo -e "${YELLOW}⚠ Kokoro TTS is not found. Will use browser's built-in TTS.${NC}"
    echo -e "${YELLOW}  To install Kokoro, run: ./start_kokoro.sh${NC}"
  fi
fi

echo

# Check if the required language model is installed in Ollama
echo -e "${BOLD}Checking for required language model...${NC}"
if ! ollama list | grep -q "huihui_ai/qwen2.5-abliterate:32b"; then
  echo -e "${YELLOW}⚠ Required model 'huihui_ai/qwen2.5-abliterate:32b' is not installed.${NC}"
  echo -e "${YELLOW}  Would you like to pull it now? This may take some time. (y/n)${NC}"
  read -r PULL_MODEL
  if [[ $PULL_MODEL =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Pulling model... This may take several minutes depending on your internet connection.${NC}"
    ollama pull huihui_ai/qwen2.5-abliterate:32b
  else
    echo -e "${YELLOW}Continuing without the recommended model. Please update config.js with your preferred model.${NC}"
  fi
else
  echo -e "${GREEN}✓ Model 'huihui_ai/qwen2.5-abliterate:32b' is installed${NC}"
fi

echo

# Start Ollama if not already running
echo -e "${BOLD}Starting Ollama server...${NC}"
if is_process_running "ollama serve"; then
  echo -e "${GREEN}✓ Ollama server is already running${NC}"
else
  echo -e "${BLUE}Starting Ollama server...${NC}"
  # Start Ollama in the background
  ollama serve &
  OLLAMA_PID=$!
  sleep 2
  if is_process_running "ollama serve"; then
    echo -e "${GREEN}✓ Ollama server started successfully${NC}"
  else
    echo -e "${RED}Failed to start Ollama server. Please start it manually with 'ollama serve'${NC}"
  fi
fi

# Start Kokoro if installed and not already running
if $KOKORO_INSTALLED; then
  echo -e "${BOLD}Starting Kokoro TTS server...${NC}"
  if is_process_running "run_kokoro.py"; then
    echo -e "${GREEN}✓ Kokoro TTS server is already running${NC}"
  else
    echo -e "${BLUE}Starting Kokoro TTS server...${NC}"
    
    # Check if we're using the new run_kokoro.py script
    if [[ "$KOKORO_PATH" == *"run_kokoro.py"* ]]; then
      # Activate the virtual environment and run the script in non-interactive mode
      source kokoro_env/bin/activate
      python "$KOKORO_PATH" --no-interactive &
      KOKORO_PID=$!
      deactivate
      sleep 2
      
      if is_process_running "run_kokoro.py"; then
        echo -e "${GREEN}✓ Kokoro TTS server started successfully${NC}"
      else
        echo -e "${RED}Failed to start Kokoro TTS server. Will fall back to browser TTS.${NC}"
        KOKORO_INSTALLED=false
      fi
    else
      # Start Kokoro in the background using the old method
      "$KOKORO_PATH" serve &
      KOKORO_PID=$!
      sleep 2
      if is_process_running "kokoro"; then
        echo -e "${GREEN}✓ Kokoro TTS server started successfully${NC}"
      else
        echo -e "${RED}Failed to start Kokoro TTS server. Will fall back to browser TTS.${NC}"
        KOKORO_INSTALLED=false
      fi
    fi
  fi
fi

echo

# Start Headroom server
echo -e "${BOLD}Starting Headroom web server...${NC}"
echo -e "${BLUE}Starting server on http://localhost:3023${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo

# Trap SIGINT to handle Ctrl+C gracefully
trap cleanup INT

# Function to clean up background processes
cleanup() {
  echo -e "\n${BOLD}Shutting down services...${NC}"
  
  # Kill background processes if they exist
  if [ -n "$OLLAMA_PID" ] && kill -0 $OLLAMA_PID 2>/dev/null; then
    echo -e "${BLUE}Stopping Ollama server...${NC}"
    kill $OLLAMA_PID
  fi
  
  if [ -n "$KOKORO_PID" ] && kill -0 $KOKORO_PID 2>/dev/null; then
    echo -e "${BLUE}Stopping Kokoro TTS server...${NC}"
    kill $KOKORO_PID
  fi
  
  echo -e "${GREEN}All services stopped. Goodbye!${NC}"
  exit 0
}

# Start the Headroom server
node server.js

# This point is only reached if the server exits normally
cleanup