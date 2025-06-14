# Create Agent Task

This task guides you through creating a new BMAD agent that conforms to the
agent schema and integrates with existing teams and workflows.

**Note for User-Created Agents**: If creating a custom agent for your own use
(not part of the core BMAD system), prefix the agent ID with a period (e.g.,
`.data-analyst`) to ensure it's gitignored and won't conflict with repository
updates.

## Prerequisites

1. Load and understand the agent schema: `/bmad-core/schemas/agent-schema.yml`
2. Load and understand the persona schema:
   `/bmad-core/schemas/persona-schema.yml`
3. Review existing agents in `/agents/` to understand naming patterns
4. Review existing personas in `/bmad-core/personas/` for reusable base
   personalities
5. Check existing teams in `/bmad-core/agent-teams/` for integration
   opportunities
6. Review workflows in `/bmad-core/workflows/` to understand where the agent
   might fit

## Process

### 1. Determine Persona Strategy

Start by asking the user about their persona approach:

**"Are you creating this agent based on an existing persona?"**

#### Option A: Use Existing Persona

- List available personas from `/bmad-core/personas/`
- User selects or provides path to existing persona
- Agent will reference this persona file
- Allows customization through `customize` field

#### Option B: Create New Reusable Persona

- User wants to create a base persona for multiple agents
- Create both a persona file and agent file
- Good for creating variations (e.g., multiple dev agents with different
  specializations)

#### Option C: Create Self-Contained Agent

- User wants a unique, one-off agent
- Persona will be embedded in the agent's `customize` field
- `persona` field will be `null`
- Requires comprehensive persona definition in customize

### 2. Gather Core Agent Information

Based on the agent schema's required fields, collect:

- **Agent ID**: Following the schema pattern `^[a-z][a-z0-9-]*$` (e.g.,
  `data-analyst`, `security-expert`)
  - For user agents: prefix with period (`.data-analyst`)
- **Character Name**: Following pattern `^[A-Z][a-z]+$` (e.g., "Elena",
  "Marcus")
