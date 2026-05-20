#!/bin/bash
set -e

echo "=== IDS-ML Project Setup ==="

PYTHON_CMD=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        PYTHON_CMD="$cmd"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "Error: Python not found. Install Python 3.10+ and try again."
    exit 1
fi

echo "Using Python: $PYTHON_CMD ($($PYTHON_CMD --version))"

if ! $PYTHON_CMD -m venv --help &>/dev/null; then
    echo "Error: venv module not available."
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "Checking for Zeek..."
if command -v zeek &>/dev/null; then
    echo "Zeek found: $(zeek --version 2>&1 | head -1)"
else
    echo "WARNING: Zeek not found. Install Zeek for PCAP processing."
    echo "  Ubuntu/Debian: sudo apt install zeek"
    echo "  macOS: brew install zeek"
fi

mkdir -p data/pcaps data/csv data/processed models logs output

echo ""
echo "=== Setup Complete ==="
echo "To activate the environment:  source venv/bin/activate"
echo "To start Jupyter:              jupyter notebook"
echo ""
echo "=== DATA SETUP (required before training) ==="
echo "Download CIC-IDS2017 from: https://www.unb.ca/cic/datasets/ids-2017.html"
echo ""
echo "  1. Place PCAP files (.pcap) in data/pcaps/  (used by Zeek for feature extraction)"
echo "  2. Place CSV files in data/csv/                 (used ONLY for ground-truth labels)"
echo "  3. Run:  python generate_dataset.py"
echo "     OR:   Run notebooks/01_dataset_preparation.ipynb"
echo "  4. Run notebooks/02_tier1_training.ipynb"
echo "  5. Run notebooks/03_tier2_training.ipynb"
echo ""
echo "To run offline pipeline (after training):"
echo "  python -m src.main --mode offline --pcap <path_to_pcap>"
echo ""
echo "To run live pipeline (after training):"
echo "  python -m src.main --mode live --interface <iface>"