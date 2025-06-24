#!/bin/bash

# Cross-platform build script for Tauri Native Platform
# This script builds the application for all supported platforms

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="tauri-native-platform"
VERSION=$(grep '"version":' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
BUILD_DIR="builds"
CURRENT_OS=$(uname -s)

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if Rust is installed
    if ! command -v rustc &> /dev/null; then
        log_error "Rust is not installed"
        exit 1
    fi
    
    # Check if Tauri CLI is installed
    if ! command -v tauri &> /dev/null; then
        log_warning "Tauri CLI not found, installing..."
        cargo install tauri-cli
    fi
    
    log_success "Prerequisites check passed"
}

setup_environment() {
    log_info "Setting up build environment..."
    
    # Install dependencies
    log_info "Installing Node.js dependencies..."
    npm ci
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Build frontend
    log_info "Building frontend..."
    npm run build
    
    log_success "Environment setup complete"
}

install_rust_targets() {
    log_info "Installing Rust targets..."
    
    case $CURRENT_OS in
        "Linux")
            rustup target add x86_64-unknown-linux-gnu
            rustup target add aarch64-unknown-linux-gnu
            ;;
        "Darwin")
            rustup target add x86_64-apple-darwin
            rustup target add aarch64-apple-darwin
            ;;
        "MINGW"*|"MSYS"*|"CYGWIN"*)
            rustup target add x86_64-pc-windows-msvc
            rustup target add i686-pc-windows-msvc
            ;;
    esac
    
    log_success "Rust targets installed"
}

build_for_target() {
    local target=$1
    local platform=$2
    
    log_info "Building for $platform ($target)..."
    
    # Set target-specific environment variables
    export RUST_TARGET=$target
    
    # Build with target
    if npm run tauri build -- --target $target; then
        log_success "Build completed for $platform"
        
        # Copy artifacts to build directory
        copy_artifacts $target $platform
    else
        log_error "Build failed for $platform"
        return 1
    fi
}

copy_artifacts() {
    local target=$1
    local platform=$2
    local target_dir="src-tauri/target/$target/release/bundle"
    local dest_dir="$BUILD_DIR/$platform"
    
    mkdir -p "$dest_dir"
    
    # Copy platform-specific artifacts
    case $platform in
        "windows")
            if [ -d "$target_dir/msi" ]; then
                cp "$target_dir/msi/"*.msi "$dest_dir/" 2>/dev/null || true
            fi
            if [ -d "$target_dir/nsis" ]; then
                cp "$target_dir/nsis/"*.exe "$dest_dir/" 2>/dev/null || true
            fi
            ;;
        "macos")
            if [ -d "$target_dir/dmg" ]; then
                cp "$target_dir/dmg/"*.dmg "$dest_dir/" 2>/dev/null || true
            fi
            if [ -d "$target_dir/macos" ]; then
                cp -r "$target_dir/macos/"*.app "$dest_dir/" 2>/dev/null || true
            fi
            ;;
        "linux")
            if [ -d "$target_dir/deb" ]; then
                cp "$target_dir/deb/"*.deb "$dest_dir/" 2>/dev/null || true
            fi
            if [ -d "$target_dir/appimage" ]; then
                cp "$target_dir/appimage/"*.AppImage "$dest_dir/" 2>/dev/null || true
            fi
            if [ -d "$target_dir/rpm" ]; then
                cp "$target_dir/rpm/"*.rpm "$dest_dir/" 2>/dev/null || true
            fi
            ;;
    esac
    
    log_info "Artifacts copied to $dest_dir"
}

build_current_platform() {
    log_info "Building for current platform only..."
    
    case $CURRENT_OS in
        "Linux")
            build_for_target "x86_64-unknown-linux-gnu" "linux"
            ;;
        "Darwin")
            # Build for both Intel and Apple Silicon
            build_for_target "x86_64-apple-darwin" "macos-intel"
            build_for_target "aarch64-apple-darwin" "macos-apple-silicon"
            ;;
        "MINGW"*|"MSYS"*|"CYGWIN"*)
            build_for_target "x86_64-pc-windows-msvc" "windows"
            ;;
        *)
            log_error "Unsupported operating system: $CURRENT_OS"
            exit 1
            ;;
    esac
}

