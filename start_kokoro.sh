#\!/bin/bash

# Script to set up and launch the Kokoro TTS server
# This script requires Python 3.10-3.12 installed on your system

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "╔════════════════════════════════════════════════════════════╗"
echo -e "║                     KOKORO TTS LAUNCHER                    ║"
echo -e "╚════════════════════════════════════════════════════════════╝"
echo

# Check if Python is installed
if \! command -v python3 &> /dev/null; then
    echo -e "Error: Python 3 is not installed or not in your PATH."
    echo -e "Please install Python 3.10-3.12 before continuing."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f1)
MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$MAJOR_VERSION" -ne 3 ] || [ "$MINOR_VERSION" -lt 10 ]; then
    echo -e "Error: Kokoro requires Python 3.10 or newer, but you have Python $PYTHON_VERSION."
    echo -e "Please install a compatible Python version."
    exit 1
fi

if [ "$MINOR_VERSION" -gt 12 ]; then
    echo -e "Warning: Kokoro officially supports Python 3.10-3.12. You have Python $PYTHON_VERSION."
    echo -e "We'll attempt to install anyway, but you may encounter compatibility issues."
    echo -e "If installation fails, please install Python 3.10-3.12 and try again."
    echo
    echo -e "Press Enter to continue or Ctrl+C to abort..."
    read
fi

echo -e "✓ Found Python $PYTHON_VERSION"

# Create virtual environment if it doesn't exist
if [ \! -d "kokoro_env" ]; then
    echo -e "Creating virtual environment for Kokoro..."
    python3 -m venv kokoro_env
    
    if [ \! -d "kokoro_env" ]; then
        echo -e "Failed to create virtual environment."
        exit 1
    fi
    
    echo -e "✓ Virtual environment created"
else
    echo -e "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo -e "Activating virtual environment..."
source kokoro_env/bin/activate

# Check if kokoro is installed
if python -c "import kokoro" &> /dev/null; then
    echo -e "✓ Kokoro is already installed"
else
    echo -e "Kokoro not found in virtual environment."
    echo -e "Installing Kokoro (this may take a while)..."
    
    # If using Python 3.13, try installing with a slightly modified approach
    if [ "$MINOR_VERSION" -eq 13 ]; then
        echo -e "Using Python 3.13 - installing with compatibility mode..."
        
        # Try with --ignore-requires-python flag
        pip install --ignore-requires-python kokoro soundfile ||         # If that fails, try with pip directly
        pip install kokoro soundfile
    else
        # Standard installation for Python 3.10-3.12
        pip install kokoro soundfile
    fi
    
    # Verify installation
    if ! python -c "import kokoro" &> /dev/null; then
        echo -e "${RED}Failed to install Kokoro.${NC}"
        echo -e "This might be due to Python version incompatibility."
        echo -e "Please try installing manually with Python 3.10-3.12:"
        echo -e "  1. Install Python 3.10-3.12"
        echo -e "  2. Create a virtual environment: python3.10 -m venv kokoro_env"
        echo -e "  3. Activate the environment: source kokoro_env/bin/activate"
        echo -e "  4. Install Kokoro: pip install kokoro soundfile"
        deactivate
        exit 1
    fi
    
    echo -e "✓ Kokoro installed successfully"
fi

# Ask about additional language support
echo
echo -e "Do you want to install additional language support?"
echo -e "1. Japanese (misaki[ja])"
echo -e "2. Chinese (misaki[zh])"
echo -e "3. Both Japanese and Chinese"
echo -e "4. None (only English and basic languages)"
read -p "Enter your choice (1-4): " language_choice

case "$language_choice" in
    1)
        echo -e "Installing Japanese language support..."
        pip install "misaki[ja]"
        ;;
    2)
        echo -e "Installing Chinese language support..."
        pip install "misaki[zh]"
        ;;
    3)
        echo -e "Installing Japanese and Chinese language support..."
        pip install "misaki[ja]" "misaki[zh]"
        ;;
    *)
        echo -e "Skipping additional language support."
        ;;
esac

echo
echo -e "Starting Kokoro TTS server..."
echo -e "The server will run on http://localhost:8008 by default."
echo -e "Press Ctrl+C to stop the server."
echo

# Start the Kokoro server - install all dependencies explicitly to avoid issues
pip install --upgrade pip
pip install numpy==1.26.4
pip install soundfile
pip install loguru
pip install huggingface-hub
pip install "misaki[en]>=0.8.4"
pip install scipy
pip install torch
pip install transformers
pip install "kokoro[all]"

# Try to run the server, handling potential errors
if python -c "import kokoro" &> /dev/null; then
  echo -e "✓ Kokoro is properly installed, starting server..."
  python -m kokoro.serve
else
  echo -e "${RED}Error: Kokoro module could not be loaded.${NC}"
  echo -e "This is likely due to Python version compatibility issues."
  echo -e "The official installation recommendation is to use Python 3.10-3.12."
  echo -e "Current Python version: $PYTHON_VERSION"
  
  echo -e "\nAlternative: you can try using the Ollama TTS server instead."
  echo -e "It's included with Ollama and is compatible with more Python versions."
  echo -e "To use it, set the TTS_SERVER=ollama in your environment variables."
fi

# Deactivate virtual environment when done
deactivate
