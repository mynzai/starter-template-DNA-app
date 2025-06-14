# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude AI Assistant Guide for Starter Template DNA App

## Custom IDE Commands

IMPORTANT: This repository uses custom commands defined in `.claude/commands/`.
When users type these commands, IMMEDIATELY follow the instructions in the
corresponding command file:

- `/ide-agent <agent-name>` - Switch to an IDE agent persona (see
  `.claude/commands/ide-agent.md`)
- `/exit-agent` or `/exit` - Return to default Claude Code mode

When a custom command is used:

1. IMMEDIATELY read the command file
2. Follow the instructions exactly as written
3. Do NOT ask for clarification or additional information unless the command
   file says to

## Project Overview

The **Starter Template DNA App** is an AI-native template generation ecosystem
designed to eliminate development friction while establishing production-ready
foundations. This is a comprehensive toolkit that reduces developer setup time
from 40-80 hours to under 10 minutes through intelligent, modular starter
templates with built-in AI capabilities, comprehensive testing, and
anti-technical debt mechanisms.

### Key Project Goals

- Launch 20 essential template combinations covering AI-native architectures,
  performance-critical solutions, and cross-platform applications
- Achieve <10 minute setup time with 80%+ test coverage and security-first
  design
- Establish market leadership in AI-first development patterns
- Create modular "DNA" architecture enabling intelligent template composition

## Architecture & Technology Stack

### Primary Framework Strategy

- **Flutter** (Priority): Leverage 5/5 testing ecosystem leadership for maximum
  template quality
- **React Native**: Enterprise mobile development with mature JavaScript
  ecosystem
- **Next.js**: AI-native web applications and SaaS platforms
- **Tauri**: Performance-critical desktop applications (2.5-3MB vs 80-120MB
  Electron)
- **SvelteKit**: Data visualization and performance web applications

### Core Technologies

- **Languages**: TypeScript 5.3.x, Rust 1.75.x, Dart 3.2.x
- **Runtime**: Node.js 20.x LTS, Bun 1.0.x (performance-critical)
- **Monorepo**: Nx 17.x for workspace management
- **Databases**: PostgreSQL 15.x, Redis 7.2.x
- **Vector Databases**: Pinecone (managed), Weaviate (self-hosted)
- **Cloud**: AWS (primary) with CDK for Infrastructure as Code
- **AI Libraries**: LangChain.js, OpenAI SDK, Anthropic SDK

### DNA Module System

The core innovation is a **modular DNA architecture** with pluggable components:

- **Authentication DNA**: OAuth, JWT, session-based, biometric
- **Payment DNA**: Stripe, PayPal, cryptocurrency
- **AI Integration DNA**: Multi-LLM providers, vector databases, RAG, streaming
- **Real-time DNA**: WebSocket, WebRTC, Server-Sent Events
- **Security DNA**: Security-first patterns, vulnerability scanning, compliance
- **Testing DNA**: Framework-specific comprehensive testing setups

## Monorepo Architecture & Key Patterns

### Project Structure Overview

This is an **Nx monorepo** with the following key structure:

```
├── apps/
│   ├── cli-tool/           # Main CLI application for template generation
│   ├── docs-site/          # Documentation website
│   └── quality-dashboard/  # Quality metrics dashboard
├── libs/
│   ├── core/              # Core DNA engine and template system
│   │   └── src/lib/ai/    # ★ NEW: AI integration framework (Epic 2)
│   ├── testing/           # Comprehensive testing framework
│   ├── dna-modules/       # Reusable DNA module implementations
│   │   ├── ai/            # AI-specific modules (OpenAI, Anthropic, etc.)
│   │   ├── auth/          # Authentication modules (JWT, OAuth, etc.)
│   │   ├── payments/      # Payment modules (Stripe, PayPal, etc.)
│   │   └── ...           # Other domain modules
│   └── types/            # Shared TypeScript definitions
├── stories/              # Epic and story definitions (project roadmap)
└── docs/                # Technical documentation
```

### Key Architectural Components

**1. DNA Module System** (`libs/core/src/lib/`):
- `dna-registry.ts` - Central module registry and discovery
- `dna-composer.ts` - Module composition and conflict resolution  
- `template-generation-pipeline.ts` - 8-stage unified generation pipeline
- `template-instantiation-engine.ts` - File processing and project creation