build_all_platforms() {
    log_warning "Cross-compilation for all platforms from $CURRENT_OS"
    log_warning "This may require additional setup and may not work on all systems"
    
    # Linux builds
    if command -v cross &> /dev/null; then
        log_info "Using cross for Linux builds"
        build_for_target "x86_64-unknown-linux-gnu" "linux-x86_64"
    else
        log_warning "Cross not found, skipping Linux builds on non-Linux system"
    fi
    
    # macOS builds (only on macOS)
    if [ "$CURRENT_OS" = "Darwin" ]; then
        build_for_target "x86_64-apple-darwin" "macos-intel"
        build_for_target "aarch64-apple-darwin" "macos-apple-silicon"
    else
        log_warning "Skipping macOS builds on non-macOS system"
    fi
    
    # Windows builds
    if [ "$CURRENT_OS" = "Linux" ] || [ "$CURRENT_OS" = "Darwin" ]; then
        if rustup target list --installed | grep -q "x86_64-pc-windows-msvc"; then
            build_for_target "x86_64-pc-windows-msvc" "windows"
        else
            log_warning "Windows target not installed, skipping Windows builds"
        fi
    elif [[ "$CURRENT_OS" == "MINGW"* ]] || [[ "$CURRENT_OS" == "MSYS"* ]]; then
        build_for_target "x86_64-pc-windows-msvc" "windows"
    fi
}

run_tests() {
    log_info "Running tests..."
    
    # Frontend tests
    log_info "Running frontend tests..."
    npm test -- --watchAll=false
    
    # Backend tests
    log_info "Running Rust tests..."
    cd src-tauri && cargo test && cd ..
    
    log_success "All tests passed"
}

run_linting() {
    log_info "Running linting..."
    
    # Frontend linting
    npm run lint
    npm run type-check
    
    # Rust linting
    cd src-tauri && cargo clippy -- -D warnings && cd ..
    cd src-tauri && cargo fmt --check && cd ..
    
    log_success "Linting passed"
}

generate_checksums() {
    log_info "Generating checksums..."
    
    cd "$BUILD_DIR"
    
    for dir in */; do
        if [ -d "$dir" ]; then
            cd "$dir"
            for file in *; do
                if [ -f "$file" ]; then
                    sha256sum "$file" > "$file.sha256"
                    log_info "Generated checksum for $dir$file"
                fi
            done
            cd ..
        fi
    done
    
    cd ..
    log_success "Checksums generated"
}

show_build_summary() {
    log_info "Build Summary"
    echo "==================================="
    echo "App Name: $APP_NAME"
    echo "Version: $VERSION"
    echo "Build Date: $(date)"
    echo "Build Directory: $BUILD_DIR"
    echo ""
    
    if [ -d "$BUILD_DIR" ]; then
        echo "Built artifacts:"
        find "$BUILD_DIR" -type f -name "*" | while read -r file; do
            size=$(du -h "$file" | cut -f1)
            echo "  $file ($size)"
        done
    fi
    
    echo "==================================="
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove temporary files
    rm -rf dist/
    
    # Clean Rust build artifacts (optional)
    if [ "$CLEAN_RUST" = "true" ]; then
        cd src-tauri && cargo clean && cd ..
    fi
    
    log_success "Cleanup complete"
}

# Main script
main() {
    local command="${1:-current}"
    
    echo "🏗️  Tauri Native Platform Build Script"
    echo "======================================"
    echo "Version: $VERSION"
    echo "Current OS: $CURRENT_OS"
    echo ""
    
    case $command in
        "current")
            check_prerequisites
            setup_environment
            install_rust_targets
            run_tests
            run_linting
            build_current_platform
            generate_checksums
            show_build_summary
            ;;
        "all")
            check_prerequisites
            setup_environment
            install_rust_targets
            run_tests
            run_linting
            build_all_platforms
            generate_checksums
            show_build_summary
            ;;
        "test")
            check_prerequisites
            setup_environment
            run_tests
            run_linting
            ;;
        "clean")
            cleanup
            ;;
        "help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  current   Build for current platform only (default)"
            echo "  all       Build for all supported platforms"
            echo "  test      Run tests and linting only"
            echo "  clean     Clean build artifacts"
            echo "  help      Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  CLEAN_RUST=true    Clean Rust build artifacts during cleanup"
            echo "  SKIP_TESTS=true    Skip running tests"
            echo "  SKIP_LINT=true     Skip running linting"
            ;;
        *)
            log_error "Unknown command: $command"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    log_success "Build script completed successfully! 🎉"
}

# Run main function with all arguments
main "$@"
