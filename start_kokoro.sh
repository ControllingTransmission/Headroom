#!/bin/bash

# Script to set up and launch the Kokoro TTS server
# This script requires Python 3.10-3.12 installed on your system

# Parse command line arguments
NON_INTERACTIVE=false
LANGUAGE_CHOICE="4"  # Default to no additional languages

while [ "$#" -gt 0 ]; do
  case "$1" in
    --non-interactive)
      NON_INTERACTIVE=true
      shift 1
      ;;
    --lang)
      LANGUAGE_CHOICE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--non-interactive] [--lang <1-4>]"
      echo "  --non-interactive  Run without interactive prompts"
      echo "  --lang <1-4>       Language support: 1=Japanese, 2=Chinese, 3=Both, 4=None (default)"
      exit 1
      ;;
  esac
done

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║                     KOKORO TTS LAUNCHER                    ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in your PATH.${NC}"
    echo -e "${YELLOW}Please install Python 3.10-3.12 before continuing.${NC}"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f1)
MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$MAJOR_VERSION" -ne 3 ] || [ "$MINOR_VERSION" -lt 10 ] || [ "$MINOR_VERSION" -gt 12 ]; then
    echo -e "${RED}Error: Kokoro requires Python 3.10-3.12, but you have Python $PYTHON_VERSION.${NC}"
    echo -e "${YELLOW}Please install a compatible Python version.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found Python $PYTHON_VERSION${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "kokoro_env" ]; then
    echo -e "${BLUE}Creating virtual environment for Kokoro...${NC}"
    python3 -m venv kokoro_env
    
    if [ ! -d "kokoro_env" ]; then
        echo -e "${RED}Failed to create virtual environment.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
source kokoro_env/bin/activate

# Check if kokoro is installed
if ! pip show kokoro &> /dev/null; then
    echo -e "${YELLOW}Kokoro not found in virtual environment.${NC}"
    echo -e "${BLUE}Installing Kokoro (this may take a while)...${NC}"
    
    pip install kokoro soundfile
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install Kokoro.${NC}"
        echo -e "${YELLOW}Please try installing manually:${NC}"
        echo -e "${YELLOW}  1. Activate the virtual environment: source kokoro_env/bin/activate${NC}"
        echo -e "${YELLOW}  2. Install Kokoro: pip install kokoro soundfile${NC}"
        deactivate
        exit 1
    fi
    
    echo -e "${GREEN}✓ Kokoro installed successfully${NC}"
else
    echo -e "${GREEN}✓ Kokoro is already installed${NC}"
fi

# Ask about additional language support if in interactive mode
if [ "$NON_INTERACTIVE" = false ]; then
    echo
    echo -e "${BOLD}Do you want to install additional language support?${NC}"
    echo -e "${YELLOW}1. Japanese (misaki[ja])${NC}"
    echo -e "${YELLOW}2. Chinese (misaki[zh])${NC}"
    echo -e "${YELLOW}3. Both Japanese and Chinese${NC}"
    echo -e "${YELLOW}4. None (only English and basic languages)${NC}"
    read -p "Enter your choice (1-4): " LANGUAGE_CHOICE
fi

case $LANGUAGE_CHOICE in
    1)
        echo -e "${BLUE}Installing Japanese language support...${NC}"
        pip install "misaki[ja]"
        ;;
    2)
        echo -e "${BLUE}Installing Chinese language support...${NC}"
        pip install "misaki[zh]"
        ;;
    3)
        echo -e "${BLUE}Installing Japanese and Chinese language support...${NC}"
        pip install "misaki[ja]" "misaki[zh]"
        ;;
    *)
        echo -e "${BLUE}Skipping additional language support.${NC}"
        ;;
esac

echo
echo -e "${BOLD}Starting Kokoro TTS server...${NC}"
echo -e "${YELLOW}The server will run on http://localhost:8008 by default.${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server.${NC}"
echo

# Check if run_kokoro.py exists
if [ -f "run_kokoro.py" ]; then
    # Make sure the script is executable
    chmod +x run_kokoro.py
    
    # Start the Kokoro server using the new script
    # Pass the --no-interactive flag if we're in non-interactive mode
    if [ "$NON_INTERACTIVE" = true ]; then
        python run_kokoro.py --no-interactive
    else
        python run_kokoro.py
    fi
else
    echo -e "${RED}Error: run_kokoro.py not found.${NC}"
    echo -e "${YELLOW}Please make sure the run_kokoro.py script exists in the current directory.${NC}"
    deactivate
    exit 1
fi

# Deactivate virtual environment when done
deactivate