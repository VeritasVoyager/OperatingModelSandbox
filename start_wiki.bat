@echo off
REM --- Operating Model Sandbox: Automated Local Server Launcher ---
REM This batch script automates the launch of the Python HTTP server
REM and opens the web application in the default browser.
REM Designed for single-click access for the "Smart Wiki" MVP.

REM 1. Set the current directory to where this batch file is located.
REM This ensures the Python server serves files relative to the project root.
cd /d "%~dp0"

REM 2. Define the port for the HTTP server.
REM Using a variable allows easy modification if port 8000 is in use.
set PORT=8000

REM 3. Check if Python is available.
REM The 'where' command searches for 'python' in the system's PATH.
REM If Python is not found, %errorlevel% will be non-zero.
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python is not found on your system PATH.
    echo Please ensure Python is installed and added to your system's PATH.
    echo You can download Python from https://www.python.org/downloads/
    echo.
    pause
    goto :eof
)

REM 4. Start the Python HTTP server in a new, minimized window.
REM The 'start' command launches a new, independent process.
REM "Operating Model Server" sets the title of the new window for easy identification.
REM '/min' minimizes the new command prompt window, keeping the user experience clean.
start "Operating Model Server" /min python -m http.server %PORT%

REM 5. Wait a moment for the server to fully initialize.
REM A brief pause ensures the server is ready before the browser attempts to connect.
REM 'timeout /t 2' waits for 2 seconds. '>nul' suppresses the countdown message.
timeout /t 2 >nul

REM 6. Open the application in the default web browser.
REM The 'start' command opens the specified URL in the user's default browser.
start "http://localhost:%PORT%/"

echo.
echo Operating Model Sandbox is launching in your default web browser.
echo The server is running in a minimized command prompt window.
echo.
echo To close the application and stop the server, please close the minimized command prompt window that appeared.
echo (You may need to look for it in your taskbar if it's not visible).
echo.
pause
REM Cleanly exit this initial batch script window after the user acknowledges.
exit