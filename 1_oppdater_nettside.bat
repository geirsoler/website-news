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
git status --porcelain >nul 2>&1
git diff --quiet && git diff --staged --quiet
if %errorlevel% neq 0 (
    git add .
    git commit -m "Oppdatering av nettside via batch-skript [skip netlify]"
    git push origin main
    echo.
    echo ============================================
    echo   Ferdig! Endringer sendt til GitHub.
    echo   Netlify bygger når sidene er klargjort.
    echo ============================================
) else (
    echo Ingen lokale endringer å laste opp.
)

pause