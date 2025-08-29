#!/bin/bash

# Release Helper Script for Shatayu Sync
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if git is clean
check_git_clean() {
    if [ -n "$(git status --porcelain)" ]; then
        print_error "Git working directory is not clean. Please commit or stash your changes."
        git status --short
        exit 1
    fi
}

# Check if we're on main branch
check_main_branch() {
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
        print_warning "You're not on the main branch (currently on: $current_branch)"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Aborted."
            exit 1
        fi
    fi
}

# Get current version from package.json
get_current_version() {
    node -p "require('./package.json').version"
}

# Bump version in package.json
bump_version() {
    local version_type=$1
    npm version $version_type --no-git-tag-version
}

# Main script
main() {
    print_status "🚀 Shatayu Sync Release Helper"
    echo

    # Check arguments
    if [ $# -eq 0 ]; then
        print_error "Usage: $0 [patch|minor|major]"
        echo
        echo "Examples:"
        echo "  $0 patch   # 1.0.0 -> 1.0.1"
        echo "  $0 minor   # 1.0.0 -> 1.1.0"
        echo "  $0 major   # 1.0.0 -> 2.0.0"
        exit 1
    fi

    local version_type=$1

    if [[ ! "$version_type" =~ ^(patch|minor|major)$ ]]; then
        print_error "Invalid version type. Use: patch, minor, or major"
        exit 1
    fi

    # Pre-flight checks
    print_status "Running pre-flight checks..."
    check_git_clean
    check_main_branch

    # Get current version
    current_version=$(get_current_version)
    print_status "Current version: $current_version"

    # Bump version
    print_status "Bumping $version_type version..."
    bump_version $version_type

    # Get new version
    new_version=$(get_current_version)
    print_success "Version bumped to: $new_version"

    # Confirm release
    echo
    print_warning "This will:"
    echo "  1. Commit the version bump"
    echo "  2. Create and push tag v$new_version"
    echo "  3. Trigger GitHub Actions to build and release"
    echo
    read -p "Continue with release? (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Aborted. Reverting version bump..."
        git checkout -- package.json package-lock.json
        exit 1
    fi

    # Commit version bump
    print_status "Committing version bump..."
    git add package.json package-lock.json
    git commit -m "chore: bump version to $new_version"

    # Create and push tag
    print_status "Creating and pushing tag v$new_version..."
    git tag "v$new_version"
    git push origin "v$new_version"
    git push

    print_success "🎉 Release v$new_version has been triggered!"
    echo
    print_status "Monitor the release progress at:"
    echo "  https://github.com/shatayufuturistic/electron-kiosk-sync/actions"
    echo
    print_status "Release will be available at:"
    echo "  https://github.com/shatayufuturistic/electron-kiosk-sync/releases"
}

# Run main function with all arguments
main "$@"