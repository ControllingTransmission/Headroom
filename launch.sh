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

# Function to find and kill process running on a specific port
kill_process_on_port() {
  local port=$1
  local pid=$(lsof -i :$port -t)
  
  if [ -n "$pid" ]; then
    echo -e "${BLUE}Stopping process on port $port (PID: $pid)...${NC}"
    kill $pid 2>/dev/null
    sleep 1
    
    # Check if it's still running and force kill if necessary
    if kill -0 $pid 2>/dev/null; then
      echo -e "${YELLOW}Process still running, force killing...${NC}"
      kill -9 $pid 2>/dev/null
    fi
    
    echo -e "${GREEN}✓ Process stopped${NC}"
  fi
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

# Check if OpenVoice is installed (optional)
OPENVOICE_INSTALLED=false
OPENVOICE_PATH=""

# ONLY use the custom OpenVoice TTS server - no fallbacks to system or browser TTS
if [ -f "./openvoice_server.py" ]; then
  OPENVOICE_INSTALLED=true
  OPENVOICE_PATH="python3 openvoice_server.py"
  OPENVOICE_TYPE="openvoice"
  echo -e "${GREEN}✓ Custom OpenVoice TTS server found - using fully local custom voices${NC}"
  
  # Check if we need to set up a Python virtual environment for OpenVoice
  if [ ! -d "./openvoice_env" ]; then
    echo -e "${YELLOW}Setting up Python virtual environment for OpenVoice...${NC}"
    python3 -m venv openvoice_env
  fi
else
  echo -e "${RED}ERROR: Custom OpenVoice TTS server not found!${NC}"
  echo -e "${RED}The application requires the custom OpenVoice TTS server.${NC}"
  echo -e "${RED}Cannot continue without custom OpenVoice TTS. Exiting.${NC}"
  exit 1
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

# Kill any existing processes that might conflict
echo -e "${BOLD}Checking for existing processes...${NC}"
# Check for web server on port 3023
if lsof -i :3023 -t >/dev/null 2>&1; then
  echo -e "${YELLOW}Found existing process on port 3023 (web server). Stopping it...${NC}"
  kill_process_on_port 3023
fi

# Check for OpenVoice server on port 8008
if lsof -i :8008 -t >/dev/null 2>&1; then
  echo -e "${YELLOW}Found existing process on port 8008 (OpenVoice server). Stopping it...${NC}"
  kill_process_on_port 8008
fi

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

# Start minimal OpenVoice if installed and not already running
if $OPENVOICE_INSTALLED; then
  echo -e "${BOLD}Starting OpenVoice TTS server...${NC}"
  if is_process_running "openvoice_server.py" || is_process_running "minimal_openvoice_server.py" || is_process_running "local_openvoice_server.py" || is_process_running "elevenlabs_openvoice_server.py"; then
    echo -e "${GREEN}✓ OpenVoice TTS server is already running${NC}"
  else
    echo -e "${BLUE}Starting OpenVoice TTS server...${NC}"
    
    # Check if we have a virtual environment for OpenVoice
    if [ -d "./openvoice_env" ] && [ -f "./openvoice_env/bin/activate" ]; then
      echo -e "${BLUE}Found OpenVoice virtual environment, attempting to use it...${NC}"
      
      # Try to use the virtual environment to start OpenVoice
      source ./openvoice_env/bin/activate
      
      # Install dependencies if needed
      if ! python -c "import numpy" &> /dev/null; then
        echo -e "${YELLOW}Installing missing numpy dependency...${NC}"
        pip install numpy
      fi
      
      if [ "$OPENVOICE_TYPE" = "openvoice" ]; then
        # Install OpenVoice dependencies
        if ! python -c "import numpy" &> /dev/null; then
          echo -e "${YELLOW}Installing required dependencies...${NC}"
          pip install numpy soundfile
        fi
        
        # Start custom OpenVoice TTS server in the background (fully offline)
        echo -e "${BLUE}Starting custom OpenVoice TTS server (100% offline, using custom voices)${NC}"
        python openvoice_server.py &
      else 
        echo -e "${RED}Error: Custom OpenVoice TTS server missing or invalid configuration.${NC}"
        echo -e "${RED}Cannot continue without custom OpenVoice TTS. Exiting.${NC}"
        exit 1
      fi
      OPENVOICE_PID=$!
      sleep 2
      
      if ps -p $OPENVOICE_PID > /dev/null; then
        if [ "$OPENVOICE_TYPE" = "system" ]; then
          echo -e "${GREEN}✓ System Voice TTS server started successfully${NC}"
          echo -e "${BLUE}This server uses your computer's built-in speech synthesis${NC}"
        else
          echo -e "${GREEN}✓ TTS server started successfully${NC}"
        fi
        deactivate
      else
        echo -e "${RED}Failed to start TTS server. Will fall back to browser TTS.${NC}"
        deactivate
        OPENVOICE_INSTALLED=false
      fi
    else
      echo -e "${YELLOW}⚠ OpenVoice requires proper installation to function.${NC}"
      echo -e "${YELLOW}  Please run: ./start_openvoice.sh${NC}"
      echo -e "${YELLOW}  Falling back to browser TTS.${NC}"
      OPENVOICE_INSTALLED=false
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
  
  # Stop Node.js web server (port 3023)
  echo -e "${BLUE}Stopping web server...${NC}"
  kill_process_on_port 3023
  
  # Stop OpenVoice TTS server (port 8008)
  echo -e "${BLUE}Stopping OpenVoice TTS server...${NC}"
  kill_process_on_port 8008
  
  # Kill Ollama if we started it
  if [ -n "$OLLAMA_PID" ] && kill -0 $OLLAMA_PID 2>/dev/null; then
    echo -e "${BLUE}Stopping Ollama server...${NC}"
    kill $OLLAMA_PID
    sleep 1
    if kill -0 $OLLAMA_PID 2>/dev/null; then
      kill -9 $OLLAMA_PID
    fi
    echo -e "${GREEN}✓ Ollama server stopped${NC}"
  fi
  
  echo -e "${GREEN}All services stopped. Goodbye!${NC}"
  exit 0
}

# Start the Headroom server in the background
node server.js &
WEB_SERVER_PID=$!

# Wait for Ctrl+C or server to exit
wait $WEB_SERVER_PID
echo -e "${YELLOW}Web server exited. Cleaning up remaining processes...${NC}"

# This point is reached if the server exits normally or on Ctrl+C
cleanup