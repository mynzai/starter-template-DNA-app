# Data Models

## Core Template Configuration Entities

### TemplateDefinition

Complete specification for a template including DNA modules and framework
configurations.

```typescript
export interface TemplateDefinition {
  id: string; // Unique template identifier
  name: string; // Human-readable name
  framework: Framework; // Target framework
  dnaModules: DNAModuleReference[]; // Required modules
  configuration: TemplateConfiguration; // Framework config
  qualityMetrics: QualityMetrics; // Standards
  metadata: {
    version: string;
    author: string;
    tags: string[];
    lastUpdated: Date;
  };
}
```

### DNAModule

Reusable components for authentication, payments, AI integration, etc.

### QualityMetrics

Test coverage, security scores, performance benchmarks for templates.
