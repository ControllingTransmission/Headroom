#\!/bin/bash

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 LOCAL TTS LAUNCHER                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Check for Python
if command -v python3 &>/dev/null; then
    echo -e "${GREEN}✓ Found Python 3${NC}"
else
    echo -e "${RED}✗ Python 3 is required but was not found${NC}"
    exit 1
fi

# Check for virtual environment
if [ -d "venv" ]; then
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
    echo -e "${BLUE}Activating virtual environment...${NC}"
    source venv/bin/activate
else
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
fi

# Install pyttsx3 if needed
if python3 -c "import pyttsx3" 2>/dev/null; then
    echo -e "${GREEN}✓ pyttsx3 is already installed${NC}"
else
    echo -e "${YELLOW}Installing pyttsx3...${NC}"
    pip install pyttsx3
fi

echo
echo -e "${BLUE}Starting Local TTS server...${NC}"
echo -e "${BLUE}The server will run on http://localhost:8008${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server.${NC}"

# Run the server
python3 local_tts_server.py