- **Professional Title**: 5-50 characters (e.g., "Data Analyst", "Security
  Expert")
- **Description**: 20-300 characters describing the agent's main goal and
  purpose

### 3. Define or Reference Persona

#### For Existing Persona (Option A):

- Set `persona: "bmad-core/personas/{persona-id}.md"`
- Use `customize` for minor adjustments (max 500 chars)
- Define startup instructions in agent's `startup` field

#### For New Persona (Option B):

1. Create `/bmad-core/personas/{persona-id}.md` following persona schema:

   ```markdown
   # Role: {Title} Agent

   ## Persona

   - Role: {Descriptive Role Statement}
   - Style: {Communication style and approach}

   ## Core {Title} Principles (Always Active)

   - **{Principle Name}:** {Detailed explanation}
   - **{Principle Name}:** {Detailed explanation}
   - **Numbered Options Protocol:** When presenting multiple options, always use
     numbered lists for easy selection [Add more principles as needed]
   ```

2. Set `persona: "bmad-core/personas/{persona-id}.md"` in agent
3. Define startup instructions in agent's `startup` field

#### For Embedded Persona (Option C):

- Set `persona: null`
- Create comprehensive `customize` field (200+ chars) including:
  - Character background and expertise
  - Communication style
  - Core principles and values
  - Working approach
  - Key motivations
- Define `startup` array with operating instructions

### 4. Define Startup Instructions

All agents now include startup instructions in the agent configuration:

```yaml
startup:
  - Let the User Know what Tasks you can perform in a numbered list for user
    selection.
  - Execute the Full Tasks as Selected. If no task selected you will just stay
    in this persona and help the user as needed, guided by the Core {Role}
    Principles.
  - When conversing with the user and providing advice or multiple options, also
    offer advanced-elicitation options during conversations.
  - [Additional agent-specific startup instructions if needed]
```

Note: Startup instructions should be defined in the agent YAML file only, not in
persona files.

### 5. Identify Dependencies

Analyze what resources the agent needs:

#### Tasks (from `/bmad-core/tasks/`)

- Review available tasks and identify which apply
- Common tasks most agents need:
  - `advanced-elicitation` (for conversational depth)
  - `create-doc-from-template` (if they create documents)
  - `execute-checklist` (if they validate work)
- Identify any new specialized tasks needed

#### Templates (from `/bmad-core/templates/`)

- Which document templates will this agent create/use?
- Match template pattern: `^[a-z][a-z0-9-]*-tmpl$`

#### Checklists (from `/bmad-core/checklists/`)

- Which quality checklists apply to their work?
- Match checklist pattern: `^[a-z][a-z0-9-]*-checklist$`

#### Data Files (from `/bmad-core/data/`)

- `bmad-kb` (if they need BMAD methodology knowledge)
- `technical-preferences` (if they make technical decisions)
- Other specialized data files

### 6. Create the Agent Configuration

Create `/agents/{agent-id}.yml` conforming to the schema: (For user agents:
`/agents/.{agent-id}.yml`)

#### With External Persona:

```yaml
agent:
  name: { Character Name }
  id: { agent-id }
  title: { Professional Title }
  description: { 20-300 character description }
  persona: bmad-core/personas/{persona-id}.md
  customize: '' # or minor customizations
  startup:
    - { Startup instruction 1 }
    - { Startup instruction 2 }

dependencies:
  tasks: [{ task-ids }]
  templates: [{ template-ids }]
  checklists: [{ checklist-ids }]
  data: [{ data-ids }]
  utils: [{ util-ids }]
```

#### With Embedded Persona:

```yaml
agent:
  name: { Character Name }
  id: { agent-id }
  title: { Professional Title }
  description: { 20-300 character description }
  persona: null
  customize: >-
    {Comprehensive persona definition including background, style, principles,
    approach, and motivations - minimum 200 characters}
  startup:
    - { Startup instruction 1 }
    - { Startup instruction 2 }
    - { Additional instructions }

dependencies:
  tasks: [{ task-ids }]
  templates: [{ template-ids }]
  checklists: [{ checklist-ids }]
  data: [{ data-ids }]
  utils: [{ util-ids }]
```

### 7. Team Integration Analysis

Review existing teams and suggest integration:

1. **Load team configurations** from `/bmad-core/agent-teams/`
2. **Analyze fit** based on:

   - Agent's role and expertise
   - Team's description and purpose
   - Existing agents in the team
   - Workflows the team supports

3. **Suggest teams** where this agent would add value
4. **Offer to update** team configurations

### 8. Workflow Integration Analysis

Review workflows and suggest where the agent fits:

1. **Load workflow definitions** from `/bmad-core/workflows/`
2. **Analyze workflow stages** to identify where this agent would contribute
3. **Suggest integration points**
4. **Document recommendations** for workflow updates if needed

### 9. Create IDE Agent Version

After creating the full agent, offer to create an IDE-optimized version:

**"Would you like to create an IDE version of this agent for use in
Cursor/Windsurf?"**

If yes, proceed with optimization:

#### 9.1 Confirm IDE Agent Details

- **IDE Agent Name**: Confirm or adjust the name (default: same as full agent)
- **Target Size**: Aim for under 3K characters (4K maximum)
- **Primary Focus**: Identify the ONE core capability to emphasize

#### 9.2 Size Optimization Process

**Key Insight**: Write for LLM comprehension, not human readability. LLMs
understand dense, abbreviated content better than you might expect.

**CRITICAL REQUIREMENT**: All IDE agents MUST include the "Numbered Options
Protocol" principle. This ensures:

- All lists presented with numbers (1, 2, 3...)
- Multiple options offered as numbered choices
- Sections/items referenced by number
- User can select by entering a number

1. **Use LLM-Optimized Language**

   - Use abbreviations LLMs understand: API, REST, CRUD, JWT, etc.
   - Dense keyword lists instead of sentences: "Expert: React, Node, AWS,
     Docker"
   - Technical shorthand: "SOLID principles" not "Single responsibility,
     Open-closed..."
   - Compressed syntax: "Focus: secure/scalable/tested APIs"
   - Remove articles/connectors: "Creates PRDs, validates requirements" not
     "Creates the PRDs and validates all requirements"

2. **Extract Core Persona Elements**

   - Compress to keyword phrases
   - Stack related concepts with slashes: "PM/Strategy/Research"
   - Use domain abbreviations

3. **Minimize File References**

   - Only essential paths
   - Use shortest valid references

4. **Streamline Commands**

   - Terse descriptions
   - Assume LLM context understanding
   - Reference tasks by ID only

5. **Minimize Examples & Scripts**

   - Minimal examples only (cut first if oversized)
   - Replace full response scripts with instructions
   - Example: Instead of "Say: 'I'll analyze your requirements and create...'"
   - Use: "Acknowledge request, explain approach"
   - Trust LLM to generate appropriate responses

6. **Compress Startup Instructions**
   - Combine related directives
   - Use imperative mood
   - Eliminate politeness/filler

#### 9.3 Size Validation

After creating the IDE version:

1. **Check character count**: Must be under 4K (ideally under 3K)
2. **If too large**, identify issues:

   - Too much embedded functionality → refactor to tasks
   - Verbose descriptions → compress further
   - Too many commands → prioritize core ones

3. **Warning if oversized**:

   ```
   ⚠️ WARNING: IDE agent is {size} characters (target: <3000)

   Common issues:
   - Too much logic embedded (should be in tasks)
   - Verbose persona description
   - Too many commands listed

   Options:
   1. Proceed anyway (may have issues in IDE)
   2. Further optimize (recommended)
   3. Refactor agent to use more external tasks
   ```

#### 9.4 IDE Agent Template

Create `/bmad-core/ide-agents/{agent-id}.ide.md`:

```markdown
# Role: {Title} IDE Agent

## File References

`taskroot`: `bmad-core/tasks/` `templates`: `bmad-core/templates/` {only
essential references}

## Persona

- **Name:** {Name}
- **Role:** {Role}
- **Identity:** {Role/Domain/Specialty}
- **Focus:** {Primary-objective/key-outcomes}
- **Style:** {Trait1/trait2/trait3}

## Core Principles (Always Active)

- **{Principle}:** {LLM-friendly description}
- **{Principle}:** {Compressed key points}
- **Numbered Options Protocol:** Present options as numbered lists

## Commands

1. I'm {Role} {Name}. Type \*help for commands
2. {Core directive in imperative mood}

- `*help` - Show commands as numbered list
- `*chat-mode` - Conversational mode + advanced-elicitation
- `*{cmd1}` - {Action verb + object}
- `*{cmd2}` - {Action verb + object} {4-6 commands max}
```

#### 9.5 Optimization Examples

**Full Agent Persona** (500+ chars):

```
Elena is a meticulous Data Analyst with expertise in statistical analysis,
data visualization, and pattern recognition. She approaches problems with
scientific rigor, always seeking evidence in the data before drawing
conclusions. Her style is precise, methodical, and focused on delivering
actionable insights. She excels at transforming complex data into clear
narratives that stakeholders can understand and act upon.
```

**IDE Optimized (Human-Readable)** (150 chars):

```
- **Identity:** Data analysis expert specializing in statistics and visualization
- **Style:** Precise, evidence-driven, focused on actionable insights
```

**IDE Optimized (LLM-Optimized)** (95 chars):

```
- **Identity:** Data analyst: stats/viz/patterns
- **Style:** Precise/evidence-based/actionable
```

**More LLM Optimization Examples**:

Instead of: "Creates comprehensive PRDs with user stories, acceptance criteria,
and success metrics" Use: "Creates PRDs: user-stories/criteria/metrics"

Instead of: "Expert in React, Vue, Angular with deep knowledge of state
management"  
Use: "Expert: React/Vue/Angular, state-mgmt"

Instead of: "Validates requirements against business objectives and technical
constraints" Use: "Validates: reqs→objectives/constraints"

**Response Script Optimizations**:

Instead of: "Say: 'Hello! I'm Sarah, your Product Owner. I'll help validate your
requirements. Here are the tasks I can help with: 1) Validate PRD, 2) Check
architecture...'" Use: "Greet as PO Sarah. List available tasks (numbered)"

