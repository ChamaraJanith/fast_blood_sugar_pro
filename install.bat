@echo off
echo Installing GlucoTracker - Glucose Monitoring System
echo.

echo Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found!
echo.

echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies!
    pause
    exit /b 1
)

echo.
echo Starting backend server...
start cmd /k "npm start"

echo.
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting frontend server...
cd ../frontend
start cmd /k "python -m http.server 8080 || python3 -m http.server 8080"

echo.
echo Setup complete!
echo.
echo Backend running on: http://localhost:3000
echo Frontend running on: http://localhost:8080
echo.
echo Press any key to exit...
pause >nul
