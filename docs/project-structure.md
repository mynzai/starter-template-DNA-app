# Project Structure

## Monorepo Layout

```
starter-template-dna-app/
├── packages/
│   ├── cli/                 # DNA CLI tool
│   ├── core/               # Template engine core
│   ├── templates/          # Template definitions
│   │   ├── ai-saas/        # AI SaaS platform template
│   │   ├── flutter-business/ # Flutter universal template
│   │   └── performance-api/ # High-performance API template
│   ├── dna-modules/        # Reusable DNA components
│   │   ├── auth/           # Authentication modules
│   │   ├── payments/       # Payment processing
│   │   ├── ai/            # AI integration modules
│   │   └── real-time/     # Real-time communication
│   └── shared/            # Shared utilities and types
├── tools/                 # Build and development tools
├── docs/                  # Documentation and guides
└── examples/             # Generated template examples
```

## Template Structure

Generated templates follow consistent organization with framework-specific
adaptations.