**2. AI Integration Framework** (`libs/core/src/lib/ai/`):
- `llm-provider.ts` - Unified provider abstraction
- `ai-service.ts` - Service orchestration with load balancing
- `providers/` - OpenAI, Anthropic, Ollama implementations
- `cost-tracking/` - Usage monitoring and budget enforcement
- `rate-limiting/` - Token bucket and sliding window algorithms
- `streaming/` - Robust stream handling with reconnection logic

**3. CLI System** (`apps/cli-tool/src/`):
- `commands/` - CLI command implementations
- `lib/` - Core CLI logic and utilities
- Integration with template generation pipeline
- Progress tracking and session management

**4. Testing Infrastructure** (`libs/testing/src/lib/`):
- Framework-agnostic testing abstractions
- Quality gate validation
- Automated test generation
- Coverage reporting and metrics

### Cross-Cutting Patterns

**Event-Driven Architecture**: Most components use EventEmitter for real-time feedback
**Pipeline Pattern**: Template generation uses 8-stage pipeline with progress tracking
**Plugin Architecture**: DNA modules are pluggable components with standardized interfaces
**Multi-Provider Pattern**: AI services support multiple providers with automatic failover
**Composition over Inheritance**: DNA modules compose rather than extend

## Development Workflow

### Epic Implementation Order

1. **Epic 1 (Foundation)**: Template engine, DNA architecture, testing
   infrastructure
2. **Epic 2 (AI Templates)**: AI-powered SaaS, development tools, business apps,
   mobile assistants
3. **Epic 3 (Performance)**: Real-time collaboration, high-performance APIs,
   data visualization
4. **Epic 4 (Cross-Platform)**: Flutter universal, React Native hybrid, modern
   Electron
5. **Epic 5 (DNA Modules)**: Authentication, payments, real-time communication
   modules
6. **Epic 6 (Developer Experience)**: Documentation, CI/CD, quality validation

### Story Implementation Process

1. Read story file (`stories/epic-X/epic-X-story-Y.md`)
2. Check dependencies in story header
3. Reference technical docs as specified
4. Follow acceptance criteria exactly
5. Update story status and completion notes

## ⚡ MANDATORY Progress Tracking & Testing Protocol

**CRITICAL**: ALWAYS follow this protocol for ALL development work. Epic 1 Story 5 established comprehensive tracking and testing systems that MUST be used consistently.

### Before Starting ANY Story/Epic:

```bash
# 1. Start progress tracking session
dna-cli track start --type=feature --epic=epic-X --story=epic-X-story-Y --notes="Initial story setup"

# 2. Verify testing system is functional
npm test

# 3. Check current quality gates status
dna-cli track status
```

### During Development (CONTINUOUS):

```bash
# Update progress regularly (every 30-60 minutes)
# NOTE: If dna-cli is not built, use manual tracking in .dna-current-session.json
dna-cli track progress --files-modified=X --tests-added=Y --coverage=Z --notes="Current progress update"

# Run tests frequently to catch issues early
npx nx test testing         # For basic functionality
npx nx test core           # For core library changes  
npx nx test cli-tool       # For CLI functionality
npm test                   # Run all tests

# Use the integrated pipeline for template generation
# (Always use template-generation-pipeline.ts for any template work)
```

### Quality Gates Validation (BEFORE COMPLETION):

```bash
# 1. Run comprehensive test suite
npm test

# 2. Validate performance targets
# - Generation time: <10 minutes for complex templates
# - Memory usage: <200MB peak
# - Test coverage: >80%

# 3. Check integration points
# - CLI → DNA Engine integration
# - Template → Quality validation
# - Error handling consistency

# 4. Update final metrics
dna-cli track progress --quality-gates-status=passed --coverage=XX
```

### End Session (MANDATORY):

```bash
# End tracking session with final status
# NOTE: If dna-cli is not built, manually update .dna-current-session.json with final status
dna-cli track end --status=completed --quality-gates-status=passed --notes="Story completed with all ACs fulfilled"

# Generate session report (if CLI available)
dna-cli track report --format=md --output=session-report.md
```

### Testing System Usage:

**IMPORTANT**: Testing system has been fixed for basic functionality. Some import path issues may remain for complex tests.

