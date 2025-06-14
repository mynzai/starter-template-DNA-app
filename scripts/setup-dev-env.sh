#!/bin/bash

# Starter Template DNA App - Development Environment Setup
# This script installs all required tools for DNA development in <5 minutes

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version requirement (20.x LTS)
check_node() {
    log_info "Checking Node.js installation..."
    
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 20 ]; then
            log_success "Node.js $(node --version) is installed and compatible"
            return 0
        else
            log_warning "Node.js version $(node --version) is too old. Minimum required: v20.x"
            return 1
        fi
    else
        log_warning "Node.js is not installed"
        return 1
    fi
}

# Install Node.js 20.x LTS
install_node() {
    log_info "Installing Node.js 20.x LTS..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install node@20
            brew link node@20 --force
        else
            log_error "Homebrew not found. Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        log_error "Unsupported operating system. Please install Node.js 20.x manually."
        exit 1
    fi
    
    log_success "Node.js installed successfully"
}

# Check Rust installation
check_rust() {
    log_info "Checking Rust installation..."
    
    if command_exists rustc; then
        RUST_VERSION=$(rustc --version | awk '{print $2}' | cut -d'.' -f1,2)
        log_success "Rust $RUST_VERSION is installed"
        return 0
    else
        log_warning "Rust is not installed"
        return 1
    fi
}

# Install Rust 1.75.x
install_rust() {
    log_info "Installing Rust 1.75.x..."
    
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    
    # Install required targets
    rustup target add wasm32-unknown-unknown
    rustup target add x86_64-pc-windows-msvc
    rustup target add aarch64-apple-darwin
    
    # Install useful tools
    cargo install cargo-watch
    cargo install cargo-audit
    
    log_success "Rust installed successfully"
}

# Check Flutter/Dart installation
check_flutter() {
    log_info "Checking Flutter installation..."
    
    if command_exists flutter; then
        FLUTTER_VERSION=$(flutter --version | head -n1 | awk '{print $2}')
        log_success "Flutter $FLUTTER_VERSION is installed"
        return 0
    else
        log_warning "Flutter is not installed"
        return 1
    fi
}

# Install Flutter 3.16.x
install_flutter() {
    log_info "Installing Flutter 3.16.x..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install --cask flutter
        else
            # Manual installation
            cd ~/development
            git clone https://github.com/flutter/flutter.git -b stable
            echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.bashrc
            echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.zshrc
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        cd ~/development
        git clone https://github.com/flutter/flutter.git -b stable
        echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.bashrc
    fi
    
    # Configure Flutter
    flutter config --enable-web
    flutter config --enable-macos-desktop
    flutter config --enable-linux-desktop
    flutter config --enable-windows-desktop
    
    log_success "Flutter installed successfully"
}

# Check Docker installation
check_docker() {
    log_info "Checking Docker installation..."
    
    if command_exists docker; then
        log_success "Docker is installed"
        return 0
    else
        log_warning "Docker is not installed"
        return 1
    fi
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install --cask docker
        else
            log_error "Please install Docker Desktop manually from https://docker.com/products/docker-desktop"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        sudo usermod -aG docker "$USER"
    fi
    
    log_success "Docker installed successfully"
}

# Install project dependencies
install_dependencies() {
    log_info "Installing project dependencies..."
    
    # Install npm dependencies
    npm install
    
    # Install global tools
    npm install -g @nx/cli
    npm install -g prettier
    npm install -g eslint
    
    log_success "Dependencies installed successfully"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    # Check versions
    echo "=== Installed Versions ==="
    node --version
    npm --version
    rustc --version
    flutter --version | head -n1
    docker --version
    echo "=========================="
    
    # Run basic checks
    log_info "Running basic checks..."
    
    # Check if Nx workspace is working
    if nx --version > /dev/null 2>&1; then
        log_success "Nx workspace is working"
    else
        log_error "Nx workspace check failed"
        exit 1
    fi
    
    # Check if Flutter is working
    if flutter doctor --machine > /dev/null 2>&1; then
        log_success "Flutter is working"
    else
        log_warning "Flutter doctor found issues. Run 'flutter doctor' for details"
    fi
    
    log_success "All tools verified successfully!"
}

# Main setup function
main() {
    log_info "Starting DNA Development Environment Setup..."
    log_info "This will install: Node.js 20.x, Rust 1.75.x, Flutter 3.16.x, Docker"
    
    # Create development directory
    mkdir -p ~/development
    
    # Check and install Node.js
    if ! check_node; then
        install_node
    fi
    
    # Check and install Rust
    if ! check_rust; then
        install_rust
    fi
    
    # Check and install Flutter
    if ! check_flutter; then
        install_flutter
    fi
    
    # Check and install Docker
    if ! check_docker; then
        install_docker
    fi
    
    # Install project dependencies
    install_dependencies
    
    # Verify everything is working
    verify_installation
    
    log_success "DNA Development Environment setup completed successfully!"
    log_info "You can now run: npm run build, npm run test, npm run lint"
    log_info "To start developing, run: nx serve <app-name>"
}

# Run main function
main "$@"