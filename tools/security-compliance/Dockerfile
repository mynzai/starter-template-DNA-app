FROM node:18-alpine

LABEL maintainer="DNA Template Team"
LABEL description="DNA Security & Compliance Validation Suite"
LABEL version="1.0.0"

# Install security tools and dependencies
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    py3-pip \
    docker-cli \
    wget \
    gnupg \
    && pip3 install safety

# Install Semgrep
RUN pip3 install semgrep

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/reports/security \
    /app/reports/compliance \
    /app/reports/vulnerabilities \
    /app/reports/audit \
    /app/configs \
    /app/database

# Create non-root user for security
RUN addgroup -g 1001 -S dna && \
    adduser -S dna -u 1001

# Set ownership
RUN chown -R dna:dna /app

# Switch to non-root user
USER dna

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/status || exit 1

# Start the application
CMD ["node", "scripts/cli.js", "dashboard", "--port", "8080", "--host", "0.0.0.0"]