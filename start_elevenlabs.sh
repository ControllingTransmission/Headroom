#!/bin/bash

# Script to set up and launch the ElevenLabs OpenVoice TTS server
# This is an enhanced version with more voice options

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "╔════════════════════════════════════════════════════════════╗"
echo -e "║           ELEVENLABS OPENVOICE TTS LAUNCHER                ║"
echo -e "╚════════════════════════════════════════════════════════════╝"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in your PATH.${NC}"
    echo -e "Please install Python 3.8+ before continuing."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f1)
MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$MAJOR_VERSION" -ne 3 ] || [ "$MINOR_VERSION" -lt 8 ]; then
    echo -e "${RED}Error: This script requires Python 3.8 or newer, but you have Python $PYTHON_VERSION.${NC}"
    echo -e "Please install a compatible Python version."
    exit 1
fi

echo -e "${GREEN}✓ Found Python $PYTHON_VERSION${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "openvoice_env" ]; then
    echo -e "Creating virtual environment..."
    python3 -m venv openvoice_env
    
    if [ ! -d "openvoice_env" ]; then
        echo -e "${RED}Failed to create virtual environment.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate the virtual environment
echo -e "Activating virtual environment..."
source openvoice_env/bin/activate

# Install dependencies
echo -e "Installing dependencies..."
pip install numpy requests gtts
echo -e "${GREEN}✓ Packages installed${NC}"

# Check if an API key is set
ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-}"
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo -e "${YELLOW}⚠ No ElevenLabs API key found in environment.${NC}"
    echo -e "${YELLOW}The server will use gTTS as a fallback. For better quality and more voices:${NC}"
    echo -e "${YELLOW}1. Get an API key from https://elevenlabs.io (they offer a free tier)${NC}"
    echo -e "${YELLOW}2. Set it as environment variable before running this script:${NC}"
    echo -e "${YELLOW}   export ELEVENLABS_API_KEY=your_api_key_here${NC}"
    echo
    read -p "Do you want to continue without an ElevenLabs API key? (y/n): " continue_without_key
    
    if [[ $continue_without_key != "y" && $continue_without_key != "Y" ]]; then
        echo -e "${YELLOW}Exiting. Please set up an API key and try again.${NC}"
        deactivate
        exit 0
    fi
else
    echo -e "${GREEN}✓ ElevenLabs API key found${NC}"
fi

# Start the OpenVoice server
echo -e "${BLUE}Starting ElevenLabs OpenVoice TTS server...${NC}"
echo -e "This server provides high-quality voices with ElevenLabs API or gTTS as fallback."
echo -e "The server will run on http://localhost:8008 by default."
echo -e "Press Ctrl+C to stop the server."
echo

# Run the ElevenLabs OpenVoice server
python3 elevenlabs_openvoice_server.py

# Deactivate virtual environment when done
deactivate