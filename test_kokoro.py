#!/usr/bin/env python
"""
Test script for Kokoro TTS server
This script sends a test request to the Kokoro TTS server to verify it's working correctly
"""

import requests
import argparse
import sys
import json
import time
import os
import wave
import subprocess

def test_health(base_url):
    """Test the health endpoint"""
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_tts_get(base_url, text="Hello, this is a test."):
    """Test the TTS GET endpoint"""
    try:
        response = requests.get(f"{base_url}/tts", params={"text": text})
        if response.status_code == 200:
            print(f"✅ TTS GET test passed")
            with open("test_get.wav", "wb") as f:
                f.write(response.content)
            print(f"💾 Audio saved to test_get.wav")
            return True
        else:
            print(f"❌ TTS GET test failed: {response.status_code}")
            if response.headers.get("Content-Type") == "application/json":
                print(f"Error: {response.json()}")
            return False
    except Exception as e:
        print(f"❌ TTS GET test error: {e}")
        return False

def test_tts_post(base_url, text="Hello, this is a POST request test."):
    """Test the TTS POST endpoint"""
    try:
        headers = {"Content-Type": "application/json"}
        data = {"text": text}
        response = requests.post(f"{base_url}/tts", headers=headers, json=data)
        if response.status_code == 200:
            print(f"✅ TTS POST test passed")
            with open("test_post.wav", "wb") as f:
                f.write(response.content)
            print(f"💾 Audio saved to test_post.wav")
            return True
        else:
            print(f"❌ TTS POST test failed: {response.status_code}")
            if response.headers.get("Content-Type") == "application/json":
                print(f"Error: {response.json()}")
            return False
    except Exception as e:
        print(f"❌ TTS POST test error: {e}")
        return False

def start_server(non_interactive=True):
    """Start the Kokoro TTS server for testing"""
    print("Starting Kokoro TTS server...")
    
    # Check if we should use the start_kokoro.sh script or run_kokoro.py directly
    if os.path.exists("start_kokoro.sh"):
        cmd = ["./start_kokoro.sh"]
        if non_interactive:
            cmd.append("--non-interactive")
            
        # Start the server as a subprocess
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait a bit for the server to start
        time.sleep(5)
        return process
    elif os.path.exists("run_kokoro.py"):
        # We'll use the Python script directly
        cmd = ["python", "run_kokoro.py"]
        if non_interactive:
            cmd.append("--no-interactive")
            
        # Start the server as a subprocess
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait a bit for the server to start
        time.sleep(5)
        return process
    else:
        print("❌ Neither start_kokoro.sh nor run_kokoro.py found")
        return None

def main():
    parser = argparse.ArgumentParser(description="Test the Kokoro TTS server")
    parser.add_argument("--url", default="http://localhost:8008", help="Base URL of the Kokoro TTS server")
    parser.add_argument("--start-server", action="store_true", help="Start the server before testing")
    parser.add_argument("--text", default="Hello, this is a test of the Kokoro TTS system.", help="Text to synthesize")
    
    args = parser.parse_args()
    
    server_process = None
    if args.start_server:
        server_process = start_server()
        if not server_process:
            print("Failed to start server")
            return 1
    
    # Run the tests
    try:
        all_passed = True
        
        # Test health endpoint
        if not test_health(args.url):
            all_passed = False
        
        # Test TTS GET endpoint
        if not test_tts_get(args.url, args.text):
            all_passed = False
        
        # Test TTS POST endpoint
        if not test_tts_post(args.url, args.text):
            all_passed = False
            
        if all_passed:
            print("\n✅ All tests passed!")
            return 0
        else:
            print("\n❌ Some tests failed")
            return 1
    finally:
        # Stop the server if we started it
        if server_process:
            print("Stopping server...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()

if __name__ == "__main__":
    sys.exit(main()) 