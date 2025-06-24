#!/bin/bash

# Development environment setup script for Tauri Native Platform
# This script sets up the development environment for all supported platforms

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CURRENT_OS=$(uname -s)
NODE_VERSION="20"
RUST_VERSION="stable"

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

check_system() {
    log_info "Checking system requirements..."
    
    case $CURRENT_OS in
        "Linux")
            log_info "Detected Linux system"
            check_linux_dependencies
            ;;
        "Darwin")
            log_info "Detected macOS system"
            check_macos_dependencies
            ;;
        "MINGW"*|"MSYS"*|"CYGWIN"*)
            log_info "Detected Windows system"
            check_windows_dependencies
            ;;
        *)
            log_error "Unsupported operating system: $CURRENT_OS"
            exit 1
            ;;
    esac
    
    log_success "System check completed"
}

check_linux_dependencies() {
    log_info "Checking Linux dependencies..."
    
    # Check if running on Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        log_info "Detected Debian/Ubuntu system"
        
        # Check for required system packages
        required_packages=(
            "libwebkit2gtk-4.0-dev"
            "libssl-dev"
            "libgtk-3-dev"
            "libayatana-appindicator3-dev"
            "librsvg2-dev"
            "patchelf"
            "build-essential"
            "curl"
            "wget"
            "file"
        )
        
        missing_packages=()
        for package in "${required_packages[@]}"; do
            if ! dpkg -l | grep -q "$package"; then
                missing_packages+=("$package")
            fi
        done
        
        if [ ${#missing_packages[@]} -gt 0 ]; then
            log_warning "Missing packages: ${missing_packages[*]}"
            log_info "Installing missing packages..."
            sudo apt-get update
            sudo apt-get install -y "${missing_packages[@]}"
        fi
        
    # Check if running on Fedora/RHEL
    elif command -v dnf &> /dev/null; then
        log_info "Detected Fedora/RHEL system"
        
        required_packages=(
            "webkit2gtk4.0-devel"
            "openssl-devel"
            "gtk3-devel"
            "libayatana-appindicator-gtk3-devel"
            "librsvg2-devel"
            "gcc"
            "gcc-c++"
            "make"
            "curl"
            "wget"
            "file"
        )
        
        missing_packages=()
        for package in "${required_packages[@]}"; do
            if ! rpm -q "$package" &> /dev/null; then
                missing_packages+=("$package")
            fi
        done
        
        if [ ${#missing_packages[@]} -gt 0 ]; then
            log_warning "Missing packages: ${missing_packages[*]}"
            log_info "Installing missing packages..."
            sudo dnf install -y "${missing_packages[@]}"
        fi
        
    # Check if running on Arch Linux
    elif command -v pacman &> /dev/null; then
        log_info "Detected Arch Linux system"
        
        required_packages=(
            "webkit2gtk"
            "openssl"
            "gtk3"
            "libayatana-appindicator"
            "librsvg"
            "base-devel"
            "curl"
            "wget"
            "file"
        )
        
        missing_packages=()
        for package in "${required_packages[@]}"; do
            if ! pacman -Q "$package" &> /dev/null; then
                missing_packages+=("$package")
            fi
        done
        
        if [ ${#missing_packages[@]} -gt 0 ]; then
            log_warning "Missing packages: ${missing_packages[*]}"
            log_info "Installing missing packages..."
            sudo pacman -S --needed "${missing_packages[@]}"
        fi
    else
        log_warning "Unknown Linux distribution. Please install required dependencies manually."
        log_info "Required dependencies: webkit2gtk, openssl, gtk3, libayatana-appindicator, librsvg, build tools"
    fi
}

check_macos_dependencies() {
    log_info "Checking macOS dependencies..."
    
    # Check for Xcode Command Line Tools
    if ! xcode-select -p &> /dev/null; then
        log_warning "Xcode Command Line Tools not found"
        log_info "Installing Xcode Command Line Tools..."
        xcode-select --install
        
        log_info "Please complete the Xcode Command Line Tools installation and run this script again."
        exit 1
    fi
    
    # Check for Homebrew
    if ! command -v brew &> /dev/null; then
        log_warning "Homebrew not found"
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    log_success "macOS dependencies check completed"
}

check_windows_dependencies() {
    log_info "Checking Windows dependencies..."
    
    # Check for Visual Studio Build Tools or Visual Studio
    if ! command -v cl &> /dev/null; then
        log_warning "Visual Studio Build Tools not found"
        log_info "Please install Visual Studio Build Tools 2019 or later"
        log_info "Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2019"
        log_info "Make sure to include the C++ build tools and Windows 10 SDK"
    fi
    
    # Check for Windows SDK
    if [ ! -d "/c/Program Files (x86)/Windows Kits/10" ] && [ ! -d "/c/Program Files/Windows Kits/10" ]; then
        log_warning "Windows 10 SDK not found"
        log_info "Please install Windows 10 SDK"
    fi
    
    log_success "Windows dependencies check completed"
}

install_node() {
    log_info "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        current_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$current_version" -ge "$NODE_VERSION" ]; then
            log_success "Node.js $(node --version) is already installed"
            return
        else
            log_warning "Node.js version $current_version is too old (required: $NODE_VERSION+)"
        fi
    fi
    
    log_info "Installing Node.js $NODE_VERSION..."
    
    case $CURRENT_OS in
        "Linux")
            # Use NodeSource repository
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "Darwin")
            # Use Homebrew
            brew install node@${NODE_VERSION}
            ;;
        "MINGW"*|"MSYS"*|"CYGWIN"*)
            log_info "Please install Node.js manually from https://nodejs.org/"
            log_info "Make sure to install version $NODE_VERSION or later"
            exit 1
            ;;
    esac
    
    log_success "Node.js installed successfully"
}

install_rust() {
    log_info "Checking Rust installation..."
    
    if command -v rustc &> /dev/null; then
        log_success "Rust $(rustc --version) is already installed"
        
        # Update to latest stable
        log_info "Updating Rust to latest stable..."
        rustup update stable
    else
        log_info "Installing Rust..."
        
        # Install Rust using rustup
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain $RUST_VERSION
        
        # Source the environment
        source ~/.cargo/env
        
        log_success "Rust installed successfully"
    fi
    
    # Install required Rust targets
    log_info "Installing Rust targets..."
    
    case $CURRENT_OS in
        "Linux")
            rustup target add x86_64-unknown-linux-gnu
            rustup target add aarch64-unknown-linux-gnu
            # For cross-compilation to Windows
            rustup target add x86_64-pc-windows-msvc
            ;;
        "Darwin")
            rustup target add x86_64-apple-darwin
            rustup target add aarch64-apple-darwin
            # For cross-compilation to Windows
            rustup target add x86_64-pc-windows-msvc
            ;;
        "MINGW"*|"MSYS"*|"CYGWIN"*)
            rustup target add x86_64-pc-windows-msvc
            rustup target add i686-pc-windows-msvc
            ;;
    esac
    
    log_success "Rust targets installed"
}

