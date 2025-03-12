#!/bin/bash

# Script to clear the environment and restart the minimal OpenVoice server

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║       CLEAR AND RESTART MINIMAL OPENVOICE SERVER          ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# First shut down any running services
echo -e "${YELLOW}Shutting down any running services...${NC}"
pkill -f "minimal_openvoice_server.py" || true
pkill -f "openvoice_server.py" || true

# Remove the virtual environment
echo -e "${YELLOW}Removing existing virtual environment...${NC}"
rm -rf openvoice_env

# Remove any models
echo -e "${YELLOW}Removing existing models...${NC}"
rm -rf openvoice_models

# Create a new virtual environment
echo -e "${YELLOW}Creating new virtual environment...${NC}"
python3 -m venv openvoice_env

# Activate the virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source openvoice_env/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install numpy gtts

# Start the OpenVoice server
echo -e "${GREEN}Starting OpenVoice TTS server with Google Text-to-Speech...${NC}"
echo -e "This server uses Google's TTS API (gTTS) to generate actual speech."
python3 minimal_openvoice_server.py