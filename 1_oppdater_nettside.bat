@echo off
chcp 65001 >nul
echo ============================================
echo   Henter endringer fra GitHub (f.eks. CMS)...
echo ============================================
git pull --rebase --autostash origin main

echo.
echo ============================================
echo   Bygger nyhetssider og oppdaterer HTML...
echo ============================================
node js/build-news.js
if %errorlevel% neq 0 (
    echo.
    echo [FEIL] Kunne ikke kjore node js/build-news.js!
    echo Sjekk at Node.js er installert, eller se feilmeldingen over.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================
echo   Laster opp dine lokale endringer...
echo ============================================
git status --porcelain >nul 2>&1
git diff --quiet && git diff --staged --quiet
if %errorlevel% neq 0 (
    git add .
    git commit -m "Oppdatering av nettside via batch-skript"
    git push origin main
    echo.
    echo ============================================
    echo   Ferdig! Endringer sendt til GitHub.
    echo   Nettsiden oppdateres automatisk.
    echo ============================================
) else (
    echo Ingen lokale endringer å laste opp.
)

pause