1. **Basic Tests**: Use for fundamental functionality validation
   - File: `libs/testing/src/lib/__tests__/basic.test.ts`
   - Run: `npx nx test testing --testNamePattern="should be able to run basic tests"`

2. **Integration Tests**: Use for complete workflow validation  
   - File: `apps/cli-tool/src/__tests__/integration/`
   - Run: `npx nx test cli-tool` (may have import issues - check output)

3. **Core Library Tests**: Use for core functionality validation
   - File: `libs/core/src/lib/__tests__/`
   - Run: `npx nx test core` (may have import issues - check output)

4. **Framework-specific Tests**: Each framework has dedicated test suites
   - Files: Various `*.test.ts` files throughout the codebase
   - Run: `npm test` for all or `npx nx test <project>` for specific

### Pipeline Integration Usage:

**ALWAYS use the Template Generation Pipeline for ANY template-related work:**

```typescript
import { TemplateGenerationPipeline, DNARegistry, TemplateInstantiationEngine } from '@starter-template-dna/core';

// Initialize pipeline with monitoring
const pipeline = new TemplateGenerationPipeline(registry, engine, {
  enableParallelProcessing: true,
  enableCaching: true,
  enableProgressiveValidation: true
});

// Set up event listeners for real-time feedback
pipeline.on('stage:started', ({ stage }) => { /* track progress */ });
pipeline.on('pipeline:completed', ({ result, metrics }) => { /* update tracking */ });

// Generate with comprehensive validation
const result = await pipeline.generate(request);
```

### Conflict Resolution Protocol:

When encountering module conflicts, ALWAYS use the conflict resolution system:

```typescript
import { ConflictResolver } from '../lib/conflict-resolver';

const resolver = new ConflictResolver(dnaRegistry);
const { resolution, updatedModules } = await resolver.resolveConflicts(
  moduleId, 
  selectedModules, 
  interactive = true
);
```

### NEVER Skip These Steps:

- ❌ **NEVER** start development without tracking session
- ❌ **NEVER** commit without running tests
- ❌ **NEVER** use direct template generation (always use pipeline)
- ❌ **NEVER** ignore quality gates failures
- ❌ **NEVER** end session without completion metrics

### Session Tracking Files:

- `.dna-sessions.json` - Historical session data
- `.dna-current-session.json` - Active session state
- `progress-session.md` - Manual tracking backup
- `session-report.md` - Generated completion reports

This protocol ensures consistency, quality, and progress visibility across all development work.

### Key Reference Documents

- `docs/project-structure.md` - Monorepo layout
- `docs/tech-stack.md` - Technology choices
- `docs/operational-guidelines.md` - Coding standards
- `docs/ai-saas-ui-spec.md` - AI template UI specifications
- `docs/front-end-project-structure.md` - Frontend organization
- `docs/api-reference.md` - API composition patterns
- `progress-tracking.md` - Development session progress tracking system
- `comprehensive-testing-framework.md` - Zero technical debt testing framework

## AI Integration Architecture (Epic 2 Implementation)

### Foundation AI Integration System

The project now includes a comprehensive AI integration framework implemented in `libs/core/src/lib/ai/`:

**Core Components:**
- **LLMProvider Interface** (`llm-provider.ts`) - Unified abstraction for all AI providers
- **AIService** (`ai-service.ts`) - Service orchestration with load balancing and failover
- **Cost Tracking** (`cost-tracking/`) - Real-time usage monitoring and budget enforcement
- **Rate Limiting** (`rate-limiting/`) - Token bucket and sliding window algorithms
- **Streaming Support** (`streaming/`) - Robust stream handling with reconnection logic

**Provider Implementations:**
- **OpenAI Provider** (`providers/openai-provider.ts`) - Full OpenAI API integration
- **Anthropic Provider** (`providers/anthropic-provider.ts`) - Claude model support
- **Ollama Provider** (`providers/ollama-provider.ts`) - Local model integration

### AI Integration Usage Patterns

