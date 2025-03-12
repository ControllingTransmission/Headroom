#!/usr/bin/env python3
"""
Setup script to initialize OpenVoice and verify it works.
"""

import os
import sys
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Add the OpenVoice directory to the path
openvoice_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                             "openvoice_env", "OpenVoice")
sys.path.append(openvoice_path)

# Models directory
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "openvoice_models")
os.makedirs(MODELS_DIR, exist_ok=True)

def main():
    logger.info("Starting OpenVoice setup script")
    
    # Check if PyTorch is available
    try:
        import torch
        logger.info(f"PyTorch version: {torch.__version__}")
        logger.info(f"CUDA available: {torch.cuda.is_available()}")
    except ImportError:
        logger.error("PyTorch is not installed. Please install it first.")
        return False
    
    # Try to import OpenVoice
    try:
        logger.info(f"Looking for OpenVoice in: {openvoice_path}")
        logger.info(f"Path contents: {os.listdir(openvoice_path)}")
        
        # Try different import paths
        try:
            sys.path.insert(0, openvoice_path)
            from api import create_tts_fn, load_voice_conversion_model
            logger.info("Successfully imported OpenVoice API")
        except ImportError as e:
            logger.error(f"Failed to import from OpenVoice path: {e}")
            logger.info("Trying alternative import paths...")
            try:
                from openvoice.api import create_tts_fn, load_voice_conversion_model
                logger.info("Successfully imported OpenVoice API from package")
            except ImportError as e2:
                logger.error(f"Failed to import OpenVoice: {e2}")
                return False
    except Exception as e:
        logger.error(f"Error accessing OpenVoice: {e}")
        return False
    
    # Download models
    try:
        # Define model paths
        converter_checkpoint = os.path.join(MODELS_DIR, "converter.pth")
        
        # Download models if they don't exist
        if not os.path.exists(converter_checkpoint):
            logger.info("Downloading voice conversion model...")
            
            import requests
            base_url = "https://huggingface.co/myshell-ai/OpenVoice/resolve/main"
            url = f"{base_url}/converter.pth"
            
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                with open(converter_checkpoint, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            logger.info(f"Downloaded converter model: {os.path.getsize(converter_checkpoint)} bytes")
        else:
            logger.info(f"Using existing converter model: {os.path.getsize(converter_checkpoint)} bytes")
    except Exception as e:
        logger.error(f"Failed to download models: {e}")
        return False
    
    # Test OpenVoice functionality
    try:
        logger.info("Testing OpenVoice functionality...")
        
        # Load voice conversion model
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        voice_converter = load_voice_conversion_model(converter_checkpoint, device)
        logger.info("Voice conversion model loaded successfully")
        
        # Create TTS function
        tts_fn = create_tts_fn(device)
        logger.info("TTS function created successfully")
        
        # Try generating a small test
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            temp_path = tmp.name
        
        logger.info(f"Generating test audio to {temp_path}")
        tts_fn(
            text="This is a test of OpenVoice.",
            save_path=temp_path,
            voice_conversion_model=voice_converter,
            base_speaker_referenced="female",
            prompt="Please speak in a neutral and clear tone."
        )
        
        # Check if the file was created
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            logger.info(f"Test audio generated successfully: {os.path.getsize(temp_path)} bytes")
            os.unlink(temp_path)  # Clean up
            return True
        else:
            logger.error("Failed to generate test audio")
            return False
            
    except Exception as e:
        logger.error(f"Error testing OpenVoice: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    if main():
        print("\n✅ OpenVoice setup successful! The system is ready to use.")
    else:
        print("\n❌ OpenVoice setup failed. Please check the logs for details.")