install_tauri_cli() {
    log_info "Checking Tauri CLI installation..."
    
    if command -v tauri &> /dev/null; then
        log_success "Tauri CLI is already installed"
        
        # Update to latest version
        log_info "Updating Tauri CLI..."
        cargo install tauri-cli --locked
    else
        log_info "Installing Tauri CLI..."
        cargo install tauri-cli --locked
        log_success "Tauri CLI installed successfully"
    fi
}

install_additional_tools() {
    log_info "Installing additional development tools..."
    
    # Install cargo-audit for security auditing
    if ! command -v cargo-audit &> /dev/null; then
        log_info "Installing cargo-audit..."
        cargo install cargo-audit --locked
    fi
    
    # Install cargo-watch for development
    if ! command -v cargo-watch &> /dev/null; then
        log_info "Installing cargo-watch..."
        cargo install cargo-watch --locked
    fi
    
    # Install wasm-pack for WebAssembly support
    if ! command -v wasm-pack &> /dev/null; then
        log_info "Installing wasm-pack..."
        cargo install wasm-pack --locked
    fi
    
    # Install cross for cross-compilation (Linux only)
    if [ "$CURRENT_OS" = "Linux" ] && ! command -v cross &> /dev/null; then
        log_info "Installing cross for cross-compilation..."
        cargo install cross --locked
    fi
    
    log_success "Additional tools installed"
}

setup_project() {
    log_info "Setting up project dependencies..."
    
    # Install Node.js dependencies
    log_info "Installing Node.js dependencies..."
    npm install
    
    # Build the project to check everything works
    log_info "Building project to verify setup..."
    npm run build
    
    log_success "Project setup completed"
}

setup_vscode() {
    log_info "Setting up VS Code configuration..."
    
    mkdir -p .vscode
    
    # Create settings.json
    cat > .vscode/settings.json << 'EOF'
{
  "rust-analyzer.cargo.target": "x86_64-unknown-linux-gnu",
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.features": "all",
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.workingDirectories": ["."],
  "files.associations": {
    "*.rs": "rust"
  },
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
EOF
    
    # Create extensions.json
    cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "tauri-apps.tauri-vscode",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
EOF
    
    # Create launch.json for debugging
    cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Tauri Development Debug",
      "cargo": {
        "args": [
          "build",
          "--manifest-path=./src-tauri/Cargo.toml",
          "--no-default-features"
        ],
        "filter": {
          "name": "tauri-native-platform",
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}"
    },
    {
      "type": "lldb",
      "request": "launch",
      "name": "Tauri Production Debug",
      "cargo": {
        "args": [
          "build",
          "--release",
          "--manifest-path=./src-tauri/Cargo.toml"
        ],
        "filter": {
          "name": "tauri-native-platform",
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}"
    }
  ]
}
EOF
    
    log_success "VS Code configuration created"
}

show_summary() {
    log_info "Development Environment Setup Summary"
    echo "========================================="
    echo "Operating System: $CURRENT_OS"
    echo "Node.js: $(node --version 2>/dev/null || echo 'Not found')"
    echo "npm: $(npm --version 2>/dev/null || echo 'Not found')"
    echo "Rust: $(rustc --version 2>/dev/null || echo 'Not found')"
    echo "Cargo: $(cargo --version 2>/dev/null || echo 'Not found')"
    echo "Tauri CLI: $(tauri --version 2>/dev/null || echo 'Not found')"
    echo ""
    echo "Next steps:"
    echo "1. Run 'npm run tauri:dev' to start development server"
    echo "2. Run 'npm run tauri:build' to build for production"
    echo "3. Run './scripts/build-all.sh' to build for all platforms"
    echo "4. Open the project in VS Code for the best development experience"
    echo "========================================="
}

# Main script
main() {
    local setup_vscode_flag="${1:-false}"
    
    echo "🔧 Tauri Native Platform Development Setup"
    echo "==========================================="
    echo "Current OS: $CURRENT_OS"
    echo ""
    
    check_system
    install_node
    install_rust
    install_tauri_cli
    install_additional_tools
    setup_project
    
    if [ "$setup_vscode_flag" = "--vscode" ]; then
        setup_vscode
    fi
    
    show_summary
    
    log_success "Development environment setup completed successfully! 🎉"
    log_info "You can now start developing with 'npm run tauri:dev'"
}

# Run main function with all arguments
main "$@"
