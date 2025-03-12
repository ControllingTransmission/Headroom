#!/usr/bin/env python3
"""
Comprehensive test script for OpenVoice TTS.
This script tests each step of the OpenVoice setup and functionality.
"""

import os
import sys
import time
import json
import logging
import tempfile
import subprocess
from pathlib import Path
import http.client
import platform

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openvoice-test")

# Constants
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "openvoice_models")
OPENVOICE_ENV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "openvoice_env")
OPENVOICE_PATH = os.path.join(OPENVOICE_ENV, "OpenVoice")
SERVER_URL = "localhost"
SERVER_PORT = 8008

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    """Print a formatted header."""
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'=' * 80}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text.center(80)}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'=' * 80}{Colors.END}\n")

def print_success(text):
    """Print a success message."""
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_warning(text):
    """Print a warning message."""
    print(f"{Colors.YELLOW}⚠️ {text}{Colors.END}")

def print_error(text):
    """Print an error message."""
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text):
    """Print an info message."""
    print(f"{Colors.BLUE}ℹ️ {text}{Colors.END}")

def check_system_info():
    """Check and print system information."""
    print_header("System Information")
    
    # Get Python version
    python_version = sys.version.replace('\n', '')
    print_info(f"Python version: {python_version}")
    
    # Get OS information
    os_name = platform.system()
    if os_name == "Darwin":
        os_version = f"macOS {platform.mac_ver()[0]}"
    else:
        os_version = platform.version()
    
    print_info(f"Operating System: {os_name} {os_version}")
    
    # Check available memory
    try:
        import psutil
        memory = psutil.virtual_memory()
        print_info(f"Available memory: {memory.available / (1024 ** 3):.2f} GB of {memory.total / (1024 ** 3):.2f} GB")
    except ImportError:
        print_warning("Could not check memory (psutil not installed)")
    
    # Check for GPU
    try:
        import torch
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            device_name = torch.cuda.get_device_name(0) if device_count > 0 else "None"
            print_success(f"CUDA available: {device_count} devices ({device_name})")
        else:
            print_warning("CUDA not available, will use CPU (slower)")
    except ImportError:
        print_warning("Could not check for CUDA (PyTorch not installed)")
    
    print("")

