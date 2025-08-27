# Multi-stage build for optimal production image size
FROM rust:1.75-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifest files
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build dependencies first (for better Docker layer caching)
RUN mkdir src/bin && echo 'fn main() {}' > src/bin/dummy.rs
RUN cargo build --release --bin dummy
RUN rm -rf src/bin

# Build the actual application with optimizations
ENV RUSTFLAGS="-C target-cpu=native"
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create app directory
WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/target/release/{{projectName}} ./{{projectName}}

# Copy configuration files
COPY config/ ./config/

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose ports
EXPOSE 3000 8080 9090

# Performance optimizations
ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

# Set resource limits
ENV MALLOC_ARENA_MAX=2
ENV MALLOC_MMAP_THRESHOLD_=131072
ENV MALLOC_TRIM_THRESHOLD_=131072
ENV MALLOC_TOP_PAD_=131072
ENV MALLOC_MMAP_MAX_=65536

# Run the application
CMD ["./{{projectName}}"]