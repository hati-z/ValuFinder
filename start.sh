#!/bin/bash

# Define paths and colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting ValuFinder ===${NC}"

# Start Backend
echo -e "${GREEN}Starting backend API server...${NC}"
cd api
if [ ! -d "venv" ]; then
    echo -e "Virtual environment not found. Building it now..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Run the backend in the background
python3 app.py &
BACKEND_PID=$!
cd ..

# Start Frontend
echo -e "${GREEN}Starting frontend Client server...${NC}"
cd public
python3 -m http.server 8000 &
FRONTEND_PID=$!
cd ..

echo -e "${BLUE}=== Setup Complete ===${NC}"
echo -e "Backend running on port 3000 (PID: $BACKEND_PID)"
echo -e "Frontend running on port 8000 (PID: $FRONTEND_PID)"
echo -e "${GREEN}Navigate to http://localhost:8000 in your browser.${NC}"
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C to kill background processes gracefully
trap "echo -e '\n${RED}Shutting down ValuFinder servers...${NC}'; kill $BACKEND_PID; kill $FRONTEND_PID; exit" SIGINT

# Wait infinitely so the script doesn't exit, keeping the traps alive
wait