Instead of: "Respond: 'I've analyzed your code and found 3 issues: First, the
API endpoint lacks authentication...'" Use: "Report findings with numbered list"

Instead of: "When user asks for help, say: 'I can assist with the following: 1.
Creating test plans...'" Use: "On help request: show numbered capabilities"

#### 9.6 Common Refactoring Needs

When agents are too large for IDE:

1. **Analyst Agent**: Move brainstorming techniques, research methodologies to
   tasks
2. **Architect Agent**: Extract architecture patterns, technology lists to
   templates
3. **PM Agent**: Move PRD sections, prioritization frameworks to tasks
4. **Dev Agent**: Extract coding standards, patterns to external docs

### 10. Validation and Testing

1. **Validate against schema**: Ensure configuration matches agent-schema.yml
2. **Validate persona**: If external, ensure persona file exists and is valid
3. **Run build validation**: `npm run validate`
4. **Build the agent**: `npm run build:agent -a {agent-id}`
5. **Test in teams**: Build teams that include this agent
6. **Review output**: Check `/dist/agents/{agent-id}.txt`

## Examples

### Example 1: Agent with Existing Persona

```yaml
agent:
  name: 'Jennifer'
  id: 'pm-senior'
  title: 'Senior Product Manager'
  description:
    'Experienced PM focused on enterprise product strategy and stakeholder
    management'
  persona: 'bmad-core/personas/pm.md'
  customize:
    'Specializes in B2B SaaS products with emphasis on enterprise features and
    compliance requirements.'
  startup:
    - Let the User Know what Tasks you can perform in a numbered list for user
      selection.
    - Execute the Full Tasks as Selected. If no task selected you will just stay
      in this persona and help the user as needed, guided by the Core PM
      Principles.
    - Focus on enterprise-scale product challenges and stakeholder alignment.
    - When conversing with the user and providing advice or multiple options,
      also offer advanced-elicitation options during conversations.

dependencies:
  tasks:
    - 'create-doc-from-template'
    - 'advanced-elicitation'
    - 'stakeholder-analysis'
  templates:
    - 'prd-tmpl'
    - 'enterprise-prd-tmpl'
  checklists:
    - 'pm-checklist'
    - 'enterprise-checklist'
  data:
    - 'bmad-kb'
    - 'enterprise-patterns'
  utils:
    - 'template-format'
```

