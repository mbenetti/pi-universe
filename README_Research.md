# 🔬 Research Pipeline for Pi

A **multi-phase research workflow** with specialized agents and **strict information compartmentalization** to prevent context window explosion when analyzing academic papers.

## Key Principle: No Agent Sees Everything

Every agent has defined, limited access to content. Information flows through delegation, never by direct full access.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  COMPARTMENTALIZED RESEARCH TEAM                                         │
│                                                                         │
│  ┌─────────────────────┐                                                │
│  │  research-manager   │ → Access: SUMMARIES ONLY                       │
│  │                     │ → Writes: Abstract, Introduction, Conclusions  │
│  │                     │ ← Receives: Paper summaries from sub-agents   │
│  │  (context minimal)  │ → NEVER: Reads full papers, calls web_search  │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────┐                                                │
│  │     researcher      │ → Access: ABSTRACTS + FIRST 50 LINES           │
│  │                     │ → Searches: role-restricted-search skill       │
│  │                     │ → Returns: titles, abstracts, key points       │
│  │  (limited view)     │ → NEVER: Reads methodology, results sections   │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│     Need full content?                                                   │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────┐                                                │
│  │      scientist      │ → Access: FULL CONTENT (all sections)          │
│  │                     │ → Uses: full-document-access skill              │
│  │                     │ → Returns: Structured analysis summaries        │
│  │  (deep access)      │ → Only agent that reads methodology/results    │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────┐                                                │
│  │   section-writer    │ → Access: Full papers (markdown)               │
│  │                     │ → Reads: .research/papers/*.md                 │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────┐                                                │
│  │   section-critic    │ → Access: Written sections + sources           │
│  │                     │ → Reviews: Quality, citations, facts            │
│  └─────────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Information Compartmentalization

Each agent has **strict, enforced access boundaries** to prevent context window explosion:

| Agent | Access Level | What's Blocked | Purpose |
| ----- | ------------ | -------------- | ------- |
| **manager** | Summaries only | Full papers, methodology, results | Orchestration, synthesis |
| **researcher** | Abstracts + 50 lines | Methodology, results, appendices | Discovery, search |
| **scientist** | Full content | Nothing blocked | Deep analysis, data extraction |
| **section-writer** | Full papers (markdown) | Source PDFs | Writing body sections |
| **section-critic** | Sections + sources | Raw data | Quality review |

## Agent Responsibilities

| Agent                | Access                           | Writes                    | Tools                  |
| -------------------- | -------------------------------- | ------------------------- | ---------------------- |
| **research-manager** | Summaries only (NO full papers) | Abstract, Intro, Conclusions | read,grep,find,ls,bash |
| **researcher**       | Abstracts + first 50 lines max   | Paper discovery, metadata   | read,grep,find,ls,bash |
| **scientist**        | FULL CONTENT (all sections)      | Deep analysis, methodology  | read,grep,find,ls,bash |
| **section-writer**   | Full papers (markdown)           | Body sections              | read,grep,find,ls,bash |
| **section-critic**   | Sections + sources              | Quality reviews            | read,grep,find,ls,bash |

## Components

### Agents (`.pi/agents/`)

**Research Team Agents:**

| Agent                 | Access Level | Purpose                                          |
| --------------------- | ------------ | ------------------------------------------------ |
| `research-manager.md` | Summaries only | Orchestrates workflow, writes framework — NEVER reads full content |
| `researcher.md` | Abstracts + 50 lines | Searches papers, downloads, parses — limited to surface info |
| `scientist.md` | **Full content** | Deep analysis of papers and methodologies — has complete access |
| `section-writer.md` | Full papers (markdown) | Writes body sections using parsed markdown |
| `section-critic.md` | Sections + sources | Reviews sections for quality and compliance |
| `research.md` | General | General research coordinator |
| `teams.yaml` | Configuration | Team configuration with information flow rules |

**Development Pipeline Agents:**

| Agent              | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `scout.md`         | Deep codebase exploration and reconnaissance  |
| `planner.md`       | Creates detailed implementation plans         |
| `builder.md`       | Implements features and fixes                 |
| `reviewer.md`      | Reviews code for bugs, style, and correctness |
| `plan-reviewer.md` | Critically reviews implementation plans       |
| `documenter.md`    | Generates documentation                       |
| `red-team.md`      | Security and adversarial testing              |
| `bowser.md`        | Web browsing and scraping agent               |

### Skills (`.pi/skills/`)

**Role-Restricted Search** (`.pi/skills/role-restricted-search/`):

Web search with **automatic content filtering based on calling agent's role**:

| Role | Output | Limit | What They See |
| ---- | ------ | ----- | ------------- |
| `manager` | Title + 1-line summary | 10 results | Truncated overview only |
| `researcher` | Title + abstract + key points | 20 results | Full abstracts + bullets |
| `scientist` | Title + full snippet + URLs | 30 results | Complete search data |
| (unknown) | Title + 1-line summary | 5 results | Minimal fallback |

| Script | Purpose |
| ------ | ------- |
| `search.sh` | Main entry — detects role and filters accordingly |
| `api-search.sh` | Brave API wrapper for search requests |
| `filter-summaries.js` | Strips to titles + 1-line descriptions |
| `filter-abstracts.js` | Returns abstracts + key points |
| `filter-full.js` | Returns complete snippet data |

**Full Document Access** (`.pi/skills/full-document-access/`):

Scientist-only document fetcher with **role verification**:

| Caller Role | Access | Content |
|-------------|--------|---------|
| `scientist` | ✅ Full | All sections including appendices |
| `researcher` | ❌ Denied | Must delegate to scientist |
| `manager` | ❌ Denied | Must delegate to scientist |
| (unknown) | ❌ Denied | Role verification required |

| Script | Purpose |
| ------ | ------- |
| `fetch-document.sh` | Verifies role, blocks non-scientists |
| `fetch-doc.js` | Fetches and caches full document content |

**Research Workflow** (`.pi/skills/research-workflow/`):

Shell scripts for paper discovery:

| Script        | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `search.sh`   | Search arXiv, Semantic Scholar (returns abstracts) |
| `download.sh` | Download PDF + parse with LiteParse → markdown     |
| `extract.sh`  | Extract text from PDFs (fallback)                  |
| `analyze.sh`  | Analyze citations                                  |
| `report.sh`   | Generate reports                                   |
| `setup.sh`    | Install dependencies (Python packages, LiteParse)  |

**Bowser** (`.pi/skills/bowser/`):

Web browsing and scraping capabilities for research agents.

### Extensions (`extensions/`)

| Extension                  | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `research-pipeline.ts`     | Two-phase research: search abstracts → sub-agent deep reading   |
| `research-tui.ts`          | Grid-style team dashboard with parallel agent queries           |
| `research-tree.ts`         | **Tree-style dashboard with activity icons and metadata**       |
| `research-orchestrator.ts` | Full pipeline orchestration with /research workflow             |
| `langfuse-trace.ts`        | Langfuse observability integration                              |
| `agent-chain.ts`           | Sequential pipeline orchestrator (plan→build→review)          |
| `agent-team.ts`            | Team dispatcher with team select and grid dashboard             |
| `pi-pi.ts`                 | Meta-agent for building Pi agents with parallel expert research |
| `subagent-widget.ts`       | Background subagents with live streaming widgets                |
| `damage-control.ts`        | Safety auditing for dangerous bash commands                     |
| `session-replay.ts`        | Scrollable timeline overlay of session history                  |
| `theme-cycler.ts`          | Theme switching (Ctrl+X forward, Ctrl+Q backward)               |
| `pure-focus.ts`            | Strip footer and status line for distraction-free coding        |

## The Solution: Multi-Phase Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Search                                                │
│  Researcher → ONLY titles, abstracts (role-filtered)          │
│                                                                 │
│  PHASE 2: Download & Parse                                      │
│  Researcher → Download PDFs + LiteParse → Markdown           │
│  Papers stored: .research/papers/<arxiv-id>.md                 │
│                                                                 │
│  PHASE 3: Deep Analysis (Scientist Only)                       │
│  Scientist → Reads FULL content → Returns structured summary   │
│  Manager NEVER sees full content, only scientist's summary     │
│                                                                 │
│  PHASE 4: Section Writing                                       │
│  Section-writer → Reads full markdown → Writes body section    │
│                                                                 │
│  PHASE 5: Review                                                │
│  Section-critic → Validates quality, citations, compliance     │
│                                                                 │
│  PHASE 6: Framework                                             │
│  Manager → Writes Abstract, Intro, Conclusions (from summaries)│
└─────────────────────────────────────────────────────────────────┘
```

## Paper Download & Parse Workflow

### Using LiteParse

Papers are downloaded and parsed using **LiteParse** (@llamaindex/liteparse):

```bash
# Install LiteParse
npm i -g @llamaindex/liteparse

# Download and parse a paper
/research-workflow/scripts/download.sh <arxiv-id>
```

### What Happens

```
1. Download PDF: .research/papers/<arxiv-id>.pdf
2. Parse with LiteParse: .research/papers/<arxiv-id>.md
3. Output: Markdown preview shown in terminal
```

### LiteParse Benefits

- **Fast**: Agent-optimized parsing, no GPU required
- **Layout-aware**: Preserves spatial relationships (tables, columns)
- **Markdown output**: Ready for LLM consumption
- **OCR support**: Automatic for scanned pages
- **Local**: Runs entirely offline, no API needed

## Data Structure

Project-relative path: `.research/` (at `/Users/maurobenetti/Documents/Datascience/pi-vs-claude-code/.research/`)

```
.research/
├── papers/
│   ├── 2103.14030.pdf    # Original PDF
│   ├── 2103.14030.md      # LiteParse markdown output
│   ├── 2103.14030.txt     # Fallback text extraction
│   └── ...
├── cache/                 # Search results (JSON)
├── reports/              # Generated reports
└── notes/                # Research notes
```

## Team Configuration

```yaml
# .pi/agents/teams.yaml

research-team:
  - research-manager     # Summaries only — orchestrator
  - researcher           # Abstracts + 50 lines — discovery
  - scientist            # Full content — deep analysis
  - section-writer       # Full papers — writing
  - section-critic       # Sections + sources — review

report-writing-team:
  - research-manager      # Abstract, Intro, Conclusions
  - section-writer        # Body sections
  - section-critic        # Quality review
```

### Information Flow Rules

```
┌─────────────────────────────────────────────────────────┐
│  CONTENT ACCESS MATRIX                                   │
├─────────────────────────────────────────────────────────┤
│  Content Type      │ manager │ researcher │ scientist   │
│  ─────────────────────────────────────────────────────  │
│  Search results    │ ❌      │ ✅          │ ✅          │
│  Summaries         │ ✅      │ ✅          │ ✅          │
│  Abstracts         │ ❌      │ ✅          │ ✅          │
│  First 50 lines    │ ❌      │ ✅          │ ✅          │
│  Full text         │ ❌      │ ❌          │ ✅          │
│  Methodology       │ ❌      │ ❌          │ ✅          │
│  Raw data          │ ❌      │ ❌          │ ✅          │
│  Appendices        │ ❌      │ ❌          │ ✅          │
└─────────────────────────────────────────────────────────┘
```

### Delegation Patterns

**Manager → Researcher:**
```
[DELEGATE:researcher] Search for: "quantum computing applications"
[DELEGATE:researcher] Find abstracts on: "machine learning healthcare"
[DELEGATE:researcher] Get first 50 lines of: paper-123
```

**Manager/Researcher → Scientist:**
```
[DELEGATE:scientist] Full analysis of: paper-123
[DELEGATE:scientist] Extract: methodology from paper-123
[DELEGATE:scientist] Compare: results of paper-123 vs paper-124
```

## Quick Start

### Compartmentalization Setup

```bash
# The skills handle role-based filtering automatically
# No additional configuration needed — just use the agents

# Launch with role-restricted search
pi -e extensions/research-orchestrator.ts

# Manager will delegate searches to researcher
# Researcher will see only abstracts
# Scientist will be called for full content (never manager directly)
```

### 2. Launch Research Team

```bash
# Via justfile
just research

# TUI Dashboard options:
# Grid-style (cards)
pi -e extensions/research-tui.ts

# Tree-style (one line per agent with activity icons)
pi -e extensions/research-tree.ts

# Or with theme cycler (justfile)
just ext-research-tree

# Combined (tree + theme cycler + langfuse)
pi -e extensions/research-tree.ts -e extensions/langfuse-trace.ts
```

### 3. Define Research Goal

The manager will ask clarifying questions:
- What specific aspect interests you?
- Do you want foundational papers, recent advances, or comprehensive coverage?
- What citation style and report structure do you need?

### 4. Researcher Searches (Role-Restricted)

```bash
/research-workflow/scripts/search.sh "transformer attention mechanism" 10
# Returns: Titles + abstracts only (researcher role)

# For scientist access to full results:
ROLE=scientist .pi/skills/role-restricted-search/scripts/search.sh "transformer attention"
# Returns: Full snippets + URLs + relevance scores
```

Returns titles, authors, abstracts only.

### 5. Manager Selects Papers → Researcher Downloads

```bash
/research-workflow/scripts/download.sh 1706.03762
```

Output:
```
📥 Downloading: 1706.03762
  ✅ Downloaded: 2.1M
  📄 Parsing with LiteParse...
  ✅ Parsed: 154 lines
📁 .research/papers/1706.03762.md
```

### 6. Section-Writer Reads Papers

```bash
# List available papers
ls -la .research/papers/

# Read paper markdown
cat .research/papers/1706.03762.md

# Search across papers
grep -n "methodology" .research/papers/*.md
```

### 7. Section-Critic Reviews

The critic receives:
- Written section content
- Source papers (markdown)
- Citation style requirements
- Section requirements

Returns structured review:
```markdown
# Section Review: Methodology

## Overall Assessment
⚠ NEEDS REVISION

## Requirements Compliance
| Requirement          | Status | Notes               |
| -------------------- | ------ | ------------------- |
| Describe methodology | ✓      | Complete            |
| Cite sources         | ⚠      | Inconsistent format |
| Technical accuracy   | ✓      | Accurate            |

## Citation Style Check
In-text citations: ⚠ Need [Author, Year] format
Reference format: ✗ Missing year field

## Recommendations
1. Fix citation format on line 45
2. Add methodology comparison in section 2.2
```

---

## Agent Chains (`agent-chain.yaml`)

Pre-defined sequential pipelines for structured workflows:

### `plan-build-review`
Standard development cycle: Plan → Build → Review

```yaml
steps:
  - agent: planner      → Plan implementation
  - agent: builder      → Implement the plan
  - agent: reviewer     → Review for bugs, style, correctness
```

### `plan-build`
Fast two-step implementation without review.

### `scout-flow`
Triple-scout deep reconnaissance:
1. **Scout #1**: Explore codebase, report findings
2. **Scout #2**: Validate and cross-check analysis
3. **Scout #3**: Final review pass, add missing details

### `plan-review-plan`
Iterative planning:
1. **Planner**: Create initial plan
2. **Plan-Reviewer**: Critically review, find gaps
3. **Planner**: Revise based on critique

### `full-review`

End-to-end pipeline:
1. **Scout**: Explore and identify issues
2. **Planner**: Create implementation plan
3. **Builder**: Implement the plan
4. **Reviewer**: Final review

**Variables supported:** `$INPUT` (current step), `$ORIGINAL` (original request)

---

## Pi-Pi: Meta-Agent Team

Pi-Pi is a meta-agent that builds Pi agents with parallel expert research.

### Orchestrator

`pi-orchestrator.md` — Coordinates parallel expert queries:

```javascript
query_experts([
  {expert: "ext-expert", question: "How do I register a tool?"},
  {expert: "theme-expert", question: "How do I define a color token?"}
])
```

### Expert Specialists (`.pi/agents/pi-pi/`)

| Expert              | Domain                                           |
| ------------------- | ------------------------------------------------ |
| `ext-expert`        | Extensions — tools, events, commands, rendering  |
| `theme-expert`      | Themes — JSON format, 51 color tokens, vars      |
| `skill-expert`      | Skills — multi-file packages, scripts            |
| `config-expert`     | Settings — providers, models, packages           |
| `tui-expert`        | TUI — components, keyboard input, overlays      |
| `prompt-expert`     | Prompt templates — single-file .md commands     |
| `agent-expert`      | Agent definitions — .md personas, teams.yaml    |
| `keybinding-expert` | Keyboard shortcuts — registerShortcut(), Key IDs |

---

## Advanced Features

### Background Subagents (`subagent-widget.ts`)

Spawn persistent subagents with live widgets:

```bash
/sub explore the codebase and summarize
/subcont 1 add test coverage
/subrm 2              # Remove subagent #2
/subclear             # Clear all widgets
```

### Damage Control (`damage-control.ts`)

Safety auditing for dangerous bash commands:
- Blocks `rm -rf`, `git reset --hard`, etc.
- Optional confirmation prompts
- Configurable in `.pi/damage-control-rules.yaml`

### Session Replay (`session-replay.ts`)

Scrollable timeline overlay showing full session history.

### Pure Focus (`pure-focus.ts`)

Distraction-free mode: strips footer and status line.

---

## Justfile Quick Reference

| Command                          | What it does                           |
| -------------------------------- | -------------------------------------- |
| `just pi`                        | Start Pi with defaults                 |
| `just pure-focus`                | Pi with distraction-free mode          |
| `just minimal`                   | Pi with context meter                  |
| `just research`                  | Research pipeline                      |
| `just ext-research-tree`         | Tree dashboard + theme cycler          |
| `just ext-research-pipeline`     | Research pipeline                      |
| `just ext-research-orchestrator` | Full orchestration                     |
| `just ext-subagent-widget`       | Background subagents                   |
| `just ext-agent-chain`           | Sequential pipelines                   |
| `just ext-pi-pi`                 | Meta-agent team                        |
| `just ext-damage-control`        | Safety auditing                        |
| `just ext-session-replay`        | Session history overlay                |
| `just ext-theme-cycler`          | Theme switching                        |
| `just all`                       | Open every extension in a new terminal |

## Report Structure

The final report is assembled as follows:

```markdown
# Research Report: [Topic]

## Abstract                    ← Written by MANAGER (summaries only)
[Brief overview of findings]

## Introduction                ← Written by MANAGER (summaries only)
[Research context and motivation]

## [Section 1]                 ← Written by SECTION-WRITER (full papers)
[Body content with proper citations]
Reviewed by: SECTION-CRITIC ✓

## [Section 2]                 ← Written by SECTION-WRITER (full papers)
[Body content with proper citations]
Reviewed by: SECTION-CRITIC ✓

## [Section 3]                 ← Written by SECTION-WRITER (full papers)
[Body content with proper citations]
Reviewed by: SECTION-CRITIC ✓

## Conclusions                 ← Written by MANAGER (summaries only)
[Synthesis of all findings, implications, future directions]

## References                  ← Compiled from all sections
```

## Information Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  COMPARTMENTALIZED FLOW                                          │
│                                                                  │
│  User Request ──► Manager (sees: summaries)                     │
│                        │                                         │
│                        ▼ (delegate: search)                     │
│                  Researcher (sees: abstracts + 50 lines)        │
│                        │                                         │
│                   Need full content?                            │
│                        │                                         │
│                        ▼ (delegate: full analysis)              │
│                  Scientist (sees: everything)                   │
│                        │                                         │
│                        ▼ (returns: structured summary)          │
│                  Manager (sees: summary only)                   │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════ │
│  RULES:                                                         │
│  • Manager NEVER reads full content directly                   │
│  • Manager NEVER calls web_search                              │
│  • Scientist NEVER returns full paper text to manager          │
│  • All full content stays with scientist (or section-writer)    │
│  • role-restricted-search automatically filters by role        │
│  ═══════════════════════════════════════════════════════════════ │
└─────────────────────────────────────────────────────────────────┘
```

## Example Workflow (Compartmentalized)

```
User: I need a report on transformer architectures

Manager: I will delegate all content requests.

Manager ──► [DELEGATE:researcher] Search for: transformer self-attention

Researcher: [role-restricted-search returns: abstracts only]
  → Found 10 papers
  → Manager sees: titles + 2-sentence abstracts

Manager ──► [DELEGATE:researcher] Get first 50 lines of: paper-123

Researcher: [limited to 50 lines]
  → Manager sees: first excerpt only

Manager ──► [DELEGATE:scientist] Full methodology analysis of: paper-123

Scientist: [full-document-access grants full access]
  → Reads complete methodology section
  → Returns structured analysis summary to manager
  → Manager NEVER sees full paper text

Scientist ──► "Methodology Summary: [key points only]"

Manager: Assembles report from summaries only.
```

## Dependencies

Required tools:
- `uv` - Python package runner
- `npm` - Node.js package manager
- `LiteParse` - Document parsing (`npm i -g @llamaindex/liteparse`)
- `arxiv` - arXiv Python client
- `curl` - Semantic Scholar API calls

Install all dependencies:
```bash
/research-workflow/scripts/setup.sh
npm i -g @llamaindex/liteparse
```

---

## Langfuse Tracing Integration

The research team supports **Langfuse** for observability and tracing of all agent activities.

### Installation

```bash
bun add langfuse-node
```

### Configuration

Set environment variables (or add to your `.env`):

```bash
export LANGFUSE_SECRET_KEY=sk-lf-ecc37e61-4032-46e1-8301-2bfab4edf9d0
export LANGFUSE_PUBLIC_KEY=pk-lf-373008f0-c284-4afc-9a7c-d8b891866fd3
export LANGFUSE_BASE_URL=http://192.168.0.186:3000
export LANGFUSE_TAGS=research,pi-agent
export LANGFUSE_ENVIRONMENT=development
```

### Usage

Launch Pi with the Langfuse extension:

```bash
pi -e extensions/langfuse-trace.ts
```

Or with the research TUI for team tracing:

```bash
pi -e extensions/langfuse-trace.ts -e extensions/research-tui.ts
```

```
pi -e extensions/research-tree.ts -e extensions/langfuse-trace.ts
```

## Research Tree Dashboard (`extensions/research-tree.ts`)

A tree-style TUI dashboard that shows one line per agent with **activity indicators**:

### Visual Format

```
  Research Team  │  research-team
  ─────────────────────────────────────────────────

  ◉ 🔍📄 researcher   Context: 12 messages    (45s) [3 tools]
  ✓ 📖 scientist     Complete               (120s) [5 tools]
  ○ section-writer   Analyzing methodology...
  ✗ section-critic   Error (exit 1)

  ◉ 1 active · 1/4 done
  ↑↓ navigate  ↑ space toggle  esc close
```

### Activity Icons

| Icon | Meaning        |
| ---- | -------------- |
| 📄    | Context loaded |
| 🔍    | Web search     |
| 📖    | Reading        |
| ✏️    | Writing        |
| 🔧    | Editing        |
| ⚙️    | Bash/execution |
| 🔎    | Grep           |
| 📂    | Find           |
| 📋    | LS             |
| 🔨    | Custom tool    |

### Status Icons

| Icon | Status               |
| ---- | -------------------- |
| `◉`  | Researching (active) |
| `✓`  | Done (completed)     |
| `○`  | Idle (waiting)       |
| `✗`  | Error (failed)       |

### Commands

| Command                 | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `/research-tree [team]` | Load a team from teams.yaml (default: research-team) |
| `/tree-status`          | Show current agent status and activity               |

### Real-Time Tracking

The tree dashboard automatically tracks:
- **Context loading** — when messages enter the agent's context
- **Tool execution** — every tool call is tracked and displayed
- **Elapsed time** — live countdown per agent
- **Tool count** — total tools used per agent
- **Current task** — last output line or active tool name

### Launch

```bash
# With default research-team
pi -e extensions/research-tree.ts

# Switch to another team
/research-tree literature-team

# With theme cycler (justfile)
just ext-research-tree
```

### What Gets Traced

| Event               | Span Name                | Tracked Data                                |
| ------------------- | ------------------------ | ------------------------------------------- |
| `session_start/end` | `trace`                  | Teams, metadata, version                    |
| `agent_start/end`   | `agent.<name>`           | Model, provider, tools, token usage         |
| `turn_start/end`    | `agent.turn-N`           | Turn index, tool results, completion tokens |
| `before/after LLM`  | `llm.<provider>.<model>` | System prompt length, messages, temperature |
| `tool_execution`    | `tool.<name>`            | Args (redacted), result preview, duration   |
| `message_stream`    | `message.<role>`         | Streaming tokens, content length            |

### Traced Agents

All research team agents have `tracing: true` enabled:

```yaml
# .pi/agents/research-manager.md
tracing: true
tracing_tags:
  - research
  - orchestration
  - report-writing

# .pi/agents/researcher.md
tracing: true
tracing_tags:
  - research
  - paper-discovery
  - liteparse

# .pi/agents/scientist.md
tracing: true
tracing_tags:
  - research
  - deep-analysis

# .pi/agents/section-writer.md
tracing: true
tracing_tags:
  - research
  - writing
  - report-sections

# .pi/agents/section-critic.md
tracing: true
tracing_tags:
  - research
  - review
  - quality-assurance
```

### Commands

| Command                         | Description                               |
| ------------------------------- | ----------------------------------------- |
| `/langfuse-score accuracy 0.85` | Score the last traced turn (0-1)          |
| `/langfuse-flush`               | Flush pending traces to server            |
| `/langfuse-status`              | Check tracing status and current trace ID |

### Example Output

```
📊 Langfuse tracing enabled
📊 Langfuse trace: trace-1234567890-abc123
📊 Agent started: researcher (openrouter/google/gemini-3-flash-preview)
📊 Agent ended: researcher
📊 Traces flushed
```

### View Traces

Open Langfuse dashboard at `http://192.168.0.186:3000` to view:
- All agent traces with nested spans
- Token usage and costs
- Tool execution times
- Message content and metadata

---

## Prompt Templates (`.pi/prompts/`)

**research-team-launch.md** — Launches compartmentalized research team:

```markdown
# Research Team Launch

You are about to start a research project with strict information compartmentalization.

## Your Team

| Agent | Access | Role |
|-------|--------|------|
| **You (Manager)** | Summaries only | Orchestration, synthesis, reporting |
| **researcher** | Abstracts + 50 lines | Discovery, search, surface analysis |
| **scientist** | Full content | Deep analysis, data extraction |

## Information Flow

    You (Manager)
         │
         ▼
    [researcher] ← Sees only abstracts/summaries
         │
    Need full content?
         │
         ▼
    [scientist] ← Has full access, returns summary
         │
         ▼
    You (Manager) ← Sees only returned summary
```

Usage: `/research-team-launch "quantum computing healthcare" "drug discovery"`

## Tool Reference

### query_researchers

Query multiple research agents in parallel:

```javascript
query_researchers({
  queries: [
    { agent: "researcher", question: "Search for papers on neural architecture search" },
    { agent: "scientist", question: "Analyze the methodology of paper 2103.14030" }
  ]
})
```

### Shell Scripts

```bash
# Search academic databases
/research-workflow/scripts/search.sh "<query>" <max-results>

# Download and parse paper
/research-workflow/scripts/download.sh <arxiv-id>

# Analyze papers
/research-workflow/scripts/analyze.sh

# Generate report
/research-workflow/scripts/report.sh

# Role-restricted search (filters by calling agent)
/pi/skills/role-restricted-search/scripts/search.sh "<query>" --num 10

# Full document access (scientist only)
/pi/skills/full-document-access/scripts/fetch-document.sh <url> --section methodology
```