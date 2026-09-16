@echo off
setlocal
title GoReady - Khoi dong he thong

echo ============================================
echo   GoReady - Dang khoi dong...
echo ============================================
echo.

cd /d "%~dp0backend"
if not exist node_modules (
  echo [Backend] Dang cai dat lan dau, vui long doi...
  call npm install
)
echo [Backend] Khoi dong server du lieu tai http://localhost:4000 ...
start "GoReady Backend (dong cua so nay se tat server)" cmd /k "npm run dev"

cd /d "%~dp0"
if not exist node_modules (
  echo [Frontend] Dang cai dat lan dau, vui long doi...
  call npm install
)
echo [Frontend] Khoi dong web tai http://localhost:5183 ...
start "GoReady Frontend (dong cua so nay se tat server)" cmd /k "npm run dev"

echo.
echo Dang cho server khoi dong xong (khoang 6 giay)...
timeout /t 6 /nobreak >nul

start "" "http://localhost:5183/user.index.html"

echo.
echo ============================================
echo   GoReady da san sang!
echo   - Trang nguoi dung: http://localhost:5183/user.index.html
echo   - Trang quan tri  : http://localhost:5183/admin.index.html
echo.
echo   Luu y: dung dong 2 cua so "GoReady Backend"
echo   va "GoReady Frontend" - dong cua so nao thi
echo   web tuong ung se ngung hoat dong.
echo ============================================
echo.
pause
