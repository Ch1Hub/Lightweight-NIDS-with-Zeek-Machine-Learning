#!/bin/bash
# 2CSCys Web App — Single-process deployment
# Builds frontend, then serves everything via Flask on port 5000
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Build frontend if needed
if [ ! -d "webapp/frontend/dist" ] || [ ! -f "webapp/frontend/dist/index.html" ]; then
    echo "[build] Compiling React frontend..."
    cd webapp/frontend && npm install --silent && npx vite build
    cd "$ROOT"
fi

echo ""
echo "=== 2CSCys NIDS Dashboard ==="
echo ""
echo "Open in browser:  http://10.0.145.2:5000"
echo ""

venv/bin/python webapp/backend/app.py
