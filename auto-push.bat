@echo off
REM Auto-commit and push script for Sidekick Extension
REM This script will find git and commit/push changes

echo.
echo === Sidekick Extension - Auto Commit ===
echo.

REM Try to find git in common locations
set GIT_CMD=git
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Git not in PATH, searching for git.exe...
    
    REM Check Program Files
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
        echo Found git at: %GIT_CMD%
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe"
        echo Found git at: %GIT_CMD%
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
        echo Found git at: %GIT_CMD%
    ) else (
        echo ERROR: Git not found! Please install Git or use GitHub Desktop.
        pause
        exit /b 1
    )
)

echo.
echo Adding all changes...
"%GIT_CMD%" add .

echo.
echo Committing changes...
"%GIT_CMD%" commit -m "Fix floating button scrolling issue - use setProperty with important flag"

echo.
echo Pushing to origin...
"%GIT_CMD%" push origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Successfully pushed to GitHub!
) else (
    echo.
    echo ❌ Push failed. Please check your git configuration.
)

echo.
pause