def check_environment():
    """Check the Python environment and dependencies."""
    print_header("Environment Check")
    
    # Check if virtual environment exists
    if os.path.isdir(OPENVOICE_ENV):
        print_success(f"OpenVoice environment exists at: {OPENVOICE_ENV}")
        
        # Check if OpenVoice is cloned
        if os.path.isdir(OPENVOICE_PATH):
            print_success(f"OpenVoice repository exists at: {OPENVOICE_PATH}")
        else:
            print_error(f"OpenVoice repository not found at: {OPENVOICE_PATH}")
            print_info("Run './start_openvoice.sh' to set up the environment properly")
            return False
    else:
        print_error(f"OpenVoice environment not found at: {OPENVOICE_ENV}")
        print_info("Run './start_openvoice.sh' to set up the environment")
        return False
    
    # Check key dependencies
    env_python = os.path.join(OPENVOICE_ENV, "bin", "python")
    dependencies = [
        "torch", 
        "torchaudio", 
        "numpy", 
        "scipy", 
        "loguru", 
        "requests",
        "librosa",
        "g2p_en"
    ]
    
    all_deps_installed = True
    for dep in dependencies:
        try:
            # Check if dependency is installed in the environment
            result = subprocess.run(
                [env_python, "-c", f"import {dep}; print({dep}.__version__)"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                version = result.stdout.strip()
                print_success(f"{dep} installed (version: {version})")
            else:
                print_error(f"{dep} not installed or cannot be imported")
                all_deps_installed = False
                
        except Exception as e:
            print_error(f"Error checking {dep}: {e}")
            all_deps_installed = False
    
    # Check for models
    if not os.path.isdir(MODELS_DIR):
        print_error(f"Models directory not found: {MODELS_DIR}")
        os.makedirs(MODELS_DIR, exist_ok=True)
        print_info(f"Created models directory: {MODELS_DIR}")
    else:
        print_success(f"Models directory exists: {MODELS_DIR}")
    
    model_files = [
        "converter.pth"
    ]
    
    models_exist = True
    for model in model_files:
        model_path = os.path.join(MODELS_DIR, model)
        if os.path.isfile(model_path):
            size_mb = os.path.getsize(model_path) / (1024 * 1024)
            print_success(f"Model file {model} exists ({size_mb:.2f} MB)")
        else:
            print_error(f"Model file {model} not found")
            models_exist = False
    
    if not all_deps_installed or not models_exist:
        print_warning("Not all dependencies or models are available.")
        print_info("Run './start_openvoice.sh' to set up the environment correctly")
        return False
        
    return True

def test_direct_import():
    """Test importing OpenVoice directly in Python."""
    print_header("Direct Import Test")
    
    env_python = os.path.join(OPENVOICE_ENV, "bin", "python")
    
    # Try multiple import approaches
    import_variants = [
        "from api import create_tts_fn, load_voice_conversion_model",
        "from openvoice.api import create_tts_fn, load_voice_conversion_model",
        "import sys; sys.path.append('./openvoice_env/OpenVoice'); from api import create_tts_fn, load_voice_conversion_model"
    ]
    
    import_success = False
    for import_stmt in import_variants:
        try:
            cmd = [
                env_python, 
                "-c", 
                f"import sys; sys.path.insert(0, '{OPENVOICE_PATH}'); {import_stmt}; print('Import successful')"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0 and "Import successful" in result.stdout:
                print_success(f"Successfully imported with: {import_stmt}")
                import_success = True
                break
            else:
                print_error(f"Failed to import with: {import_stmt}")
                if result.stderr:
                    print(f"   Error: {result.stderr.strip()}")
        except Exception as e:
            print_error(f"Error testing import: {e}")
    
    if not import_success:
        print_error("Could not import OpenVoice with any method")
        return False
    
    return True

def test_openvoice_core():
    """Test OpenVoice core functionality."""
    print_header("OpenVoice Core Functionality Test")
    
    env_python = os.path.join(OPENVOICE_ENV, "bin", "python")
    
    # Create a test script
    test_script = """
import os
import sys
import torch

# Add the OpenVoice directory to the path
openvoice_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                             "openvoice_env", "OpenVoice")
sys.path.insert(0, openvoice_path)

# First, try to import the API
import_success = False
try:
    from api import create_tts_fn, load_voice_conversion_model
    import_success = True
    print("Import successful from direct path")
except ImportError:
    try:
        from openvoice.api import create_tts_fn, load_voice_conversion_model
        import_success = True
        print("Import successful from package")
    except ImportError as e:
        print(f"Import failed: {e}")

if not import_success:
    sys.exit(1)

# Models directory
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "openvoice_models")

# Check for converter model
converter_checkpoint = os.path.join(MODELS_DIR, "converter.pth")
if not os.path.exists(converter_checkpoint):
    print(f"Converter model not found at: {converter_checkpoint}")
    sys.exit(1)

print(f"Using converter model: {converter_checkpoint}")

# Device selection
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load voice conversion model
try:
    voice_converter = load_voice_conversion_model(converter_checkpoint, device)
    print("Voice conversion model loaded successfully")
except Exception as e:
    print(f"Failed to load voice conversion model: {e}")
    import traceback
    print(traceback.format_exc())
    sys.exit(1)

# Create TTS function
try:
    tts_fn = create_tts_fn(device)
    print("TTS function created successfully")
except Exception as e:
    print(f"Failed to create TTS function: {e}")
    import traceback
    print(traceback.format_exc())
    sys.exit(1)

# Try to generate a simple test
import tempfile
with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
    temp_path = tmp.name

print(f"Generating test audio to {temp_path}")

try:
    # Generate audio
    tts_fn(
        text="This is a test of OpenVoice.",
        save_path=temp_path,
        voice_conversion_model=voice_converter,
        base_speaker_referenced="female",
        prompt="Please speak in a neutral tone."
    )
    
    # Check if file exists and has content
    if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
        print(f"Test successful! Audio generated: {os.path.getsize(temp_path)} bytes")
        # Clean up
        os.unlink(temp_path)
        sys.exit(0)
    else:
        print("Audio file is empty or doesn't exist")
        sys.exit(1)
except Exception as e:
    print(f"Error generating audio: {e}")
    import traceback
    print(traceback.format_exc())
    sys.exit(1)
"""
    
    # Write the test script to a temporary file
    with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as f:
        f.write(test_script.encode())
        test_script_path = f.name
    
    try:
        # Run the test script
        print_info("Running OpenVoice core test...")
        result = subprocess.run([env_python, test_script_path], capture_output=True, text=True)
        
        # Print the output
        if result.stdout:
            for line in result.stdout.strip().split('\n'):
                if "success" in line.lower() or "successful" in line.lower():
                    print_success(line)
                elif "error" in line.lower() or "failed" in line.lower() or "exception" in line.lower():
                    print_error(line)
                else:
                    print_info(line)
        
        # Check for errors
        if result.stderr:
            print_error("Errors from test script:")
            print(result.stderr)
        
        # Check return code
        if result.returncode == 0:
            print_success("OpenVoice core functionality test passed!")
            return True
        else:
            print_error("OpenVoice core functionality test failed!")
            return False
            
    finally:
        # Clean up
        os.unlink(test_script_path)

def test_server():
    """Test if the OpenVoice server is running and responding."""
    print_header("Server Test")
    
    # Test server health endpoint
    try:
        conn = http.client.HTTPConnection(SERVER_URL, SERVER_PORT)
        conn.request("GET", "/health")
        response = conn.getresponse()
        
        if response.status == 200:
            data = json.loads(response.read().decode())
            print_success(f"Server is running and healthy: {data}")
            
            # Test voices endpoint
            conn = http.client.HTTPConnection(SERVER_URL, SERVER_PORT)
            conn.request("GET", "/voices")
            response = conn.getresponse()
            
            if response.status == 200:
                voices_data = json.loads(response.read().decode())
                if "voices" in voices_data and len(voices_data["voices"]) > 0:
                    print_success(f"Server returned {len(voices_data['voices'])} voices")
                    for voice in voices_data["voices"]:
                        print_info(f"  - {voice['name']} (ID: {voice['id']})")
                else:
                    print_warning("Server returned no voices")
            else:
                print_error(f"Failed to get voices from server: {response.status} {response.reason}")
            
            # Test basic TTS
            try:
                test_text = "This is a test of the OpenVoice text to speech system."
                test_speaker = "female_1"
                
                # Create a temporary file to store the audio
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
                    temp_path = f.name
                
                # Send TTS request
                print_info(f"Testing TTS with text: '{test_text}'")
                conn = http.client.HTTPConnection(SERVER_URL, SERVER_PORT)
                headers = {'Content-type': 'application/json'}
                body = json.dumps({
                    "text": test_text,
                    "speaker": test_speaker,
                    "model": "default"
                })
                
                conn.request("POST", "/tts", body, headers)
                response = conn.getresponse()
                
                if response.status == 200:
                    print_success("TTS request successful")
                    
                    # Save the audio to a file
                    audio_data = response.read()
                    with open(temp_path, 'wb') as f:
                        f.write(audio_data)
                    
                    # Check if the file has content
                    if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                        print_success(f"Audio generated successfully: {os.path.getsize(temp_path)} bytes")
                        
                        # Try to play the audio if on macOS
                        if platform.system() == "Darwin":
                            try:
                                print_info("Attempting to play the audio...")
                                subprocess.run(["afplay", temp_path], check=True)
                                print_success("Audio played successfully")
                            except Exception as e:
                                print_warning(f"Could not play audio: {e}")
                    else:
                        print_error("Audio file is empty or doesn't exist")
                else:
                    print_error(f"TTS request failed: {response.status} {response.reason}")
                    error_data = response.read().decode()
                    print_error(f"Error response: {error_data}")
                
                # Clean up
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
            except Exception as e:
                print_error(f"Error testing TTS: {e}")
            
            return True
            
        else:
            print_error(f"Server health check failed: {response.status} {response.reason}")
            return False
    except Exception as e:
        print_error(f"Error connecting to server: {e}")
        print_info(f"Make sure the server is running on {SERVER_URL}:{SERVER_PORT}")
        return False

def main():
    """Run all tests."""
    print_header("OpenVoice Test Suite")
    
    tests = [
        ("System Information", check_system_info),
        ("Environment Check", check_environment),
        ("Direct Import Test", test_direct_import),
        ("OpenVoice Core Test", test_openvoice_core),
        ("Server Test", test_server)
    ]
    
    results = {}
    for name, test_func in tests:
        if name == "System Information":
            # This test doesn't return a result
            test_func()
            results[name] = True
        else:
            print(f"\nRunning test: {name}")
            result = test_func()
            results[name] = result
    
    # Print summary
    print_header("Test Results Summary")
    
    all_passed = True
    for name, result in results.items():
        if name == "System Information":
            continue  # Skip this in the results
            
        if result:
            print_success(f"{name}: PASSED")
        else:
            print_error(f"{name}: FAILED")
            all_passed = False
    
    if all_passed:
        print_success("\nAll tests passed! OpenVoice is working correctly.")
    else:
        print_error("\nSome tests failed. See details above for troubleshooting.")

if __name__ == "__main__":
    main()