```typescript
// Initialize AI service with multiple providers
import { AIService, OpenAIProvider, AnthropicProvider, CostTracker, ProviderRateLimitManager } from '@dna/core';

const aiService = new AIService({
  defaultProvider: 'openai',
  fallbackProviders: ['anthropic', 'ollama'],
  loadBalancing: {
    strategy: 'cost-optimized', // or 'latency-optimized', 'round-robin'
    enableFailover: true,
    maxRetries: 3
  }
});

// Register providers
aiService.registerProvider(new OpenAIProvider(openaiConfig));
aiService.registerProvider(new AnthropicProvider(anthropicConfig));

// Initialize and use
await aiService.initialize();
const response = await aiService.generate({
  prompt: "Your prompt here",
  options: { maxTokens: 1000, temperature: 0.7 }
});

// Streaming support
const stream = await aiService.generateStream(request);
for await (const chunk of stream) {
  console.log(chunk.delta); // Real-time content
}
```

### Multi-Provider Architecture

- **Unified API** across OpenAI, Anthropic, and local models (Ollama)
- **Automatic failover** with configurable fallback chains
- **Load balancing** strategies: cost-optimized, latency-optimized, round-robin
- **Real-time cost tracking** with budget alerts and usage analytics
- **Comprehensive rate limiting** preventing API overuse and cost runaway
- **Streaming response handling** with error recovery and reconnection logic

### Security & Compliance

- **Input sanitization** for LLM prompts and output validation
- **Rate limiting** with token bucket and sliding window algorithms
- **Cost enforcement** with real-time budget monitoring and alerts  
- **Error handling** with structured error types and recovery strategies
- **Configuration management** for secure API key and endpoint handling

## Quality Standards

### Testing Requirements

- **80% minimum code coverage** across all templates
- Framework-specific testing optimization:
  - Flutter: Widget testing, golden file visual regression, integration tests
  - React Native: Jest + Detox for complete coverage
  - Web: Playwright for modern testing architecture
  - Tauri: Hybrid Rust + web testing approach

### Performance Targets

- Template generation: <10 minutes
- AI responses: <3 seconds first token
- Hot reload: <3 seconds
- Build performance: <5 minutes for complex templates

### Security Standards

- Zero critical security vulnerabilities
- Automated security scanning with Snyk
- Security-first default configurations
- Comprehensive secret management

## Development Environment Setup

### Essential Tools

1. **Monorepo Tools**: Nx for workspace management
2. **Shared Configs**: ESLint, Prettier, TypeScript
3. **Testing**: Jest, Playwright, framework-specific tools
4. **CI/CD**: GitHub Actions with quality gates

### Essential Development Commands

```bash
# Build and Development
npm run build                    # Build all projects in monorepo
npm run test                     # Run all tests
npm run lint                     # Lint all projects
npm run typecheck               # TypeScript type checking
npm run format                 # Format code with Prettier

# Nx-specific commands (for fine-grained control)
npx nx build cli-tool           # Build specific project
npx nx test testing             # Test specific library
npx nx run-many -t test         # Run tests for all projects
npx nx graph                    # Show dependency graph

# Template Generation (once CLI is built)
npm run build && node apps/cli-tool/dist/main.js create --template=ai-saas --framework=nextjs
npm run build && node apps/cli-tool/dist/main.js list --templates
npm run build && node apps/cli-tool/dist/main.js validate --path=./generated-project

# Development Environment Setup
npm install                     # Install dependencies
npm run setup-dev-env          # Development environment setup
npm run validate-templates     # Validate template configurations
npm run generate-docs          # Generate documentation

# Testing Commands (granular)
npx nx test testing --testNamePattern="should be able to run basic tests"
npx nx test cli-tool --watch    # Watch mode for specific project
npm run test:integration        # Run integration tests (if available)
npm run test:smoke             # Run smoke tests (if available)
npm run test:stress            # Run stress tests (if available)
```

## Coding Standards

### Language-Specific Conventions

- **TypeScript**: Strict mode, no `any` types, async/await patterns
- **Rust**: Zero `unsafe` code in DNA modules, `Result<T, E>` error handling
- **Dart**: Null safety enabled, Riverpod state management patterns

### File Organization

- Variables: `camelCase` (TS/Dart), `snake_case` (Rust)
- Classes: `PascalCase` (all languages)
- Files: `kebab-case.ts`, `snake_case.rs`, `snake_case.dart`
- DNA Modules: `kebab-case` directories, `PascalCase` classes

### Testing Structure

- TypeScript: `*.test.ts` co-located with source
- Rust: `tests/` directory + `#[cfg(test)]` for units
- Dart: `test/` directory mirroring `lib/` structure

## AI Assistant Guidelines

