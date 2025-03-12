#!/bin/bash

# Script to clean up Kokoro TTS files after migration to OpenVoice
# Run this after confirming OpenVoice integration is working properly

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║                   KOKORO CLEANUP TOOL                      ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo

echo -e "${YELLOW}This script will remove Kokoro TTS files that are no longer needed.${NC}"
echo -e "${YELLOW}Make sure you have successfully migrated to OpenVoice before proceeding.${NC}"
echo
echo -e "${YELLOW}The following files and directories will be removed:${NC}"
echo -e "- start_kokoro.sh (Kokoro setup script)"
echo -e "- kokoro/ directory (if it exists)"
echo -e "- kokoro_env/ directory (virtual environment for Kokoro)"
echo
read -p "Do you want to proceed with removal? (y/n): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    # Remove start_kokoro.sh script
    if [ -f "start_kokoro.sh" ]; then
        rm start_kokoro.sh
        echo -e "${GREEN}✓ Removed start_kokoro.sh${NC}"
    else
        echo -e "${YELLOW}⚠ start_kokoro.sh not found${NC}"
    fi
    
    # Remove kokoro directory if it exists
    if [ -d "kokoro" ]; then
        rm -rf kokoro
        echo -e "${GREEN}✓ Removed kokoro/ directory${NC}"
    else
        echo -e "${YELLOW}⚠ kokoro/ directory not found${NC}"
    fi
    
    # Remove kokoro_env directory if it exists
    if [ -d "kokoro_env" ]; then
        rm -rf kokoro_env
        echo -e "${GREEN}✓ Removed kokoro_env/ directory${NC}"
    else
        echo -e "${YELLOW}⚠ kokoro_env/ directory not found${NC}"
    fi
    
    echo
    echo -e "${GREEN}Cleanup completed successfully.${NC}"
    echo -e "${BLUE}Kokoro TTS has been replaced with OpenVoice TTS.${NC}"
else
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
fi