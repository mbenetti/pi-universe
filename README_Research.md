# 🔬 Research Pipeline for Pi

A **multi-phase research workflow** with specialized agents that prevent context window explosion when analyzing academic papers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  RESEARCH TEAM                                                          │
│                                                                         │
│  ┌─────────────────┐                                                     │
│  │ research-manager │ → Writes: Abstract, Introduction, Conclusions     │
│  │ (Abstracts only) │ ← Receives: Paper summaries from sub-agents       │
│  └────────┬────────┘                                                     │
│           │                                                              │
│  ┌────────┴────────┐                                                     │
│  │    researcher    │ → Downloads papers, parses with LiteParse         │
│  │ (Returns metadata│ → Spawns sub-agents for deep analysis             │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐                                                     │
│  │  section-writer │ → Writes: Body sections (full paper access)        │
│  │  (Full papers)  │ ← Reads: .research/papers/*.md                     │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐                                                     │
│  │  section-critic  │ → Reviews: Quality, citations, facts              │
│  │  (Sections + src)│ ← Validates: Requirements compliance              │
│  └─────────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Agent Responsibilities

| Agent                | Access                     | Writes                                     | Tools                  |
| -------------------- | -------------------------- | ------------------------------------------ | ---------------------- |
| **research-manager** | Abstracts only             | Abstract, Introduction, Conclusions        | read,grep,find,ls,bash |
| **researcher**       | Metadata                   | Paper discovery, download, parsing         | read,grep,find,ls,bash |
| **section-writer**   | Full papers (markdown)     | Body sections (methodology, results, etc.) | read,grep,find,ls,bash |
| **section-critic**   | Written sections + sources | Quality reviews with actionable feedback   | read,grep,find,ls,bash |

## Components

### Agents (`.pi/agents/`)

**Research Team Agents:**

| Agent                 | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `research-manager.md` | Orchestrates workflow, writes framework elements |
| `researcher.md`       | Searches papers, downloads, parses to markdown   |
| `scientist.md`        | Deep analysis of papers and methodologies        |
| `section-writer.md`   | Writes body sections using full paper content    |
| `section-critic.md`   | Reviews sections for quality and compliance      |
| `research.md`         | General research coordinator                     |
| `teams.yaml`          | Team configuration                               |

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
| `agent-chain.ts`           | Sequential pipeline orchestrator (plan→build→review)            |
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
│  Researcher → ONLY titles, authors, abstracts (truncated)      │
│                                                                 │
│  PHASE 2: Download & Parse                                      │
│  Researcher → Download PDFs + LiteParse → Markdown            │
│  Papers stored: .research/papers/<arxiv-id>.md                  │
│                                                                 │
│  PHASE 3: Section Writing                                       │
│  Section-writer → Reads full markdown → Writes body section    │
│                                                                 │
│  PHASE 4: Review                                                │
│  Section-critic → Validates quality, citations, compliance     │
│                                                                 │
│  PHASE 5: Framework                                             │
│  Manager → Writes Abstract, Intro, Conclusions                 │
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
  - researcher           # Searches, downloads, parses
  - research-manager     # Orchestrates, writes framework
  - scientist            # Deep analysis (optional)
  - section-writer        # Writes body sections
  - section-critic        # Reviews sections

report-writing-team:
  - research-manager      # Abstract, Intro, Conclusions
  - section-writer        # Body sections
  - section-critic        # Quality review
```

## Quick Start

### 1. Setup Dependencies

```bash
# Install Python packages and LiteParse
/research-workflow/scripts/setup.sh
npm i -g @llamaindex/liteparse
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

### 4. Researcher Searches Papers

```bash
/research-workflow/scripts/search.sh "transformer attention mechanism" 10
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
| `tui-expert`        | TUI — components, keyboard input, overlays       |
| `prompt-expert`     | Prompt templates — single-file .md commands      |
| `agent-expert`      | Agent definitions — .md personas, teams.yaml     |
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

## Abstract                    ← Written by MANAGER (abstracts only)
[Brief overview of findings]

## Introduction                ← Written by MANAGER (abstracts only)
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

## Conclusions                 ← Written by MANAGER (abstracts only)
[Synthesis of all findings, implications, future directions]

## References                  ← Compiled from all sections
```

## Information Flow

```
Manager (abstracts) ─────────────────────────────► Abstract/Intro/Conclusions
         │
         ▼ (abstracts only)
Researcher (metadata) ────────────────────────────► Search results, metadata
         │
         ▼ (download & parse)
    .research/papers/*.md ──────────────────────────► Section-writer (full papers)
         │
         ▼ (written sections)
Section-critic (sections + sources) ─────────────► Quality review
         │
         ▼ (approved sections)
    Manager (assembles final report)
```

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
```

## Example Workflow

```
User: I need a report on transformer architectures

Manager: Let me clarify the scope:
1. What specific aspects? (attention, architecture, applications)
2. Depth level? (foundational, recent advances, comprehensive)
3. Citation style? (APA, IEEE, MLA)

User: Focus on self-attention mechanisms, comprehensive coverage, IEEE style

Researcher: Searching arXiv...
Found 10 papers for "self-attention transformer"

Manager: Selecting 5 most relevant papers...

Researcher: Downloading and parsing...
✅ 2103.14030.md - Attention Is All You Need
✅ 1810.04805.md - BERT: Pre-training...
✅ 1706.03762.md - The Annotated Transformer
...

Section-writer (Methodology): Reading .research/papers/*.md
Writing methodology section with citations [Vaswani, 2017], [Devlin, 2018]...

Section-critic: Reviewing methodology section
✓ Citation format: IEEE compliant
✓ Technical accuracy: Verified
⚠ Minor: Expand comparison in section 2.3

Section-writer (Results): Reading .research/papers/*.md
Writing results section...

[Repeat for each body section]

Manager: Assembling final report...
Writing Abstract, Introduction, Conclusions based on all sections...

Final Report:
# Self-Attention Mechanisms in Transformer Architectures

## Abstract
[Manager writes from abstracts + section summaries]

## Introduction
[Manager writes from understanding of full structure]

## Methodology
[Section-writer writes from full papers]
Reviewed by: Section-critic ✓

## Results
[Section-writer writes from full papers]
Reviewed by: Section-critic ✓

## Analysis & Discussion
[Section-writer writes from full papers]
Reviewed by: Section-critic ✓

## Conclusions
[Manager writes synthesis of all findings]
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
