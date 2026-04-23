# Changes Made to Fix Research Team Issues

## Problem
The research-manager agent kept looping on itself because it could not delegate to other agents (researcher, scientist, section-writer). The root cause was that spawned subprocess agents did NOT have access to `dispatch_agent` tool - only the root dispatcher had it.

## Solution

### 1. Extension Changes (`extensions/agent-team.ts`)

**Added Delegation Block Support:**
- Added `parseDelegationBlocks()` function that parses `[DELEGATE:agent_name]...[/DELEGATE]` blocks from agent output
- Modified `dispatchAgent()` to process delegation blocks:
  1. Run the agent subprocess
  2. Parse any `[DELEGATE:agent_name]` blocks from output
  3. Dispatch delegated tasks to target agents
  4. Append results back to the requesting agent's output
  5. Recursive processing (max depth = 5) to handle nested delegations

**Updated Dispatcher System Prompt:**
- Added clear "Plan → Delegate → Synthesize" workflow guidance
- Added example research workflow
- Added explanation of how [DELEGATE] blocks work
- Agents now know to order dispatches correctly for dependent tasks

### 2. Agent Definition Updates

**`research-manager.md`** - Now uses `[DELEGATE:agent_name]` blocks to delegate:
```
[DELEGATE:researcher]
Search for papers about "attention mechanisms in transformers".
[/DELEGATE]
```
- Writes only: abstract, introduction, conclusions
- Delegates all body sections to specialists

**`researcher.md`** - Focused on discovery and extraction:
- Searches academic databases
- Downloads papers
- Returns structured metadata (titles, authors, abstracts)
- Delegates deep analysis to scientist

**`scientist.md`** - Focused on critical analysis:
- Methodology evaluation
- Research gap identification
- Scientific critique
- Can read papers directly

**`section-writer.md`** - Focused on body section writing:
- Writes only assigned body sections
- Does NOT write abstract/introduction/conclusions
- Uses paper content to write sections with citations

**`section-critic.md`** - Focused on quality review:
- Reviews sections for requirements compliance
- Checks citation style
- Verifies factual correctness
- Provides actionable feedback (doesn't rewrite)

**`planner.md`** - Created for planning role:
- Creates structured implementation plans
- Identifies tasks and dependencies
- Outputs plan that dispatcher can execute step-by-step

### 3. Teams.yaml Updates

Added `planner` to all teams as the planning role:

```yaml
research-team:
  - planner           # NEW: Creates plans
  - researcher        # Discovers papers
  - scientist         # Analyzes papers
  - section-writer    # Writes body sections
  - section-critic    # Reviews sections
  - research-manager  # Orchestrates, writes framework sections
```

## New Delegation Syntax

Agents can now delegate using `[DELEGATE:agent_name]` blocks:

```
[DELEGATE:researcher]
Search for papers about machine learning optimization. Return titles and abstracts.
[/DELEGATE]
```

The dispatcher intercepts these blocks, dispatches the task, and appends results back.

## Workflow (Plan → Delegate → Synthesize)

1. **Dispatcher** receives user request
2. **Dispatcher** dispatches to `planner` or `research-manager` for planning
3. **Planner/Manager** creates plan with sub-tasks
4. **Dispatcher** dispatches each sub-task to appropriate agent
5. **Agents** may use `[DELEGATE]` blocks for additional work
6. **Dispatcher** processes delegations and compiles results
7. **Final output** returned to user
