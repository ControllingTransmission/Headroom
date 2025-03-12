#!/bin/bash

# Script to install OpenVoice dependencies correctly
# This script addresses specific dependency issues

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "╔════════════════════════════════════════════════════════════╗"
echo -e "║           OPENVOICE DEPENDENCY INSTALLER                   ║"
echo -e "╚════════════════════════════════════════════════════════════╝"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in your PATH.${NC}"
    echo -e "Please install Python 3.9+ before continuing."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f1)
MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$MAJOR_VERSION" -ne 3 ]; then
    echo -e "${RED}Error: OpenVoice requires Python 3, but you have Python $PYTHON_VERSION.${NC}"
    echo -e "Please install a compatible Python version."
    exit 1
fi

echo -e "${GREEN}✓ Found Python $PYTHON_VERSION${NC}"

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create virtual environment if it doesn't exist
if [ ! -d "$SCRIPT_DIR/openvoice_env" ]; then
    echo -e "Creating virtual environment for OpenVoice..."
    python3 -m venv $SCRIPT_DIR/openvoice_env
    
    if [ ! -d "$SCRIPT_DIR/openvoice_env" ]; then
        echo -e "${RED}Failed to create virtual environment.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "Activating virtual environment..."
source $SCRIPT_DIR/openvoice_env/bin/activate

# Install base dependencies
echo -e "Installing base dependencies..."
pip install --upgrade pip
pip install numpy==1.24.3
pip install torch torchaudio

# Install OpenVoice dependencies
echo -e "${BLUE}Installing OpenVoice dependencies...${NC}"
pip install unidecode
pip install librosa==0.9.1
pip install soundfile
pip install pydub==0.25.1
pip install nltk
pip install g2p_en
pip install inflect
pip install resemblyzer
pip install wavmark==0.0.3
pip install loguru
pip install scipy
pip install requests

# Clone OpenVoice repository if it doesn't exist
OPENVOICE_DIR="$SCRIPT_DIR/openvoice_env/OpenVoice"
if [ ! -d "$OPENVOICE_DIR" ]; then
    echo -e "Cloning OpenVoice repository..."
    cd $SCRIPT_DIR/openvoice_env
    git clone https://github.com/myshell-ai/OpenVoice.git
    cd -
    echo -e "${GREEN}✓ OpenVoice repository cloned${NC}"
else
    echo -e "${GREEN}✓ OpenVoice repository already exists${NC}"
fi

# Create or update the API wrapper file for easier imports
echo -e "Creating API wrapper..."
WRAPPER_DIR="$SCRIPT_DIR/openvoice_env/OpenVoice"
WRAPPER_FILE="$WRAPPER_DIR/api.py"

cat > "$WRAPPER_FILE" << 'EOL'
# API wrapper for OpenVoice
import os
import sys
import torch

# Add the current directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Import from OpenVoice modules
from openvoice.utils.prompt_design import load_voice_conversion_model
from openvoice.utils.generation_utils import create_tts_fn
from openvoice.base_models.yourtts.inference import ToneColorConverter

__all__ = ['load_voice_conversion_model', 'create_tts_fn', 'ToneColorConverter']
EOL

echo -e "${GREEN}✓ API wrapper created${NC}"

# Download models
echo -e "Setting up models directory..."
MODELS_DIR="$SCRIPT_DIR/openvoice_models"
mkdir -p $MODELS_DIR

# Download converter model if it doesn't exist
CONVERTER_PATH="$MODELS_DIR/converter.pth"
if [ ! -f "$CONVERTER_PATH" ]; then
    echo -e "Downloading voice conversion model..."
    python3 -c "
import os
import requests

models_dir = '$MODELS_DIR'
converter_path = '$CONVERTER_PATH'
url = 'https://huggingface.co/myshell-ai/OpenVoice/resolve/main/converter.pth'

print(f'Downloading from: {url}')
with requests.get(url, stream=True) as r:
    r.raise_for_status()
    with open(converter_path, 'wb') as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)

print(f'Downloaded converter model: {os.path.getsize(converter_path)} bytes')
"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to download converter model.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Converter model downloaded${NC}"
else
    echo -e "${GREEN}✓ Converter model already exists${NC}"
fi

echo -e "\n${GREEN}${BOLD}OpenVoice dependencies installed successfully!${NC}"
echo -e "You can now run: ${BLUE}./start_openvoice.sh${NC}"

# Deactivate virtual environment
deactivate