#!/bin/bash

# Script to clear the TTS cache

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}Clearing TTS cache...${NC}"

# Check if cache directory exists
if [ -d "tts_cache" ]; then
    echo -e "${YELLOW}Removing cached TTS files...${NC}"
    rm -rf tts_cache
    mkdir -p tts_cache
    echo -e "${GREEN}✓ TTS cache cleared${NC}"
else
    echo -e "${YELLOW}No TTS cache directory found. Creating one...${NC}"
    mkdir -p tts_cache
    echo -e "${GREEN}✓ TTS cache directory created${NC}"
fi

echo -e "${GREEN}Done!${NC}"