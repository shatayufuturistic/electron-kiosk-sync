@echo off
setlocal enabledelayedexpansion

:: Release Helper Script for Shatayu Sync (Windows)
:: Usage: scripts\release.bat [patch|minor|major]

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: Function to print colored output (simulated with echo)
call :print_status "🚀 Shatayu Sync Release Helper"
echo.

:: Check arguments
if "%1"=="" (
    call :print_error "Usage: %0 [patch|minor|major]"
    echo.
    echo Examples:
    echo   %0 patch   # 1.0.0 -^> 1.0.1
    echo   %0 minor   # 1.0.0 -^> 1.1.0
    echo   %0 major   # 1.0.0 -^> 2.0.0
    exit /b 1
)

set "version_type=%1"

if not "%version_type%"=="patch" if not "%version_type%"=="minor" if not "%version_type%"=="major" (
    call :print_error "Invalid version type. Use: patch, minor, or major"
    exit /b 1
)

:: Pre-flight checks
call :print_status "Running pre-flight checks..."

:: Check if git is clean
git status --porcelain > nul 2>&1
if errorlevel 1 (
    call :print_error "Git is not available or this is not a git repository"
    exit /b 1
)

for /f %%i in ('git status --porcelain') do (
    call :print_error "Git working directory is not clean. Please commit or stash your changes."
    git status --short
    exit /b 1
)

:: Get current version
for /f "delims=" %%i in ('node -p "require('./package.json').version"') do set "current_version=%%i"
call :print_status "Current version: !current_version!"

:: Bump version
call :print_status "Bumping %version_type% version..."
npm version %version_type% --no-git-tag-version

:: Get new version
for /f "delims=" %%i in ('node -p "require('./package.json').version"') do set "new_version=%%i"
call :print_success "Version bumped to: !new_version!"

:: Confirm release
echo.
call :print_warning "This will:"
echo   1. Commit the version bump
echo   2. Create and push tag v!new_version!
echo   3. Trigger GitHub Actions to build and release
echo.
set /p "confirm=Continue with release? (y/N): "

if /i not "!confirm!"=="y" (
    call :print_error "Aborted. Reverting version bump..."
    git checkout -- package.json package-lock.json
    exit /b 1
)

:: Commit version bump
call :print_status "Committing version bump..."
git add package.json package-lock.json
git commit -m "chore: bump version to !new_version!"

:: Create and push tag
call :print_status "Creating and pushing tag v!new_version!..."
git tag "v!new_version!"
git push origin "v!new_version!"
git push

call :print_success "🎉 Release v!new_version! has been triggered!"
echo.
call :print_status "Monitor the release progress at:"
echo   https://github.com/shatayufuturistic/electron-kiosk-sync/actions
echo.
call :print_status "Release will be available at:"
echo   https://github.com/shatayufuturistic/electron-kiosk-sync/releases

exit /b 0

:: Helper functions
:print_status
echo %BLUE%[INFO]%NC% %~1
exit /b

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
exit /b

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
exit /b

:print_error
echo %RED%[ERROR]%NC% %~1
exit /b