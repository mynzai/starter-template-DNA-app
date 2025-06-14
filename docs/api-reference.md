# API Reference

## Template Generation API

The core template engine exposes CLI and programmatic interfaces for template
generation and DNA composition.

### Key Commands

- `create-template --type={template-type} --dna={module-list}`: Generates new
  template with DNA modules
- `validate-template --path={template-path}`: Validates generated template
  quality
- `update-template --path={template-path} --version={target-version}`: Updates
  with migration

### DNA Composition API

Validates module compatibility and handles composition logic.

### External APIs

Integration points with AI providers (OpenAI, Anthropic), payment systems
(Stripe, PayPal), and cloud services.
