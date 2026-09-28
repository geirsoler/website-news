@echo off
chcp 65001 >nul
echo ============================================
echo   Henter nyeste versjon fra GitHub...
echo ============================================
git pull origin main

echo.
echo ============================================
echo   Åpner index.html i nettleseren...
echo ============================================
start "" "index.html"