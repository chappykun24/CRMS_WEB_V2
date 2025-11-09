@echo off
REM Windows Batch Script for Running Migration
REM Usage: run_migration.bat [--dry-run] [--step=complete|1|2]

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Database Migration Script
echo ========================================
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "MIGRATION_SCRIPT=%SCRIPT_DIR%run_migration.js"

REM Build command
set "CMD=node "%MIGRATION_SCRIPT%""

REM Parse arguments
set "STEP=complete"
set "DRY_RUN="

:parse_args
if "%~1"=="" goto :run
if "%~1"=="--dry-run" (
    set "DRY_RUN=--dry-run"
    shift
    goto :parse_args
)
if "%~1"=="--step=1" (
    set "STEP=1"
    shift
    goto :parse_args
)
if "%~1"=="--step=2" (
    set "STEP=2"
    shift
    goto :parse_args
)
if "%~1"=="--step=complete" (
    set "STEP=complete"
    shift
    goto :parse_args
)
shift
goto :parse_args

:run
if defined DRY_RUN (
    set "CMD=%CMD% %DRY_RUN%"
)
set "CMD=%CMD% --step=%STEP%"

echo Executing: %CMD%
echo.

%CMD%

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Migration completed successfully!
    exit /b 0
) else (
    echo.
    echo [ERROR] Migration failed with exit code: %errorlevel%
    exit /b %errorlevel%
)

