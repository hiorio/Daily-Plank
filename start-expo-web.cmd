@echo off
cd /d "%~dp0"
set EXPO_NO_TELEMETRY=1
set CI=1
set PORT=%1
if "%PORT%"=="" set PORT=8081
npx.cmd expo start --web --port %PORT%