### When Working on This Project

1. **Always prioritize AI-native patterns** - This project is specifically
   designed for AI-first development
2. **Follow DNA module architecture** - Ensure new components fit the pluggable
   DNA system
3. **Maintain cross-framework compatibility** - Code should work across Flutter,
   React Native, Next.js, and Tauri
4. **Security-first approach** - Never compromise on security, especially for AI
   integrations
5. **Comprehensive testing** - Generate tests that achieve 80%+ coverage
6. **Performance optimization** - Keep bundle sizes small and startup times fast
7. **Use progress tracking** - Always use `dna-cli track` commands to log
   development sessions and maintain friction-free workflow
8. **Enforce quality gates** - Run comprehensive testing suite and quality
   validation before completing any work
9. **Prevent technical debt** - Follow zero technical debt principles with
   automated debt detection and prevention

### Framework Selection Logic

- **Flutter**: Choose for comprehensive cross-platform coverage with
  best-in-class testing
- **React Native**: Choose for enterprise adoption and mature JavaScript
  ecosystem
- **Next.js**: Choose for AI-native web applications and SaaS platforms
- **Tauri**: Choose for performance-critical desktop applications
- **SvelteKit**: Choose for data visualization and optimal bundle sizes

### DNA Module Development

When creating new DNA modules:

1. Implement standardized interfaces for cross-template compatibility
2. Provide comprehensive configuration options
3. Include framework-specific implementations
4. Add compatibility validation logic
5. Generate complete documentation and examples

### Error Handling Patterns

- Use structured error handling with typed exceptions
- Implement exponential backoff for AI API calls
- Provide graceful degradation for AI services
- Include detailed remediation suggestions for template generation errors

## Important Constraints

### Performance Requirements

- Template setup: <10 minutes
- Bundle optimization: <2MB for performance-critical templates
- Hot reload: <3 seconds
- 80%+ test coverage mandatory

### Security Mandates

- Zero critical security vulnerabilities
- Automated vulnerability scanning
- Security-first default configurations
- No hardcoded secrets in templates

### Platform Coverage

- Must support web, mobile (iOS/Android), desktop (Windows/macOS/Linux)
- Work across Windows, macOS, Linux development environments
- Support various deployment targets (cloud, on-premise, edge, app stores)

## Development Session Management

### Progress Tracking Requirements

- **Always start sessions** with `dna-cli track start` to establish baseline
  metrics
- **Log progress continuously** during development with periodic updates
- **End sessions properly** with quality gate validation and comprehensive
  metrics
- **Monitor friction points** and implement automated solutions for common
  blockers
- **Maintain session history** for velocity analysis and optimization

### Quality Assurance Protocol

- **Pre-Development**: Validate story dependencies and technical requirements
- **During Development**: Run incremental tests and quality checks
- **Post-Development**: Execute comprehensive test suite and security validation
- **Zero Technical Debt**: Use automated debt detection and prevention
  mechanisms
- **Performance Monitoring**: Continuous performance benchmarking and
  optimization

### Friction Elimination Strategy

- **Setup Time Target**: <10 minutes from session start to productive coding
- **Automated Environment**: Pre-configured toolchains and dependencies
- **Context Understanding**: Comprehensive documentation and code navigation
- **Blocker Resolution**: Automated detection and resolution of common issues

## Getting Help

- Review story dependencies before starting work
- Check operational guidelines for coding standards
- Reference UI/UX specs for design requirements
- Update story files with progress and blockers
- Use BMAD core for additional development guidance and personas
- Consult `progress-tracking.md` for session management guidelines
- Follow `comprehensive-testing-framework.md` for quality assurance protocols

## Future Roadmap

### Phase 2 (Post-MVP)

- **Compliance Templates**: HealthTech HIPAA, FinTech regulatory compliance
- **Advanced AI**: Multi-modal AI integration, AI agent development kits
- **Industry-Specific**: Legal AI, Medical AI, Educational AI solutions

### Phase 3

- **AI-Powered Template Generator**: Natural language to custom template
  generation
- **Visual Template Composer**: Drag-and-drop DNA composition interface
- **Enterprise Features**: Custom template development, certification programs

---

This project represents the future of AI-native development tooling. Every
component should be built with the vision of eliminating development friction
while establishing new standards for production-ready, AI-integrated
applications.
