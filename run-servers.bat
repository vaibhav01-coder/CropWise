@echo off
setlocal

cd /d "%~dp0"
if exist ".tools\node-v20.18.1-win-x64\node.exe" (
  set "PATH=%CD%\.tools\node-v20.18.1-win-x64;%PATH%"
)

start "BeejRakshak Client" cmd /k "npm run dev:client"
start "BeejRakshak Services" cmd /k "cd AIML && py -m pip install -r requirements.txt && py -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

endlocal
