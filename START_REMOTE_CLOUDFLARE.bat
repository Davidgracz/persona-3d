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

echo [1/4] Aktualizuje zaleznosci...
call pnpm install
if errorlevel 1 (
  echo BLAD: pnpm install nie powiodl sie.
  pause
  exit /b 1
)

echo [2/4] Buduje wersje lokalnego Workera...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue"
call pnpm build
if errorlevel 1 (
  echo.
  echo BLAD: Build Persona 3D nie powiodl sie.
  pause
  exit /b 1
)

echo [3/4] Uruchamiam lokalnego Workera na porcie 8787...
start "Persona 3D - Worker" cmd /k "cd /d ""%~dp0"" && pnpm start -- --port 8787"

echo Czekam az Worker odpowie...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddSeconds(90); $ok=$false; while((Get-Date)-lt $deadline){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8787' -TimeoutSec 2; if($r.StatusCode -ge 200){$ok=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){exit 1}"
if errorlevel 1 (
  echo.
  echo BLAD: Worker nie wystartowal na http://127.0.0.1:8787
  echo Sprawdz okno "Persona 3D - Worker".
  pause
  exit /b 1
)

echo [4/4] Uruchamiam Cloudflare Quick Tunnel...
echo.
echo Za chwile pojawi sie adres:
echo https://losowe-slowa.trycloudflare.com
echo.
echo TEN ADRES MOZESZ OTWORZYC Z PRACY.
echo Nie zamykaj tego okna ani okna "Persona 3D - Worker".
echo.

call pnpm exec wrangler tunnel quick-start http://127.0.0.1:8787

echo.
echo Tunnel zostal zatrzymany.
pause
