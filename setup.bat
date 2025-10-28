@echo off
setlocal enabledelayedexpansion

rem =============================================================
rem  Smart Attendance System - one click setup for Windows
rem  - Installs backend & frontend dependencies
rem  - Copies environment template if missing
rem  - Runs Prisma migrations to sync MySQL schema
rem  Usage: double click or run `setup.bat` (optionally `setup.bat seed`)
rem =============================================================

echo.
echo ===> Smart Attendance System setup starting...

set ROOT=%~dp0
pushd "%ROOT%backend" >NUL 2>&1
if errorlevel 1 (
  echo [error] Cannot locate backend folder. Make sure you run this script from repo root.
  goto :EOF
)

echo.
echo --- Backend setup ---
if not exist .env (
  if exist .env.example (
    copy /Y .env.example .env >NUL
    echo [info] Created backend\.env from template.
  ) else (
    echo [warn] .env.example not found. Please create backend\.env manually and rerun.
  )
)

echo [step] Installing backend npm packages...
call npm install
if errorlevel 1 (
  echo [error] npm install failed in backend. Check Node.js/npm installation and retry.
  goto :backend_fail
)

if exist package-lock.json (
  for /f "tokens=2 delims=:" %%i in ('findstr /i "DATABASE_URL" .env 2^>nul') do set HAS_DB=%%i
)

echo [step] Running Prisma migrate deploy...
call npx prisma migrate deploy
if errorlevel 1 (
  echo [warn] prisma migrate deploy failed. Trying prisma db push...
  call npx prisma db push
  if errorlevel 1 (
    echo [error] Prisma schema sync failed. Verify MySQL is running and DATABASE_URL is correct.
    goto :backend_fail
  ) else (
    echo [info] prisma db push completed successfully.
  )
) else (
  echo [info] Database schema synced via migrate deploy.
)

if /i "%~1"=="seed" (
  echo [step] Seeding sample data (seedSemesterAttendance.js)...
  call node scripts\seedSemesterAttendance.js
  if errorlevel 1 (
    echo [warn] Seed script failed. Check logs above.
  ) else (
    echo [info] Seed completed.
  )
) else (
  echo [info] Skip seeding (pass argument `seed` to run it automatically).
)

:backend_done
popd >NUL

echo.
echo --- Frontend setup ---
pushd "%ROOT%frontend" >NUL 2>&1
if errorlevel 1 (
  echo [error] Cannot locate frontend folder. Make sure repo structure is intact.
  goto :EOF
)

echo [step] Installing frontend npm packages...
call npm install
if errorlevel 1 (
  echo [error] npm install failed in frontend. Check logs above.
  goto :frontend_fail
)

echo [info] Frontend dependencies installed.

:frontend_done
popd >NUL

echo.
echo ===> Setup finished.
echo     Run backend:   cd backend ^&^& node index.js
echo     Run frontend:  cd frontend ^&^& npm run dev
echo.
if /i "%~1"=="seed" (
  echo     (Seed script already executed.)
) else (
  echo     (To seed sample data later: cd backend ^&^& node scripts\seedSemesterAttendance.js)
)

goto :EOF

:backend_fail
popd >NUL
popd >NUL
exit /b 1

:frontend_fail
popd >NUL
exit /b 1
