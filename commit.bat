@echo off
echo.
echo === Sidekick Chrome Extension - Quick Commit ===
echo.

REM Add all changes
git add .

REM Prompt for commit message
set /p message=Enter commit message: 

REM If no message provided, use default
if "%message%"=="" set message=Update extension files

REM Commit changes
git commit -m "%message%"

echo.
echo Committed with message: "%message%"
echo.

REM Ask if user wants to push
set /p push=Push to origin? (y/n): 
if /i "%push%"=="y" (
    git push origin master
    echo.
    echo Pushed to origin/master
) else (
    echo.
    echo Skipped push
)

echo.
pause