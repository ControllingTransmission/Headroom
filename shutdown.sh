#!/bin/bash

# shutdown.sh - Script to shut down all Headroom services
# This script stops the web server, OpenVoice TTS server, and Ollama server if running

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║                  HEADROOM SHUTDOWN                         ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo

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
    kill $pid
    sleep 1
    
    # Check if it's still running and force kill if necessary
    if kill -0 $pid 2>/dev/null; then
      echo -e "${YELLOW}Process still running, force killing...${NC}"
      kill -9 $pid
    fi
    
    echo -e "${GREEN}✓ Process stopped${NC}"
  else
    echo -e "${YELLOW}No process found running on port $port${NC}"
  fi
}

echo -e "${BOLD}Shutting down Headroom services...${NC}"

# Stop web server (port 3023)
echo -e "Stopping web server..."
kill_process_on_port 3023

# Stop OpenVoice TTS server (port 8008)
echo -e "Stopping OpenVoice TTS server..."
kill_process_on_port 8008

# Stop Ollama server if requested
echo -e "${YELLOW}Do you want to stop the Ollama server too? (y/n)${NC}"
read -r stop_ollama

if [[ $stop_ollama =~ ^[Yy]$ ]]; then
  echo -e "Stopping Ollama server..."
  
  if is_process_running "ollama serve"; then
    pkill -f "ollama serve"
    echo -e "${GREEN}✓ Ollama server stopped${NC}"
  else
    echo -e "${YELLOW}Ollama server is not running${NC}"
  fi
else
  echo -e "Leaving Ollama server running."
fi

echo
echo -e "${GREEN}All requested Headroom services have been shut down.${NC}"