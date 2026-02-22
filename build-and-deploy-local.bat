@echo off
REM Build local APK and deploy to Android device/emulator
REM Usage: build-and-deploy-local.bat [mobile|mandate] [debug|release] [deploy]
REM Example: build-and-deploy-local.bat mobile release deploy

set APP=%1
if "%APP%"=="" set APP=mobile

set VARIANT=%2
if "%VARIANT%"=="" set VARIANT=release

set DEPLOY=%3

cd /d "%~dp0"

if "%DEPLOY%"=="deploy" (
    powershell -ExecutionPolicy Bypass -File ".\build-and-deploy-local.ps1" -App %APP% -Variant %VARIANT% -Deploy
) else (
    powershell -ExecutionPolicy Bypass -File ".\build-and-deploy-local.ps1" -App %APP% -Variant %VARIANT%
)

pause
