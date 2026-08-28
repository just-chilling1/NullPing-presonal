@echo off
cd /d "%~dp0.."
echo Deploying NullPing updates to Vercel...
echo.

REM Install deps if next is missing (optional; Vercel builds remotely)
if not exist "node_modules\next\package.json" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed - continuing with push anyway ^(Vercel builds remotely^).
  )
)

REM Copy logo PNGs into public/ and brand-assets/
call node scripts\copy-logos-now.mjs
if errorlevel 1 (
  echo Logo copy warning - continuing...
)

echo.
echo Committing and pushing to GitHub ^(Vercel auto-deploys^)...
git add -A
git reset HEAD -- .env .env.local 2>nul
git status -sb

git commit -m "Fix Vercel build and ship NullPing logo + theme." -m "Resolve BrandLogo TypeScript error, remove stale thumbnailSrc, and commit logo assets."
if errorlevel 1 (
  echo Nothing new to commit, pushing existing commits...
)

echo Pushing to https://github.com/just-chilling1/NullPing-presonal.git ...
git push https://github.com/just-chilling1/NullPing-presonal.git HEAD:main
if errorlevel 1 (
  git push https://github.com/just-chilling1/BlackBox.git HEAD:main
  if errorlevel 1 (
    git push origin HEAD
    if errorlevel 1 (
      echo.
      echo PUSH FAILED - check git credentials and try again.
      pause
      exit /b 1
    )
  )
)

echo.
echo Done. DigitalOcean App Platform will rebuild in ~3-5 minutes.
echo Production repo: https://github.com/just-chilling1/NullPing-presonal
echo Site:  https://nullpingmembersarea.com
pause
