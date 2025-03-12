#!/bin/bash

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║                HEADROOM RESTART UTILITY                    ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Check for running processes
echo -e "${YELLOW}Stopping any running processes...${NC}"

# Kill any running Python servers
echo -e "Stopping any running TTS servers..."
pkill -f "openvoice_server.py" || true
pkill -f "system_tts_server.py" || true
pkill -f "local_openvoice_server.py" || true

# Kill any running Node.js servers
echo -e "Stopping any running web servers..."
pkill -f "node server.js" || true

# Kill any launch.sh processes
echo -e "Stopping any launch script processes..."
pkill -f "launch.sh" || true

echo -e "${GREEN}✓ All previous processes stopped${NC}"

# Start the TTS server
echo -e "${BLUE}Starting OpenVoice TTS server...${NC}"
cd "$(dirname "$0")"
python3 openvoice_server.py &
TTS_PID=$!

# Give it a moment to start
sleep 1

# Check if it's running
if ps -p $TTS_PID > /dev/null; then
    echo -e "${GREEN}✓ TTS server started (PID: $TTS_PID)${NC}"
else
    echo -e "${RED}Failed to start TTS server${NC}"
    
    # Try to start with virtual environment
    echo -e "Trying with virtual environment..."
    if [ -d "venv" ]; then
        source venv/bin/activate
        python openvoice_server.py &
        TTS_PID=$!
        deactivate
        
        # Check again
        sleep 1
        if ps -p $TTS_PID > /dev/null; then
            echo -e "${GREEN}✓ TTS server started with venv (PID: $TTS_PID)${NC}"
        else
            echo -e "${RED}Failed to start TTS server with venv${NC}"
            exit 1
        fi
    else
        echo -e "${RED}No virtual environment found. Creating one...${NC}"
        python3 -m venv venv
        source venv/bin/activate
        pip install numpy
        python openvoice_server.py &
        TTS_PID=$!
        deactivate
        
        # Check again
        sleep 1
        if ps -p $TTS_PID > /dev/null; then
            echo -e "${GREEN}✓ TTS server started with new venv (PID: $TTS_PID)${NC}"
        else
            echo -e "${RED}Failed to start TTS server. Please check logs.${NC}"
            exit 1
        fi
    fi
fi

# Start main application
echo -e "${BLUE}Starting main application...${NC}"
./launch.sh

# The script will likely not reach here since launch.sh will block
echo -e "${GREEN}Done!${NC}"