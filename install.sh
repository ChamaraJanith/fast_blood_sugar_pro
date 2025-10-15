#!/bin/bash

echo "Installing GlucoTracker - Glucose Monitoring System"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "Node.js found!"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install backend dependencies!"
    exit 1
fi

echo ""
echo "Starting backend server..."
npm start &
BACKEND_PID=$!

echo ""
echo "Waiting for server to start..."
sleep 5

echo ""
echo "Starting frontend server..."
cd ../frontend

# Try different Python commands
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080 &
elif command -v python &> /dev/null; then
    python -m http.server 8080 &
else
    echo "Warning: Python not found. Please serve the frontend manually."
    echo "You can use any static file server to serve the frontend directory."
fi

echo ""
echo "Setup complete!"
echo ""
echo "Backend running on: http://localhost:3000"
echo "Frontend running on: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait
