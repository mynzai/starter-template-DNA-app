# Create Team Task

This task guides you through creating a new BMAD agent team that conforms to the
agent-team schema and effectively combines agents for specific project types.

**Note for User-Created Teams**: If creating a custom team for your own use (not
part of the core BMAD system), prefix the team name with a period (e.g.,
`.team-frontend`) to ensure it's gitignored and won't conflict with repository
updates.

## Prerequisites

1. Load and understand the team schema:
   `/bmad-core/schemas/agent-team-schema.yml`
2. Review existing teams in `/bmad-core/agent-teams/` for patterns and naming
   conventions
3. List available agents from `/agents/` to understand team composition options
4. Review workflows in `/bmad-core/workflows/` to align team capabilities

## Process

### 1. Define Team Purpose and Scope

Before selecting agents, clarify the team's mission:

- **Team Purpose**: What specific problems will this team solve?
- **Project Types**: Greenfield, brownfield, or both?
- **Technical Scope**: UI-focused, backend-only, or full-stack?
- **Team Size Consideration**: Smaller teams (3-5 agents) for focused work,
  larger teams (6-8) for comprehensive coverage

### 2. Create Team Metadata

Based on the schema requirements:

- **Team Name**: Must follow pattern `^Team .+$` (e.g., "Team Frontend", "Team
  Analytics")
  - For user teams: prefix with period (e.g., "Team .MyCustom")
- **Description**: 20-500 characters explaining team's purpose, capabilities,
  and use cases
- **File Name**: `/bmad-core/agent-teams/team-{identifier}.yml`
  - For user teams: `/bmad-core/agent-teams/.team-{identifier}.yml`

### 3. Select Agents Based on Purpose

#### Discover Available Agents

1. List all agents from `/agents/` directory
2. Review each agent's role and capabilities
3. Consider agent synergies and coverage

#### Agent Selection Guidelines

Based on team purpose, recommend agents:

**For Planning & Strategy Teams:**

- `bmad` (required orchestrator)
- `analyst` - Requirements gathering and research
- `pm` - Product strategy and documentation
- `po` - Validation and approval
- `architect` - Technical planning (if technical planning needed)

**For Design & UX Teams:**

- `bmad` (required orchestrator)
- `ux-expert` - User experience design
- `architect` - Frontend architecture
- `pm` - Product requirements alignment
- `po` - Design validation

**For Development Teams:**

- `bmad` (required orchestrator)
- `sm` - Sprint coordination
- `dev` - Implementation
- `qa` - Quality assurance
- `architect` - Technical guidance

**For Full-Stack Teams:**

- `bmad` (required orchestrator)
- `analyst` - Initial planning
- `pm` - Product management
- `ux-expert` - UI/UX design (if UI work included)
- `architect` - System architecture
- `po` - Validation
- Additional agents as needed

#### Special Cases

- **Using Wildcard**: If team needs all agents, use `["bmad", "*"]`
- **Validation**: Schema requires `bmad` in all teams

### 4. Select Workflows

Based on the schema's workflow enum values and team composition:

1. **Analyze team capabilities** against available workflows:

   - `brownfield-fullstack` - Requires full team with UX
   - `brownfield-service` - Backend-focused team
   - `brownfield-ui` - UI/UX-focused team
   - `greenfield-fullstack` - Full team for new projects
   - `greenfield-service` - Backend team for new services
   - `greenfield-ui` - Frontend team for new UIs

2. **Match workflows to agents**:

   - UI workflows require `ux-expert`
   - Service workflows benefit from `architect` and `dev`
   - All workflows benefit from planning agents (`analyst`, `pm`)

3. **Apply schema validation rules**:
   - Teams without `ux-expert` shouldn't have UI workflows
   - Teams named "Team No UI" can't have UI workflows

### 5. Create Team Configuration

Generate the configuration following the schema:

```yaml
bundle:
  name: '{Team Name}' # Must match pattern "^Team .+$"
  description: >-
    {20-500 character description explaining purpose, capabilities, and ideal
    use cases}

agents:
  - bmad # Required orchestrator
  - { agent-id-1 }
  - { agent-id-2 }
  # ... additional agents

workflows:
  - { workflow-1 } # From enum list
  - { workflow-2 }
  # ... additional workflows
```

### 6. Validate Team Composition

Before finalizing, verify:

1. **Role Coverage**: Does the team have all necessary skills for its workflows?
2. **Size Optimization**:
   - Minimum: 2 agents (bmad + 1)
   - Recommended: 3-7 agents
   - Maximum with wildcard: bmad + "\*"
3. **Workflow Alignment**: Can the selected agents execute all workflows?
4. **Schema Compliance**: Configuration matches all schema requirements

### 7. Integration Recommendations

Document how this team integrates with existing system:

1. **Complementary Teams**: Which existing teams complement this one?
2. **Handoff Points**: Where does this team hand off to others?
3. **Use Case Scenarios**: Specific project types ideal for this team

### 8. Validation and Testing

1. **Schema Validation**: Ensure configuration matches agent-team-schema.yml
2. **Build Validation**: Run `npm run validate`
3. **Build Team**: Run `npm run build:team -t {team-name}`
4. **Size Check**: Verify output is appropriate for target platform
5. **Test Scenarios**: Run sample workflows with the team

## Example Team Creation

### Example 1: API Development Team

```yaml
bundle:
  name: 'Team API'
  description: >-
    Specialized team for API and backend service development. Focuses on  robust
    service architecture, implementation, and testing without UI  components.
    Ideal for microservices, REST APIs, and backend systems.

agents:
  - bmad
  - analyst
  - architect
  - dev
  - qa
  - po

workflows:
  - greenfield-service
  - brownfield-service
```

### Example 2: Rapid Prototyping Team

```yaml
bundle:
  name: 'Team Prototype'
  description: >-
    Agile team for rapid prototyping and proof of concept development.  Combines
    planning, design, and implementation for quick iterations  on new ideas and
    experimental features.

agents:
  - bmad
  - pm
  - ux-expert
  - architect
  - dev

workflows:
  - greenfield-ui
  - greenfield-fullstack
```

## Team Creation Checklist

- [ ] Team purpose clearly defined
- [ ] Name follows schema pattern "Team {Name}"
- [ ] Description is 20-500 characters
- [ ] Includes bmad orchestrator
- [ ] Agents align with team purpose
- [ ] Workflows match team capabilities
- [ ] No conflicting validations (e.g., no-UI team with UI workflows)
- [ ] Configuration validates against schema
- [ ] Build completes successfully
- [ ] Output size appropriate for platform

## Best Practices

1. **Start Focused**: Create teams with specific purposes rather than
   general-purpose teams
2. **Consider Workflow**: Order agents by typical workflow sequence
3. **Avoid Redundancy**: Don't duplicate roles unless needed
4. **Document Rationale**: Explain why each agent is included
5. **Test Integration**: Verify team works well with selected workflows
6. **Iterate**: Refine team composition based on usage

This schema-driven approach ensures teams are well-structured, purposeful, and
integrate seamlessly with the BMAD ecosystem.
