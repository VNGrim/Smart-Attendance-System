@echo off
setlocal enabledelayedexpansion

rem =============================================================
rem  Smart Attendance System - one click setup for Windows
rem  - Installs backend & frontend dependencies
rem  - Copies environment template if missing
rem  - Drops any existing DB, reapplies migrations, seeds sample data
rem  Usage examples:
rem    setup.bat                -> reset DB + seed + install deps (DEFAULT)
rem    setup.bat noreset        -> keep existing DB (skip reset)
rem    setup.bat noseed         -> skip seeding sample data
rem    setup.bat noreset noseed -> behave like pure install
rem =============================================================

set RESET_DB=1
set RUN_SEED=1
set MIGRATIONS_DONE=0
set EXIT_CODE=0
set STEP=1
set CURRENT_TASK=Initializing setup

for %%A in (%*) do (
  if /I "%%~A"=="reset" set RESET_DB=1
  if /I "%%~A"=="seed" set RUN_SEED=1
  if /I "%%~A"=="noreset" set RESET_DB=0
  if /I "%%~A"=="noseed" set RUN_SEED=0
)

echo.
echo ===> Smart Attendance System setup starting...
set CURRENT_TASK=Locate backend directory
call :logStep "Backend - locating project folder"

set ROOT=%~dp0
pushd "%ROOT%backend" >NUL 2>&1
if errorlevel 1 (
  echo [error] Cannot locate backend folder. Make sure you run this script from repo root.
  set EXIT_CODE=1
  goto :END
)

echo.
echo --- Backend setup ---
set CURRENT_TASK=Ensure backend environment file
call :logStep "Backend - ensure environment file"
if not exist .env (
  if exist .env.example (
    copy /Y .env.example .env >NUL
    echo [info] Created backend\.env from template.
  ) else (
    echo [warn] .env.example not found. Please create backend\.env manually and rerun.
  )
)

set CURRENT_TASK=Install backend npm packages
call :logStep "Backend - install npm packages"
echo [step] Installing backend npm packages...
call npm install
if errorlevel 1 (
  echo [error] npm install failed in backend. Check Node.js/npm installation and retry.
  goto :backend_fail
)

if "%RESET_DB%"=="1" (
  set CURRENT_TASK=Reset database schema
  call :logStep "Backend - resetting database (prisma migrate reset)"
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
  set CURRENT_TASK=Apply database migrations
  call :logStep "Backend - applying migrations"
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
  set CURRENT_TASK=Seed sample data
  call :logStep "Backend - seeding sample data"
  echo [step] Seeding sample data (seedSemesterAttendance.js)...
  call node scripts\seedSemesterAttendance.js
  if errorlevel 1 (
    echo [warn] Seed script failed. Check logs above.
  ) else (
    echo [info] Seed completed.
  )
) else (
  echo [info] Skipped seeding (omit the `noseed` flag to seed automatically).
)

:backend_done
popd >NUL

echo.
echo --- Frontend setup ---
set CURRENT_TASK=Install frontend npm packages
call :logStep "Frontend - install npm packages"
pushd "%ROOT%frontend" >NUL 2>&1
if errorlevel 1 (
  echo [error] Cannot locate frontend folder. Make sure repo structure is intact.
  set EXIT_CODE=1
  goto :END
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

set CURRENT_TASK=Completed
goto :END

:backend_fail
set EXIT_CODE=1
echo [fatal] Backend setup failed during step: !CURRENT_TASK!
popd >NUL
goto :END

:frontend_fail
popd >NUL
set EXIT_CODE=1
set CURRENT_TASK=Install frontend npm packages
echo [fatal] Frontend setup failed during step: !CURRENT_TASK!
goto :END

:END
echo.
if "!EXIT_CODE!"=="0" (
  echo ✅ Setup completed successfully.
) else (
  echo ❌ Setup finished with errors. (exit code !EXIT_CODE!)
  echo Last attempted step: !CURRENT_TASK!
)
echo.
echo Press any key to close this window...
pause >NUL
exit /b !EXIT_CODE!

:logStep
echo [STEP !STEP!] %~1
set /a STEP+=1
goto :EOF
