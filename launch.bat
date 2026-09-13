@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install it from https://nodejs.org then try again.
  pause
  exit /b 1
)

echo Closing other CharGen.AI servers...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-chargen-servers.ps1"

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting CharGen.AI at http://localhost:5173/CharGen.AI/
call npm run dev -- --port 5173 --strictPort --open /CharGen.AI/
if errorlevel 1 pause
