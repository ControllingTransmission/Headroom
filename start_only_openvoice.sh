#\!/bin/bash

# A minimal script to just start the OpenVoice server

# ANSI color codes for formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              STARTING OPENVOICE SERVER                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Check if the OpenVoice environment exists
if [ \! -d "openvoice_env" ]; then
    echo -e "${RED}OpenVoice environment not found\!${NC}"
    echo -e "${YELLOW}Please run install_openvoice_deps.sh first${NC}"
    exit 1
fi

# Activate the environment
echo -e "${BLUE}Activating OpenVoice environment...${NC}"
source openvoice_env/bin/activate

# Check if the server script exists
if [ \! -f "openvoice_server.py" ]; then
    echo -e "${RED}OpenVoice server script not found\!${NC}"
    exit 1
fi

# Start the server
echo -e "${GREEN}Starting OpenVoice TTS server...${NC}"
echo -e "${YELLOW}The server will run at http://localhost:8008${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo

# Run the OpenVoice server in the foreground
python openvoice_server.py

# Deactivate the environment when the server stops
deactivate