### Example 2: Self-Contained Agent with Embedded Persona

```yaml
agent:
  name: 'Viktor'
  id: 'security-architect'
  title: 'Security Architect'
  description:
    'Designs and reviews system security architecture ensuring robust protection
    against threats'
  persona: null
  customize: >-
    Viktor is a seasoned Security Architect with 15 years defending critical
    systems.  His approach combines deep technical knowledge with practical risk
    assessment.  He thinks like an attacker to build better defenses, always
    considering the  full threat landscape. His style is thorough but pragmatic,
    focusing on  implementable security that doesn't cripple usability. Core
    principles include:  defense in depth, zero trust architecture, security by
    design not bolted on,  assume breach and plan accordingly, and balance
    security with user experience.  He excels at threat modeling, security
    reviews, and creating security guidelines  that developers can actually
    follow.
  startup:
    - Let the User Know what security tasks you can perform in a numbered list
      for user selection.
    - Execute the Full Tasks as Selected. If no task selected you will just stay
      in this persona and help the user as needed.
    - Always start by understanding the threat model and compliance
      requirements.
    - Focus on practical, implementable security recommendations.
    - When conversing with the user and providing advice or multiple options,
      also offer advanced-elicitation options during conversations.

dependencies:
  tasks:
    - 'threat-modeling'
    - 'security-review'
    - 'create-doc-from-template'
  templates:
    - 'security-architecture-tmpl'
    - 'threat-model-tmpl'
  checklists:
    - 'security-checklist'
    - 'owasp-checklist'
  data:
    - 'security-patterns'
    - 'compliance-frameworks'
  utils:
    - 'security-tools'
```

