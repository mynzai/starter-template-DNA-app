# DNA Template CLI

AI-native template generation ecosystem - Create production-ready projects in under 10 minutes.

## Quick Start

```bash
# Install globally
npm install -g dna-template-cli

# Create a new project
dna-cli create

# List available templates
dna-cli list

# Get help
dna-cli --help
```

## Features

🧬 **DNA Module System** - Composable code modules for auth, payments, AI integration, and more
🚀 **18+ Production Templates** - AI-powered SaaS, mobile apps, data visualization, and cross-platform solutions  
⚡ **Lightning Fast Setup** - From zero to running application in under 10 minutes
🔒 **Security First** - Built-in security best practices and automated vulnerability scanning
🧪 **Comprehensive Testing** - 80%+ test coverage with framework-specific testing strategies

## Available Templates

- **AI-Native**: AI-powered SaaS platforms, mobile AI assistants, business applications
- **Performance**: Real-time collaboration, high-performance APIs, data visualization  
- **Cross-Platform**: Flutter universal, React Native hybrid, modern Electron
- **Foundation**: Basic templates for Rust, Python, Node.js, and more

## Commands

- `dna-cli create [name]` - Create new project with interactive template selection
- `dna-cli list` - Browse all available templates by category
- `dna-cli list --modules` - Show available DNA modules
- `dna-cli validate` - Validate template structure and configuration
- `dna-cli add <module>` - Add DNA modules to existing projects
- `dna-cli update` - Update existing project with latest template changes

## Examples

```bash
# Create AI-powered SaaS application
dna-cli create my-saas --template ai-saas-nextjs --modules auth-jwt,payments-stripe

# Create cross-platform mobile app  
dna-cli create my-app --template flutter-universal --modules auth-oauth,real-time-websocket

# List AI-category templates
dna-cli list --category ai-native

# Add authentication to existing project
dna-cli add auth-jwt --path ./my-project
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Repository

[GitHub Repository](https://github.com/mynzai/starter-template-DNA)