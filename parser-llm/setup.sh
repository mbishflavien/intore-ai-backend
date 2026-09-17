#!/bin/bash
# Setup script for the local Qwen parser

set -e

echo "========================================"
echo "Umurava Resume Parser - Setup Script"
echo "========================================"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create virtual environment
echo "[1/4] Creating Python virtual environment..."
python3 -m venv venv

# Activate venv
source venv/bin/activate

# Install dependencies
echo "[2/4] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create models directory
echo "[3/4] Creating models directory..."
mkdir -p models

# Download Qwen model
echo "[4/4] Downloading Qwen2.5-1.5B GGUF model..."
echo "This will download ~1GB file. Make sure you have stable internet."

MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"
MODEL_FILE="$SCRIPT_DIR/models/qwen.gguf"

if [ -f "$MODEL_FILE" ]; then
    echo "Model already exists at $MODEL_FILE"
else
    echo "Downloading model from HuggingFace..."
    curl -L "$MODEL_URL" -o "$MODEL_FILE"
fi

echo ""
echo "========================================"
echo "Setup complete!"
echo "========================================"
echo ""
echo "To start the parser service:"
echo "  cd $SCRIPT_DIR"
echo "  source venv/bin/activate"
echo "  python main.py"
echo ""
echo "The service will run on http://localhost:5000"
echo ""