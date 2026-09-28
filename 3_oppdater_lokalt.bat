@echo off
chcp 65001 >nul
echo ============================================
echo   Synkroniserer lokale filer med GitHub...
echo ============================================
git pull origin main

echo.
echo ============================================
echo   Ferdig! Lokale filer er oppdatert.
echo ============================================
pause