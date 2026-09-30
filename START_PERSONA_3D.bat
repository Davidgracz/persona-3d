@echo off
title Persona 3D
cd /d "%~dp0"
echo.
echo === Persona 3D ===
where pnpm >nul 2>nul
if errorlevel 1 (
  echo Instaluję pnpm...
  call npm install -g pnpm@11.25.0
)
if not exist node_modules (
  echo Instaluję zależności...
  call pnpm install
)
start "" http://127.0.0.1:3000
call pnpm dev
pause
