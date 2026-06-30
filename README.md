# pi-universe — The Ultimate Pi Extensions Suite

This is a fork from : https://github.com/disler/pi-vs-claude-code.git with some modifications.

A comprehensive workspace of customized instances, widgets, and multi-agent orchestrations for the [Pi Coding Agent](https://github.com/mariozechner/pi-coding-agent). This suite showcases how to completely customize the TUI/UI layout, implement real-time safety auditing firewalls, sync commands across other coding packages, and orchestrate advanced background agent chains.

<div align="center">
  <img src="./images/pi-universe.jpg" alt="pi-universe" width="700">
</div>

---

## Prerequisites

All three are required:

| Tool            | Purpose                   | Install                                                    |
| --------------- | ------------------------- | ---------------------------------------------------------- |
| **Bun** ≥ 1.3.2 | Runtime & package manager | [bun.sh](https://bun.sh)                                   |
| **just**        | Task runner               | `brew install just`                                        |
| **pi**          | Pi Coding Agent CLI       | [Pi docs](https://github.com/mariozechner/pi-coding-agent) |

---

## API Keys

Pi does **not** auto-load `.env` files — API keys must be present in your shell's environment **before** you launch Pi. A sample file is provided:

```bash
cp .env.sample .env   # copy the template
# open .env and fill in your keys
```

`.env.sample` covers the four most popular providers:

| Provider         | Variable             | Get your key                                                                                               |
| ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| OpenAI           | `OPENAI_API_KEY`     | [platform.openai.com](https://platform.openai.com/api-keys)                                                |
| Anthropic        | `ANTHROPIC_API_KEY`  | [console.anthropic.com](https://console.anthropic.com/settings/keys)                                       |
| Google           | `GEMINI_API_KEY`     | [aistudio.google.com](https://aistudio.google.com/app/apikey)                                              |
| OpenRouter       | `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai/keys)                                                                |
| Many Many Others | `***`                | [Pi Providers docs](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/providers.md) |

### Sourcing your keys

Pick whichever approach fits your workflow:

**Option A — Source manually each session:**
```bash
source .env && pi
```

**Option B — One-liner alias (add to `~/.zshrc` or `~/.bashrc`):**
```bash
alias pi='source $(pwd)/.env && pi'
```

**Option C — Use the `just` task runner (auto-wired via `set dotenv-load`):**
```bash
just pi           # .env is loaded automatically for every just recipe
just ext-minimal  # works for all recipes, not just `pi`
```

---

## Installation

You can deploy and use this extension suite either by installing it as a global package across any computer (quickest route) or by cloning the repository for local development.

### Option A: Global Installation (Recommended)
This requires no manual repository cloning. Install the complete workspace of extensions, skills, prompts, and custom themes directly onto any machine running Pi with a single command:

```bash
pi install git:github.com/mbenetti/pi-universe.git
```

This registers the complete suite under your global `~/.pi/agent/` cache, automatically builds dependencies (such as `yaml` and `langfuse-node`), and registers all visual assets.

---

### Option B: Local Developer Checkout
To run and modify extensions from a local clone:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mbenetti/pi-universe.git
   cd pi-universe
   ```
2. **Install local dependencies:**
   ```bash
   bun install
   ```

---

## 🚀 Starting Pi for the First Time (Quick Start Guide)

When launching `pi` with this package loaded, here is what you will experience and how to interact with it:

### 1. Declaring Your Session Intent (The Purpose Gate)
On startup, you will be prompted with:
```
 What is the purpose of this agent?
 > 
```
* **What to type:** Simply type a short, one-sentence goal of what you want to accomplish in this session (e.g., `Review files and verify extensions` or `I want to research quantum computing in healthcare`) and press **Enter**.
* **What happens:** Your declared purpose is locked in and pinned as a **persistent widget** on your active terminal screen, keeping you and the model aligned. The interactive prompt `> ` will open up immediately.

### 2. Solving Theme Loading Warnings ("Failed to load theme Dracula")
If your startup displays a theme load warning like:
`Error: Failed to load theme "dracula": Theme not found: dracula`
* **What to do:** Do not worry! Since Pi falls back gracefully, you can hot-swap themes on the fly. Simply press **`F5`** (cycle forward) or **`F4`** (cycle backward) on your keyboard, or type **`/theme`** directly inside your prompt to pop open an interactive visual picker and select from 11 gorgeous cosmos themes (such as `synthwave`, `everforest`, or `midnight-ocean`)!

### 3. Folder-Independent Agent Fallbacks (Zero Configuration)
If you run `pi` inside a clean / empty directory (like a barren `/workspaces/uv` container folder), you might see `No agents found` or `teams.yaml not found`.
* **What to do:** Absolutely nothing! `pi-universe` is engineered with **Automatic Package Fallback Resolution**. It will automatically detect that you are in a clean directory and load all your named specialist agents (like `scout`, `scientist`, `research-manager`), pipeline templates, and team sets (`teams.yaml`) directly from its global package folder as a fallback!

---

## Usage & Levels of Pi

You can mix, match, and stack layers of these extensions. Choose the "Level" that maps to your immediate productivity goals.

### Running with Global Installation
If you installed globally via `pi install`, trigger your extensions using their package specifiers:
```bash
pi -e pi-universe/extensions/minimal.ts
# Or stack multiple:
pi -e pi-universe/extensions/purpose-gate.ts -e pi-universe/extensions/minimal.ts
```
To enable or disable specific parts of your package, run:
```bash
pi config
```

### 💡 Universal Shell Aliases (Shorthand for Global Installs)

If you installed globally via `pi install` and do not want to clone the repository to use `just` recipes, you can add these fast shorthand aliases directly to your shell configuration file (`~/.bashrc` or `~/.zshrc`). This gives you the **exact same short-key convenience anywhere on your system**:

```bash
# Level 1: Aesthetics & Layouts
alias pi-focus='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/pure-focus.ts'
alias pi-minimal='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/minimal.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/theme-cycler.ts'

# Level 2: Task HUDs & Disciplines
alias pi-gate='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/purpose-gate.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/minimal.ts'
alias pi-tilldone='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/tilldone.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/theme-cycler.ts'
alias pi-counter='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/tool-counter.ts'
alias pi-widgets='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/tool-counter-widget.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/minimal.ts'
alias pi-replay='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/session-replay.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/minimal.ts'

# Level 3: Personas & Security
alias pi-system='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/system-select.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/minimal.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/theme-cycler.ts'
alias pi-safety='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/damage-control.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/minimal.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/theme-cycler.ts'
alias pi-trace='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/langfuse-trace.ts'
alias pi-zettel='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/zettelkasten-protection.ts'

# Level 4: Orchestration, Teams & Pipelines
alias pi-team='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/agent-team.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/theme-cycler.ts'
alias pi-pi='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/pi-pi.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/theme-cycler.ts'
alias pi-chain='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/agent-chain.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/theme-cycler.ts'
alias pi-research='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/research-pipeline.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/theme-cycler.ts'
alias pi-mcp='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/mcp-research.ts'
alias pi-smartsearch='pi -ne -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/tavily-search.ts -e ~/.pi/agent/git/github.com/mbenetti/pi-universe/extensions/minimal.ts'
```

Once pasted, simply reload your terminal (`source ~/.zshrc` or `source ~/.bashrc`) and type **`pi-team`** or **`pi-pi`** from *any* folder on your machine!

---

### Running with a Local Clone (`just` Recipes)
If you did a local developer checkout, we provide pre-packaged commands bundled into **4 progressive levels** of developer experience. Use the `just` task runner to fire up any level instantly.

---

### 🎨 Level 1: Minimalist Layouts & Aesthetic Customizations
Focuses entirely on cleaning up the console footprint, allowing you to maximize screen space and track context windows cleanly.

*   **`just ext-pure-focus`** (Plain UI)
    *   *What it does:* Strips all headers, status lines, and footers entirely. Zero interface distraction.
    *   *Theme default:* `Everforest`
*   **`just ext-minimal`** (Compact Meter)
    *   *What it does:* Replaces the status line with a simple footer showing model name and a concise, custom 10-block context-window fill-rate meter `[###-------] 30%`.
    *   *Theme default:* `Synthwave`
*   **`just ext-theme-cycler`** (Color Swapping)
    *   *What it does:* Enables quick-swap shortcuts (`F5`/`F4`) to cycle themes in real-time or select theme schemes manually in-shell via the `/theme` command.
    *   *Theme default:* `Synthwave`

---

### 🧱 Level 2: Task Discipline & Interaction Widgets
Interactive heads-up-display panels to keep you structured and focused on specific goals.

*   **`just ext-purpose-gate`** (Intent Locking)
    *   *What it does:* Blocks inputs and triggers a screen modal prompting you to register your specific high-level "Single Purpose" target on boot. Keeps it pinned as a visual widget.
    *   *Theme default:* `Tokyo Night`
*   **`just ext-tilldone`** (Interactive Todo Lists)
    *   *What it does:* Demands a sequential sub-task list before you can begin. Tracks status updates across files and steps and displays active progress bars in the HUD.
    *   *Theme default:* `Everforest`
*   **`just ext-tool-counter`** (Classic Cost Metrics)
    *   *What it does:* Provides a rich, double-line footer containing model names, estimated API cost counters, active git branches, work folders, and full tool execution tallies.
    *   *Theme default:* `Synthwave`
*   **`just ext-tool-counter-widget`** (Real-Time Function Meters)
    *   *What it does:* Creates a highlighted widget right above your command editor listing exactly how many times `bash`, `read`, `edit`, and `write` have executed.
    *   *Theme default:* `Synthwave`
*   **`just ext-session-replay`** (Conversation Playback)
    *   *What it does:* Overlays a keyboard-navigable scrollable list showing past message pairs so you can trace what occurred without cluttering active scrollback.
    *   *Theme default:* `Catppuccin Mocha`

---

### 🛡️ Level 3: Personas, Interoperability, & Security
For syncing workspaces across other coding tools and locking down agent operations with safety filters.

*   **`just ext-system-select`** (In-Shell Role Selection)
    *   *What it does:* Registers a customized `/system` utility in your prompt, popping open a dialog to hot-swap your model persona (e.g., Debugger, Tech Writer, Senior Dev) mid-session.
    *   *Theme default:* `Catppuccin Mocha`
*   **`just ext-cross-agent`** (Claude Code Sync)
    *   *What it does:* Checks local directories for Claude Code (`.claude/`), Gemini (`.gemini/`), or Codex (`.codex/`) formats to seamlessly sync prompts, skills, and system rules into Pi.
    *   *Theme default:* `Ocean Breeze`
*   **`just ext-damage-control`** (Command Restricting Firewalls)
    *   *What it does:* Runs absolute safety audits on destructive terminal actions (regex checks for `rm`, `git reset`, DB deletions, and sensitive path access) and halts execution to ask for developer authorization.
    *   *Theme default:* `Gruvbox`
*   **`just ext-langfuse-trace`** (Real-Time LLM Tracing & Observability)
    *   *What it does:* Integrates Langfuse to trace LLM calls, tool executions, and agent turns in real-time, providing deep visibility into agent reasoning and token usage.
    *   *Theme default:* `Midnight Ocean`
*   **`just ext-zettelkasten`** (Zettelkasten Integrity Firewall)
    *   *What it does:* Implements a custom safety firewall specifically for Zettelkasten research vaults, blocking any accidental file deletions (`rm` or `rmdir`) outside of the `3-Archives` folder.
    *   *Theme default:* `Everforest`

---

### 🧬 Level 4: Pipelines & Multi-Agent Teams
The highest tier. Deploys autonomous grid layouts, sequential pipes, background helpers, and deep RAG. All Level 4 extensions are fully integrated with custom agent skills (located in `.pi/skills/`) to give the agent a deep, native understanding of how to use these tools.

*   **`just ext-subagent-widget`** (Asynchronous Background Runs)
    *   *What it does:* Adds support for `/sub <task>` commands. Spawns headless sub-agents to digest isolated problems and displays streaming execution status cards above the main shell.
    *   *Theme default:* `Cyberpunk`
*   **`just ext-agent-chain`** (Sequential Pipeline Orchestration)
    *   *What it does:* Feeds initial users prompts sequentially through a pipeline map (e.g., scoping $\rightarrow$ plan $\rightarrow$ build $\rightarrow$ review). Select plans with `/chain`.
    *   *Theme default:* `Midnight Ocean`
*   **`just ext-agent-team`** (Split-Screen Persona Grid)
    *   *What it does:* Generates a split-screen dashboard grid orchestration. The primary dispatcher receives prompts and delegates actions out to agent specialists (`research-manager`, `scientist`, `critic`).
    *   *Theme default:* `Dracula`
*   **`just ext-pi-pi`** (The Generative Meta-Agent)
    *   *What it does:* Uses parallel framework expert models to build customized, tested Pi extensions, scanning literature and codebases dynamically.
    *   *Theme default:* `Rose Pine`
*   **`just ext-research-pipeline`** (Specialized Academic Search)
    *   *What it does:* High-context optimizer. Resolves paper abstracts, indexes citations, and pulls deep chunks via background sub-agents instead of dumping heavy PDFs into your active context limit.
    *   *Theme default:* `Midnight Ocean`
*   **`just ext-mcp-research`** (Model Context Protocol Client Manager)
    *   *What it does:* Implements an MCP client manager that connects to servers like Zotero, Google Scholar, and arXiv via standard input/output, registering custom tools and commands for academic research.
    *   *Theme default:* `Catppuccin Mocha`
*   **`just ext-smart-search`** (Smart Web Search with Fallbacks)
    *   *What it does:* Registers a smart web search tool that queries the Tavily API first (fast, AI-optimized) and automatically falls back to Ollama local web search if Tavily fails or is rate-limited.
    *   *Theme default:* `Synthwave`

---

## Extensions

`just` wraps the most useful combinations. Run `just` with no arguments to list all available recipes:

```bash
just
```

Common recipes:

```bash
just pi                     # Plain Pi, no extensions
just ext-pure-focus         # Distraction-free mode
just ext-minimal            # Minimal context meter footer
just ext-cross-agent        # Cross-agent command loading + minimal footer
just ext-purpose-gate       # Purpose gate + minimal footer
just ext-tool-counter       # Rich two-line footer with tool tally
just ext-tool-counter-widget # Per-tool widget above the editor
just ext-subagent-widget    # Subagent spawner with live progress widgets
just ext-tilldone           # Task discipline system with live progress tracking
just ext-agent-team         # Multi-agent orchestration grid dashboard
just ext-system-select      # Agent persona switcher via /system command
just ext-damage-control     # Safety auditing + minimal footer
just ext-agent-chain        # Sequential pipeline orchestrator with step chaining
just ext-pi-pi              # Meta-agent that builds Pi agents using parallel experts
just ext-session-replay     # Scrollable timeline overlay of session history
just ext-theme-cycler       # Theme cycler + minimal footer
just ext-langfuse-trace     # Real-time LLM tracing and observability via Langfuse
just ext-zettelkasten       # Zettelkasten integrity safety firewall
just ext-mcp-research       # Model Context Protocol (MCP) client manager for academic search
just ext-smart-search       # Smart web search with automatic fallback to Ollama
just all                    # Open every extension in its own terminal window
```

The `open` recipe allows you to spin up a new terminal window with any combination of stacked extensions (omit `.ts`):

```bash
just open purpose-gate minimal tool-counter-widget
```

---

## Project Structure

```
pi-universe/
├── extensions/          # Pi extension source files (.ts) — one file per extension
├── specs/               # Feature specifications for extensions
├── .pi/
│   ├── agent-sessions/  # Ephemeral session files (gitignored)
│   ├── agents/          # Agent definitions for team and chain extensions
│   │   ├── pi-pi/       # Expert agents for the pi-pi meta-agent
│   │   ├── agent-chain.yaml # Pipeline definition for agent-chain
│   │   ├── teams.yaml   # Team definition for agent-team
│   │   └── *.md         # Individual agent persona/system prompts
│   ├── skills/          # Custom skills (bowser, full-document-access, research-team, research-workflow, role-restricted-search, mcp-research, smart-web-search)
│   ├── themes/          # Custom themes (.json) used by theme-cycler
│   ├── damage-control-rules.yaml # Path/command rules for safety auditing
│   └── settings.json    # Pi workspace settings
├── justfile             # just task definitions
├── THEME.md             # Color token conventions for extension authors
└── TOOLS.md             # Built-in tool function signatures available in extensions
```

---


## Orchestrating Multi-Agent Workflows

Pi's architecture makes it easy to coordinate multiple autonomous agents. This playground includes several powerful multi-agent extensions:

### Subagent Widget (`/sub`)
The `subagent-widget` extension allows you to offload isolated tasks to background Pi agents while you continue working in the main terminal. Typing `/sub <task>` spawns a headless subagent that reports its streaming progress via a persistent, live-updating UI widget above your editor.

### Agent Teams (`/team`)
The `agent-team` orchestrator operates as a dispatcher. Instead of answering prompts directly, the primary agent reviews your request, selects a specialist from a defined roster, and delegates the work via a `dispatch_agent` tool.
- Teams are configured in `.pi/agents/teams.yaml` where each top-level key is a team name containing a list of agent names (e.g., `frontend: [planner, builder, bowser]`).
- Individual agent personas (e.g., `builder.md`, `reviewer.md`) live in `.pi/agents/`.
- **pi-pi Meta-Agent**: The `pi-pi` team specifically delegates tasks to specialized Pi framework experts (`ext-expert.md`, `theme-expert.md`, `tui-expert.md`) located in `.pi/agents/pi-pi/` to build high-quality Pi extensions using parallel research.
  - **Web Crawling Fallbacks**: To ingest the latest framework documentation dynamically, these experts use `firecrawl` as their default modern page crawler, but are explicitly programmed to safely fall back to the native `curl` baked into their bash toolset if Firecrawl fails or is unavailable.

### Agent Chains (`/chain`)
Unlike the dynamic dispatcher, `agent-chain` acts as a sequential pipeline orchestrator. Workflows are defined in `.pi/agents/agent-chain.yaml` where the output of one agent becomes the input (`$INPUT`) to the next.
- Workflows are defined as a list of `steps`, where each step specifies an `agent` and a `prompt`. 
- The `$INPUT` variable injects the previous step's output (or the user's initial prompt for the first step), and `$ORIGINAL` always contains the user's initial prompt.
- Example: The `plan-build-review` pipeline feeds your prompt to the `planner`, passes the plan to the `builder`, and finally sends the code to the `reviewer`.

---

## Safety Auditing & Damage Control

The `damage-control` extension provides real-time security hooks to prevent catastrophic mistakes when agents execute bash commands or modify files. It uses Pi's `tool_call` event to intercept and evaluate every action against `.pi/damage-control-rules.yaml`.

- **Dangerous Commands**: Uses regex (`bashToolPatterns`) to block destructive commands like `rm -rf`, `git reset --hard`, `aws s3 rm --recursive`, or `DROP DATABASE`. Some rules strictly block execution, while others (`ask: true`) pause execution to prompt you for confirmation.
- **Zero Access Paths**: Prevents the agent from reading or writing sensitive files (e.g., `.env`, `~/.ssh/`, `*.pem`).
- **Read-Only Paths**: Allows reading but blocks modifying system files or lockfiles (`package-lock.json`, `/etc/`).
- **No-Delete Paths**: Allows modifying but prevents deleting critical project configuration (`.git/`, `Dockerfile`, `README.md`).

---

## Extension Author Reference

Companion docs cover the conventions used across all extensions in this repo:

- **[COMPARISON.md](COMPARISON.md)** — Feature-by-feature comparison of Claude Code vs Pi Agent across 12 categories (design philosophy, tools, hooks, SDK, enterprise, and more).
- **[PI_VS_OPEN_CODE.md](PI_VS_OPEN_CODE.md)** — Architectural comparison of Pi Agent vs OpenCode (open-source Claude Code alternative) focusing on extension capabilities, event lifecycle, and UI customization.
- **[RESERVED_KEYS.md](RESERVED_KEYS.md)** — Pi reserved keybindings, overridable keys, and safe keys for extension authors.
- **[THEME.md](THEME.md)** — Color language: which Pi theme tokens (`success`, `accent`, `warning`, `dim`, `muted`) map to which UI roles, with examples.
- **[TOOLS.md](TOOLS.md)** — Function signatures for the built-in tools available inside extensions (`read`, `bash`, `edit`, `write`).

---

## Hooks & Events

Side-by-side comparison of lifecycle hooks in [Claude Code](https://docs.anthropic.com/en/docs/claude-code/hooks) vs [Pi Agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md#events).

| Category            | Claude Code                                                      | Pi Agent                                                                                                                | Available In |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| **Session**         | `SessionStart`, `SessionEnd`                                     | `session_start`, `session_shutdown`                                                                                     | Both         |
| **Input**           | `UserPromptSubmit`                                               | `input`                                                                                                                 | Both         |
| **Tool**            | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`                | `tool_call`, `tool_result`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`                       | Both         |
| **Bash**            | —                                                                | `BashSpawnHook`, `user_bash`                                                                                            | Pi           |
| **Permission**      | `PermissionRequest`                                              | —                                                                                                                       | CC           |
| **Compact**         | `PreCompact`                                                     | `session_before_compact`, `session_compact`                                                                             | Both         |
| **Branching**       | —                                                                | `session_before_fork`, `session_fork`, `session_before_switch`, `session_switch`, `session_before_tree`, `session_tree` | Pi           |
| **Agent / Turn**    | —                                                                | `before_agent_start`, `agent_start`, `agent_end`, `turn_start`, `turn_end`                                              | Pi           |
| **Message**         | —                                                                | `message_start`, `message_update`, `message_end`                                                                        | Pi           |
| **Model / Context** | —                                                                | `model_select`, `context`                                                                                               | Pi           |
| **Sub-agents**      | `SubagentStart`, `SubagentStop`, `TeammateIdle`, `TaskCompleted` | —                                                                                                                       | CC           |
| **Config**          | `ConfigChange`                                                   | —                                                                                                                       | CC           |
| **Worktree**        | `WorktreeCreate`, `WorktreeRemove`                               | —                                                                                                                       | CC           |
| **System**          | `Stop`, `Notification`                                           | —                                                                                                                       | CC           |



## Resources

## Pi Documentation

| Doc                                                                                                     | Description                        |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| [Mario's Twitter](https://x.com/badlogicgames)                                                          | Creator of Pi Coding Agent         |
| [README.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/README.md)              | Overview and getting started       |
| [sdk.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/sdk.md)               | TypeScript SDK reference           |
| [rpc.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/rpc.md)               | RPC protocol specification         |
| [json.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/json.md)             | JSON event stream format           |
| [providers.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/providers.md)   | API keys and provider setup        |
| [models.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/models.md)         | Custom models (Ollama, vLLM, etc.) |
| [extensions.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) | Extension system                   |
| [skills.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md)         | Skills (Agent Skills standard)     |
| [settings.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/settings.md)     | Configuration                      |
| [compaction.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/compaction.md) | Context compaction                 |
