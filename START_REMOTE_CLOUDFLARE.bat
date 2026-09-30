@echo off
chcp 65001 >nul
setlocal
title Persona 3D - Cloudflare Remote

cd /d "%~dp0"

echo.
echo === Persona 3D - Cloudflare Remote ===
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

echo [2/3] Uruchamiam lokalny serwer Persona 3D na porcie 5173...
start "Persona 3D - DEV" cmd /k "cd /d ""%~dp0"" && pnpm dev"

echo Czekam az serwer odpowie...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddSeconds(45); $ok=$false; while((Get-Date)-lt $deadline){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 2; if($r.StatusCode -ge 200){$ok=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){exit 1}"
if errorlevel 1 (
  echo.
  echo BLAD: Persona 3D nie wystartowala na http://127.0.0.1:5173
  echo Sprawdz okno "Persona 3D - DEV".
  pause
  exit /b 1
)

echo [3/3] Uruchamiam Cloudflare Tunnel...
echo.
echo Za chwile pojawi sie adres w stylu:
echo https://losowe-slowa.trycloudflare.com
echo.
echo TEN ADRES MOZESZ OTWORZYC Z PRACY.
echo Nie zamykaj tego okna ani okna serwera DEV.
echo.

call pnpm exec wrangler tunnel quick-start http://127.0.0.1:5173

echo.
echo Tunnel zostal zatrzymany.
pause
