@echo off
setlocal enabledelayedexpansion

rem =============================================================
rem  Smart Attendance System - Setup Script (Windows)
rem  - Installs backend & frontend dependencies
rem  - Copies environment file if missing
rem  - Drops existing DB, reapplies Prisma migrations, seeds sample data
rem =============================================================

set RESET_DB=1
set RUN_SEED=1
set EXIT_CODE=0
set STEP=1
set CURRENT_TASK=Initializing setup

for %%A in (%*) do (
  if /I "%%~A"=="noreset" set RESET_DB=0
  if /I "%%~A"=="noseed" set RUN_SEED=0
)

echo.
echo ===> Smart Attendance System setup starting...
call :logStep "Locate project backend folder"

set ROOT=%~dp0
pushd "%ROOT%backend" >NUL 2>&1
if errorlevel 1 (
  echo [error] Cannot locate backend folder. Run this script from repo root.
  set EXIT_CODE=1
  goto :END
)

echo.
echo --- Backend setup ---
call :logStep "Ensure backend environment file"
if not exist .env (
  if exist .env.example (
    copy /Y .env.example .env >NUL
    echo [info] Created backend\.env from template.
  ) else (
    echo [fatal] Missing .env and .env.example. Create backend\.env manually.
    goto :backend_fail
  )
)

call :logStep "Install backend npm packages"
echo [step] Installing backend npm packages...
call npm install
if errorlevel 1 (
  echo [fatal] npm install failed in backend. Check logs above.
  goto :backend_fail
)

if "%RESET_DB%"=="1" (
  call :logStep "Reset database (prisma migrate reset)"
  echo [step] Resetting database via Prisma (DROP & recreate)...
  call npx prisma migrate reset --force --skip-generate
  if errorlevel 1 (
    echo [fatal] Prisma migrate reset failed. Verify MySQL service and DATABASE_URL.
    goto :backend_fail
  ) else (
    echo [info] Database reset completed.
  )
) else (
  echo [info] Skipping DB reset (flag noreset detected).
)

call :logStep "Apply Prisma migrations"
echo [step] Running Prisma migrate deploy...
call npx prisma migrate deploy
if errorlevel 1 (
  echo [warn] migrate deploy failed. Trying prisma db push...
  call npx prisma db push
  if errorlevel 1 (
    echo [fatal] Prisma schema sync failed. Verify MySQL connection and credentials.
    goto :backend_fail
  ) else (
    echo [info] prisma db push completed successfully.
  )
) else (
  echo [info] Prisma migrate deploy succeeded.
)

if "%RUN_SEED%"=="1" (
  call :logStep "Seed sample data"
  echo [step] Seeding sample data (seedSemesterAttendance.js)...
  call node scripts\seedSemesterAttendance.js
  if errorlevel 1 (
    echo [warn] Seed script failed. Review logs above.
  ) else (
    echo [info] Seed completed.
  )
) else (
  echo [info] Skipped seeding (flag noseed detected).
)

:backend_done
popd >NUL

echo.
echo --- Frontend setup ---
call :logStep "Install frontend npm packages"
pushd "%ROOT%frontend" >NUL 2>&1
if errorlevel 1 (
  echo [error] Cannot locate frontend folder. Check repo structure.
  set EXIT_CODE=1
  goto :END
)

echo [step] Installing frontend npm packages...
call npm install
if errorlevel 1 (
  echo [fatal] npm install failed in frontend. Review logs above.
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
  echo     (To seed later: cd backend ^&^& node scripts\seedSemesterAttendance.js)
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
set EXIT_CODE=1
set CURRENT_TASK=Install frontend npm packages
popd >NUL
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
set CURRENT_TASK=%~1
goto :EOF
