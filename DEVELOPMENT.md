# Developer Implementation Guide

## Quick Start for Development Agents

This guide provides the essential workflow for implementing the Starter Template
DNA App using the optimized documentation structure.

## Document Structure Overview

```
docs/
├── index.md                    # Central navigation
├── epic-{1-6}.md              # High-level epic goals
├── stories/epic-{1-6}/        # Detailed story files (41 total)
├── {technical-docs}.md        # Architecture references
└── {ui-specs}.md              # Frontend specifications
```

## Implementation Workflow

### 1. Start with Epic 1 (Foundation)

**Order:** Stories 1.1 → 1.2 → 1.3a → 1.3b → 1.4 → 1.5

**Key References:**

- `docs/project-structure.md` - Monorepo layout
- `docs/tech-stack.md` - Technology choices
- `docs/operational-guidelines.md` - Coding standards

**Focus:** CLI tool, DNA engine, testing infrastructure

### 2. Epic Dependencies

- **Epic 2 (AI Templates):** Requires Epic 1 completion
- **Epic 3 (Quality):** Parallel with Epic 2
- **Epic 4 (Cross-Platform):** After Epic 1
- **Epic 5 (DNA Modules):** After Epics 2-4
- **Epic 6 (Developer Experience):** Final integration

### 3. Story Implementation Process

For each story:

1. **Read story file** (`stories/epic-X/epic-X-story-Y.md`)
2. **Check dependencies** in story header
3. **Reference technical docs** as specified
4. **Follow acceptance criteria** exactly
5. **Update story status** and completion notes

### 4. UI/UX Implementation

**AI Templates:** Use `docs/ai-saas-ui-spec.md`

- Chat interfaces with streaming
- Dashboard components
- Real-time indicators

**Collaboration:** Use `docs/collaboration-ui-spec.md`

- Presence indicators
- Operational transformation UI
- Conflict resolution

**Design System:** Use `docs/design-system-spec.md`

- Cross-platform components
- Design tokens
- Responsive patterns

### 5. Frontend Architecture References

- `docs/front-end-project-structure.md` - File organization
- `docs/front-end-state-management.md` - State patterns
- `docs/front-end-api-interaction.md` - AI service integration
- `docs/front-end-component-guide.md` - Component specs
- `docs/front-end-testing-strategy.md` - Testing approach

### 6. Quality Standards

**Testing Requirements:**

- 80%+ code coverage (Epic 1.4)
- All acceptance criteria validated
- Security scanning passed
- Performance targets met

**Documentation Updates:**

- Update story completion status
- Add implementation notes
- Document deviations with rationale

### 7. Cross-Epic Integration Points

**Epic 1 → 2:** DNA system enables AI templates **Epic 2 → 5:** AI patterns
inform DNA modules **Epic 3 ↔ All:** Quality validation across epics **Epic 4 →
5:** Cross-platform patterns for modules **Epic 6:** Integrates all developer
experience

## Technical Implementation Notes

### DNA Module Integration

- Follow `docs/data-models.md` for module schemas
- Use `docs/api-reference.md` for composition patterns
- Reference Epic 5 stories for specific modules

### AI Integration

- Streaming text components in all frameworks
- Token usage tracking and cost management
- Multi-LLM provider abstraction

### Performance Targets

- Template generation: <10 minutes
- AI responses: <3 seconds first token
- Hot reload: <3 seconds
- Test coverage: 80%+

## Development Environment Setup

1. **Monorepo Tools:** Nx or Lerna (Epic 1.1)
2. **Shared Configs:** ESLint, Prettier, TypeScript
3. **Testing:** Jest, Playwright, framework-specific tools
4. **CI/CD:** GitHub Actions with quality gates

## Getting Help

- Review story dependencies before starting
- Check operational guidelines for coding standards
- Reference UI/UX specs for design requirements
- Update story files with progress and blockers
