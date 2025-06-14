# BMAD Schemas

This directory contains YAML schema definitions for BMAD Method configuration
files.

## Agent Schema

The `agent-schema.yml` defines the EXACT structure required for agent
configuration files in the BMAD Method, based on the standard pm.yml structure.

### Required Structure

Every agent configuration file MUST have exactly these fields:

```yaml
agent:
  name: string # Human-friendly name (e.g., "John")
  id: string # Unique identifier (e.g., "pm")
  title: string # Professional title (e.g., "Product Manager")
  description: string # Main goal and purpose of the agent
  persona: string # Reference to persona file in bmad-core/personas/
  customize: string # Customization instructions (use "" if none)

dependencies:
  tasks: [] # Array of task files from bmad-core/tasks/
  templates: [] # Array of template files from bmad-core/templates/
  checklists: [] # Array of checklist files from bmad-core/checklists/
  data: [] # Array of data files from bmad-core/data/
  utils: [] # Array of utility files from bmad-core/utils/
```

### Important Notes

1. **ALL fields are required** - Even if empty, include all fields with empty
   arrays `[]` or empty strings `""`
2. **No additional fields allowed** - The schema enforces exactly this structure
3. **No environments section** - Environment-specific configurations are not
   part of the standard
4. **Customize field** - Must be present even if empty (use `""`)

### Example (pm.yml)

```yaml
agent:
  name: John
  id: pm
  title: Product Manager
  description: >-
    Main goal is to help produce or maintain the best possible PRD and represent
    the end user the product will serve.
  persona: pm
  customize: ''

dependencies:
  tasks:
    - create-doc-from-template
    - correct-course
    - create-deep-research-prompt
    - brownfield-create-epic
    - brownfield-create-story
    - execute-checklist
  templates:
    - prd-tmpl
    - brownfield-prd-tmpl
  checklists:
    - pm-checklist
    - change-checklist
  data:
    - technical-preferences
  utils:
    - template-format
```

## Agent Team Schema

The `agent-team-schema.yml` defines the structure for agent team configuration
files in the BMAD Method.

### Required Structure

Every team configuration file MUST have exactly these fields:

```yaml
bundle:
  name: string # Team name (e.g., "Team Fullstack")
  description: string # Team purpose and capabilities

agents: [] # Array of agent IDs or "*" for all agents

workflows: [] # Array of workflow names from bmad-core/workflows/
```

### Important Notes

1. **ALL fields are required** - Include all fields even if arrays are empty
2. **No additional fields allowed** - The schema enforces exactly this structure
3. **Agent wildcard** - Use `"*"` to include all available agents
4. **Workflows** - Reference workflow files from bmad-core/workflows/ (without
   extension)

### Example (team-fullstack.yml)

```yaml
bundle:
  name: Team Fullstack
  description: >-
    Comprehensive full-stack development team capable of handling both
    greenfield  application development and brownfield enhancement projects.
    This team combines  strategic planning, user experience design, and holistic
    system architecture  to deliver complete solutions from concept to
    deployment.

agents:
  - bmad
  - analyst
  - pm
  - ux-expert
  - architect
  - po

workflows:
  - brownfield-fullstack
  - brownfield-service
  - brownfield-ui
  - greenfield-fullstack
  - greenfield-service
  - greenfield-ui
```

### Special Cases

**Using Wildcards** - The team-all.yml example shows using both specific agents
and wildcards:

```yaml
agents:
  - bmad
  - '*' # Includes all other agents
```

## File References

All references in schemas should be file names WITHOUT extensions:

- ✅ `prd-tmpl` (not `prd-tmpl.md`)
- ✅ `pm-checklist` (not `pm-checklist.md`)
- ✅ `greenfield-fullstack` (not `greenfield-fullstack.yml`)
