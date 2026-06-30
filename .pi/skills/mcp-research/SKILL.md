---
name: mcp-research
description: >
  Model Context Protocol (MCP) client manager for academic research. Connects
  to Zotero, Google Scholar, and arXiv servers, registers custom tools and
  commands, and manages research sessions.
allowed-tools: read,write,bash,grep,find,ls
---

# Model Context Protocol (MCP) Research Skill

This skill provides a robust Model Context Protocol (MCP) client manager to orchestrate academic research across multiple data sources (Zotero, Google Scholar, and arXiv) using standard input/output connections.

## Registered Tools

The `mcp-research` extension registers the following tools for the agent:

### 1. `mcp_search`
Search for papers across connected MCP servers.
* **Parameters:**
  * `query` (string, required): The search query.
  * `maxResults` (number, optional, default: 5): Maximum number of results to return.
  * `source` (string, optional): Specific server to query (`arxiv`, `google-scholar`, `zotero`).

### 2. `mcp_library`
Query and retrieve items from your connected Zotero library.
* **Parameters:**
  * `query` (string, required): The search query for library items.
  * `limit` (number, optional, default: 10): Maximum number of items to return.

### 3. `mcp_session`
Manage the active research session state (goal, papers, queries).
* **Parameters:**
  * `action` (string, required): The action to perform (`get`, `set-goal`, `add-paper`, `add-query`).
  * `goal` (string, optional): The research goal to set.
  * `paperId` (string, optional): The ID of the paper to add to the session.

---

## Interactive Commands

You can run these commands directly in the Pi prompt:

| Command | Purpose |
|---------|---------|
| `/mcp-connect <server>` | Connect to a specific MCP server (`zotero`, `google-scholar`, `arxiv`). |
| `/mcp-status` | Display the connection status of all MCP servers. |
| `/mcp-research <topic>` | Start an automated MCP-driven research session on a topic. |
| `/mcp-disconnect <server>` | Disconnect from a specific MCP server. |

---

## Usage Examples

### 1. Connecting to arXiv and Searching
```bash
# Connect to the arXiv MCP server
/mcp-connect arxiv

# Search for quantum computing papers
# The agent will use the mcp_search tool behind the scenes
/mcp-research "quantum computing in healthcare"
```

### 2. Querying Zotero Library
```bash
# Connect to Zotero
/mcp-connect zotero

# Query library for a specific author or keyword
# The agent will use the mcp_library tool
```
