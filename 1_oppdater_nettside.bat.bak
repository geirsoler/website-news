@echo off
chcp 65001 >nul
echo ============================================
echo   Henter endringer fra GitHub (f.eks. CMS)...
echo ============================================
git pull origin main

echo.
echo ============================================
echo   Laster opp dine lokale endringer...
echo ============================================
git add .
git commit -m "Oppdatering av nettside via batch-skript"
git push origin main

echo.
echo ============================================
echo   Ferdig! Netlify bygger nettsiden nå.
echo ============================================
pause