# Operational Guidelines

## Coding Standards

- **Languages:** TypeScript strict mode, Rust with Clippy, Dart analysis
- **Formatting:** Prettier, rustfmt, dart format
- **Linting:** ESLint, Clippy, dart analyze

## Testing Strategy

- **Coverage:** 80%+ test coverage required
- **Types:** Unit, integration, E2E with Playwright
- **Framework-specific:** Flutter widget tests, React Native Detox

## Error Handling

- **Approach:** Structured error types with context
- **Logging:** JSON structured logs with correlation IDs
- **Recovery:** Graceful degradation with user feedback

## Security Best Practices

- **Dependencies:** Automated vulnerability scanning
- **Secrets:** Environment variables, no hardcoded credentials
- **Validation:** Input sanitization at boundaries
- **Authentication:** JWT with refresh tokens, OAuth 2.0
