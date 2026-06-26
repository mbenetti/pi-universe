# Changes Made to Fix Research Team Issues

## Fixed Issues

### 🔴 Critical

1. **Research team agents had no web search capability**
   - Agents were spawned with `--no-extensions` which blocked the `@ollama/pi-web-search` package
   - `web_search` and `web_fetch` tools from the package were unavailable to subprocess agents
   - Fix: Added `web_search,web_fetch` to `researcher.md`, `scientist.md`, and `research.md` tools lists
   - Fix: `agent-team.ts` now resolves and passes `-e` path for the web-search extension to subprocess agents (while keeping `--no-extensions` to prevent UI extension crashes)
   - `research-manager.md` explicitly does NOT have `web_search` — it must delegate to researcher

2. **Duplicate agents: `research.md` vs `researcher.md`**
   - `researcher.md` → Team-member agent for discovery/search within the research team
   - `research.md` → Standalone quick-search agent for ad-hoc lit reviews (distinct purpose)
   - Both now have clear frontmatter descriptions that explain which to use when

2. **Missing `write` tool on agents that say "save files"**
   - Added `write` to: `research-manager.md`, `researcher.md`, `scientist.md`, `section-critic.md`
   - All research-team agents now have `write` available

3. **`bowser.md` references wrong skill name `playwright-bowser`**
   - Fixed to `bowser` (the actual skill directory name)

4. **`teams.yaml` missing `planner` agent**
   - Added `planner` to `research-team` in teams.yaml (was documented in CHANGES.md but never actually added)

### 🟡 Important

5. **`research-manager.md` bloated system prompt**
   - Cut from ~130 lines to ~50 lines
   - Removed redundant sections (How to Delegate duplicated elsewhere, If You Need Full Content repeated constraints)
   - Replaced DO/DO NOT table with concise ✅/❌ list
   - Added clear "Report Ownership" table showing which agent writes what
   - Kept essential info: delegation format, boundaries, file storage

6. **`research-team-launch.md` outdated — missing section-writer & section-critic**
   - Expanded team table from 3 agents → 6 agents (added planner, section-writer, section-critic)
   - Updated information flow diagram to show full pipeline
   - Added example workflow showing delegation to all agent types
   - Added "Report Ownership" guidance matching the agent prompts

7. **Empty `.pi/skills/research-team/` stub directory**
   - Created proper `SKILL.md` describing the team orchestration workflow
   - Documents agent roles, access levels, and data flow

### 🟢 Minor

8. **Copy-pasted `.research/` save rules across all agents**
   - Standardized to consistent "Save everything under `.research/` folder" line
   - Removed redundant sub-bullet lists where possible

9. **`research.md` standalone agent — purpose unclear**
   - Now has clear description: "Standalone quick-search agent" vs team member
   - Frontmatter explains when to use this vs the research-manager team

10. **`section-critic.md` missing `write` tool**
    - Added `write` to tools list

11. **Broken symlink `.pi/skills/tavily-research`**
    - Removed dangling symlink pointing to non-existent `../../.agents/skills/tavily-research`
