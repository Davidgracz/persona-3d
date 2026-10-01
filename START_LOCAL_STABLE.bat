@echo off
chcp 65001 >nul
setlocal
title Persona 3D - Stable Local

cd /d "%~dp0"

echo.
echo === Persona 3D - stabilny lokalny start ===
echo.

where pnpm >nul 2>&1
if errorlevel 1 (
  echo Instaluje pnpm...
  call npm install -g pnpm@11.25.0
  if errorlevel 1 (
    echo BLAD: Nie udalo sie zainstalowac pnpm.
    pause
    exit /b 1
  )
)

echo [1/3] Aktualizuje zaleznosci...
call pnpm install
if errorlevel 1 (
  echo BLAD: pnpm install nie powiodl sie.
  pause
  exit /b 1
)

echo [2/3] Buduje Workera...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue"
call pnpm build
if errorlevel 1 (
  echo.
  echo BLAD: Build nie powiodl sie.
  pause
  exit /b 1
)

echo [3/3] Uruchamiam http://127.0.0.1:8787
start "" http://127.0.0.1:8787
call pnpm start -- --port 8787

pause
