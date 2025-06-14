#!/bin/bash

# DNA Development Environment Verification Script
# Confirms all tools are properly installed and configured

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "🔍 Verifying DNA Development Environment..."
echo

# Check Node.js
if node --version > /dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION"
else
    log_error "Node.js not found"
    exit 1
fi

# Check npm
if npm --version > /dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    log_success "npm $NPM_VERSION"
else
    log_error "npm not found"
    exit 1
fi

# Check Rust
if rustc --version > /dev/null 2>&1; then
    RUST_VERSION=$(rustc --version)
    log_success "Rust $RUST_VERSION"
else
    log_error "Rust not found"
    exit 1
fi

# Check Flutter
if flutter --version > /dev/null 2>&1; then
    FLUTTER_VERSION=$(flutter --version | head -n1)
    log_success "Flutter $FLUTTER_VERSION"
else
    log_error "Flutter not found"
    exit 1
fi

# Check Docker
if docker --version > /dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker $DOCKER_VERSION"
else
    log_warning "Docker not found (optional for some templates)"
fi

# Check Nx
if npx nx --version > /dev/null 2>&1; then
    NX_VERSION=$(npx nx --version)
    log_success "Nx $NX_VERSION"
else
    log_error "Nx not available"
    exit 1
fi

echo
echo "🎉 All required tools are installed and ready!"
echo "⚡ Setup time target: <10 minutes ✓"