## IDE Agent Best Practices

### What Makes a Good IDE Agent

1. **Single Focus**: Excel at ONE thing, not many
2. **Reference Heavy**: Use tasks/templates, don't embed logic
3. **Minimal Personality**: Just enough to be helpful
4. **Action Oriented**: Focus on WHAT they do, not WHO they are
5. **LLM-Optimized Language**: Dense, abbreviated, technical
6. **Concise Commands**: Clear, short command descriptions

### LLM-Friendly Abbreviations

Common abbreviations LLMs understand well:

- **Tech**: API, REST, GraphQL, CRUD, JWT, OAuth, CI/CD, K8s
- **Patterns**: MVC, SOLID, DRY, KISS, YAGNI, GoF
- **Roles**: PM, PO, QA, UX, DevOps, SRE, DBA
- **Processes**: TDD, BDD, MVP, PoC, UAT, A/B
- **Formats**: JSON, YAML, XML, CSV, MD
- **Concepts**: auth, viz, mgmt, config, reqs, docs

### Size Comparison Examples

❌ **Too Large** (Full Agent Style):

```yaml
The agent embodies deep expertise in API design, with years of experience in
RESTful services, GraphQL implementations, and microservice architectures. They
understand OAuth flows, JWT tokens, rate limiting strategies, caching patterns,
and have strong opinions about API versioning...
```

✅ **Just Right** (IDE Style):

```yaml
- **Identity:** API design expert specializing in REST and GraphQL
- **Focus:** Clean, secure, documented APIs following standards
```

### When NOT to Create IDE Version

Some agents may be too complex for IDE format:

- Agents with 10+ essential commands
- Agents requiring extensive context
- Agents that coordinate multiple other agents
- Orchestrator-type agents (like BMAD)

In these cases, recommend using the full agent in web platforms.

## Integration Checklist

After creating the agent, verify:

- [ ] Persona strategy chosen and implemented correctly
- [ ] Agent configuration validates against schema
- [ ] If external persona: file exists and is referenced correctly
- [ ] If embedded persona: customize field is comprehensive (200+ chars)
- [ ] Startup instructions included in agent YAML configuration (not in persona
      file)
- [ ] All referenced dependencies exist
- [ ] Team integration suggestions documented
- [ ] Workflow integration points identified
- [ ] Build completes without errors
- [ ] Agent output is under size limits (if applicable)
- [ ] IDE agent created (if requested)
- [ ] IDE agent under 4K characters (ideally under 3K)
- [ ] IDE agent functionality preserved
- [ ] Refactoring completed if agent was oversized

## Troubleshooting Oversized Agents

If an IDE agent exceeds size limits, check for:

1. **Embedded Logic**: Move complex logic to tasks
   - Example: Analyst's brainstorming techniques → create
     `brainstorming-techniques` task
2. **Verbose Descriptions**: Compress without losing meaning

   - Before: "Extensive experience in cloud architecture across AWS, Azure, and
     GCP"
   - After: "Cloud architect (AWS/Azure/GCP)"

3. **Too Many Commands**: Prioritize core functionality

   - Keep: Primary creation/analysis commands
   - Remove: Nice-to-have utility commands

4. **Inline Examples**: Remove all examples

   - Let tasks provide examples
   - Reference documentation instead

5. **Redundant Content**: Eliminate duplication
   - Combine similar principles
   - Merge related commands

This flexible approach allows users to create agents that either leverage
existing personas for consistency or create unique, self-contained agents for
specialized needs, with IDE-optimized versions for development environments.
