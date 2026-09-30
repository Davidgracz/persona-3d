# Persona 3D

Prototyp strony do zamawiania figurek/modeli 3D.

## Funkcje
- generowanie Text-to-3D przez Meshy
- Multi-Image-to-3D z maks. 4 zdjęć
- podgląd GLB w przeglądarce
- pobieranie GLB / STL / 3MF
- testowe zamówienie 49 zł
- dummy BLIK: `123456`
- klucz Meshy działa wyłącznie po stronie serwera

## Windows / PowerShell
```powershell
npm install
npm run dev
```
Następnie otwórz: `http://localhost:3000`

## Meshy
Skopiuj `.env.example` jako `.env` i ustaw `MESHY_API_KEY`.
Plik `.env` jest ignorowany przez Git i NIE powinien trafiać na GitHub.
