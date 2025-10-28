@echo off
setlocal enabledelayedexpansion

rem =============================================================
rem  Smart Attendance System - one click setup for Windows
rem  - Installs backend & frontend dependencies
rem  - Copies environment template if missing
rem  - Runs Prisma migrations to sync MySQL schema
rem  Usage examples:
rem    setup.bat               -> install + migrate deploy
rem    setup.bat seed          -> install + migrate deploy + seed sample data
rem    setup.bat reset         -> drop & recreate DB (prisma migrate reset)
rem    setup.bat reset seed    -> reset DB then seed sample data
rem =============================================================

set RESET_DB=0
set RUN_SEED=0
set MIGRATIONS_DONE=0

for %%A in (%*) do (
  if /I "%%~A"=="reset" set RESET_DB=1
  if /I "%%~A"=="seed" set RUN_SEED=1
)

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

if "%RESET_DB%"=="1" (
  echo [step] Resetting database via Prisma (DROP & recreate)...
  call npx prisma migrate reset --force --skip-generate
  if errorlevel 1 (
    echo [error] prisma migrate reset failed. Verify MySQL is running and DATABASE_URL is correct.
    goto :backend_fail
  ) else (
    echo [info] Database reset and migrations re-applied.
    set MIGRATIONS_DONE=1
  )
)

if "%MIGRATIONS_DONE%"=="0" (
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
)

if "%RUN_SEED%"=="1" (
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
if "%RUN_SEED%"=="1" (
  echo     (Seed script already executed.)
) else (
  echo     (To seed sample data later: cd backend ^&^& node scripts\seedSemesterAttendance.js)
)
if "%RESET_DB%"=="1" (
  echo     (Database was reset via prisma migrate reset.)
)

goto :EOF

:backend_fail
popd >NUL
popd >NUL
exit /b 1

:frontend_fail
popd >NUL
exit /b 1
