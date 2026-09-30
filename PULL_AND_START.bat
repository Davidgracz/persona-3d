@echo off
title Persona 3D - update + start
cd /d "%~dp0"
echo.
echo === Pobieram aktualizacje z GitHub ===
git pull
if errorlevel 1 (
  echo.
  echo Git pull nie powiódł się. Sprawdź komunikat powyżej.
  pause
  exit /b 1
)
where pnpm >nul 2>nul
if errorlevel 1 call npm install -g pnpm@11.25.0
call pnpm install
start "" http://127.0.0.1:3000
call pnpm dev
pause
