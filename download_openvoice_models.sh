#!/bin/bash

# Script to download OpenVoice models

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║         OPENVOICE MODEL DOWNLOADER                         ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required but not found.${NC}"
    exit 1
fi

# Install dependencies if needed
echo -e "${YELLOW}Installing required dependencies...${NC}"
# First activate the virtual environment
if [ -d "openvoice_env" ]; then
    echo -e "${BLUE}Activating OpenVoice virtual environment...${NC}"
    source openvoice_env/bin/activate
    pip install requests tqdm
else
    echo -e "${RED}Error: OpenVoice virtual environment not found.${NC}"
    echo -e "${YELLOW}Attempting to install dependencies in the current environment...${NC}"
    python3 -m pip install --user requests tqdm
fi

# Prepare directory structure
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MODEL_DIR="${SCRIPT_DIR}/OpenVoice/resources/pretrained"

# Create the directories if they don't exist
mkdir -p "${MODEL_DIR}/base_speakers/EN"
mkdir -p "${MODEL_DIR}/converter"

# Download base speaker model
echo -e "${YELLOW}Downloading base speaker model files...${NC}"

# Download config
if [ ! -f "${MODEL_DIR}/base_speakers/EN/config.json" ]; then
    echo -e "Downloading base model config..."
    python3 -c "
import requests
from tqdm import tqdm

url = 'https://github.com/myshell-ai/OpenVoice/raw/main/resources/pretrained/base_speakers/EN/config.json'
output_path = '${MODEL_DIR}/base_speakers/EN/config.json'

print(f'Downloading from: {url}')
response = requests.get(url, stream=True)
response.raise_for_status()

total_size = int(response.headers.get('content-length', 0))
block_size = 1024
progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)

with open(output_path, 'wb') as f:
    for data in response.iter_content(block_size):
        progress_bar.update(len(data))
        f.write(data)

progress_bar.close()
print(f'Downloaded to: {output_path}')
"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to download base model config.${NC}"
    else
        echo -e "${GREEN}✓ Base model config downloaded.${NC}"
    fi
else
    echo -e "${GREEN}✓ Base model config already exists.${NC}"
fi

# Download model weights
if [ ! -f "${MODEL_DIR}/base_speakers/EN/best_model.pth" ]; then
    echo -e "Downloading base model weights (large file, this may take a while)..."
    python3 -c "
import requests
from tqdm import tqdm

url = 'https://huggingface.co/myshell-ai/OpenVoice/resolve/main/resources/pretrained/base_speakers/EN/best_model.pth'
output_path = '${MODEL_DIR}/base_speakers/EN/best_model.pth'

print(f'Downloading from: {url}')
response = requests.get(url, stream=True)
response.raise_for_status()

total_size = int(response.headers.get('content-length', 0))
block_size = 1024
progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)

with open(output_path, 'wb') as f:
    for data in response.iter_content(block_size):
        progress_bar.update(len(data))
        f.write(data)

progress_bar.close()
print(f'Downloaded to: {output_path}')
"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to download base model weights.${NC}"
    else
        echo -e "${GREEN}✓ Base model weights downloaded.${NC}"
    fi
else
    echo -e "${GREEN}✓ Base model weights already exist.${NC}"
fi

# Download converter model
echo -e "${YELLOW}Downloading converter model files...${NC}"

# Download config
if [ ! -f "${MODEL_DIR}/converter/config.json" ]; then
    echo -e "Downloading converter config..."
    python3 -c "
import requests
from tqdm import tqdm

url = 'https://github.com/myshell-ai/OpenVoice/raw/main/resources/pretrained/converter/config.json'
output_path = '${MODEL_DIR}/converter/config.json'

print(f'Downloading from: {url}')
response = requests.get(url, stream=True)
response.raise_for_status()

total_size = int(response.headers.get('content-length', 0))
block_size = 1024
progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)

with open(output_path, 'wb') as f:
    for data in response.iter_content(block_size):
        progress_bar.update(len(data))
        f.write(data)

progress_bar.close()
print(f'Downloaded to: {output_path}')
"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to download converter config.${NC}"
    else
        echo -e "${GREEN}✓ Converter config downloaded.${NC}"
    fi
else
    echo -e "${GREEN}✓ Converter config already exists.${NC}"
fi

# Download model weights
if [ ! -f "${MODEL_DIR}/converter/best_model.pth" ]; then
    echo -e "Downloading converter weights (large file, this may take a while)..."
    python3 -c "
import requests
from tqdm import tqdm

url = 'https://huggingface.co/myshell-ai/OpenVoice/resolve/main/resources/pretrained/converter/best_model.pth'
output_path = '${MODEL_DIR}/converter/best_model.pth'

print(f'Downloading from: {url}')
response = requests.get(url, stream=True)
response.raise_for_status()

total_size = int(response.headers.get('content-length', 0))
block_size = 1024
progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)

with open(output_path, 'wb') as f:
    for data in response.iter_content(block_size):
        progress_bar.update(len(data))
        f.write(data)

progress_bar.close()
print(f'Downloaded to: {output_path}')
"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to download converter weights.${NC}"
    else
        echo -e "${GREEN}✓ Converter weights downloaded.${NC}"
    fi
else
    echo -e "${GREEN}✓ Converter weights already exist.${NC}"
fi

echo
echo -e "${GREEN}${BOLD}Model download complete!${NC}"
echo -e "You can now run the OpenVoice TTS server with: ./restart.sh"