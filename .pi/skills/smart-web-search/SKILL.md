---
name: smart-web-search
description: >
  Smart web search tool with automatic fallback. Queries the Tavily API first
  for fast, AI-optimized results, and automatically falls back to Ollama local
  web search if Tavily fails or is rate-limited.
allowed-tools: read,write,bash,grep,find,ls
---

# Smart Web Search Skill

This skill provides a highly resilient web search tool (`smart_web_search`) with automatic fallback capabilities to handle API rate limits, network errors, and missing credentials gracefully.

## Registered Tools

The `tavily-search` extension registers the following primary tool:

### `smart_web_search`
Search the web with intelligent fallback. Tries Tavily first (fast, AI-optimized), and falls back to Ollama local web search if Tavily fails.

* **Parameters:**
  * `query` (string, required): The search query.
  * `depth` (string, required): Search depth — `'basic'` for quick queries, `'advanced'` for thorough research.
  * `limit` (number, optional, default: 5, max: 10): Maximum number of results to return.
  * `includeDomains` (array of strings, optional): Specific domains to include in the search (Tavily only).
  * `excludeDomains` (array of strings, optional): Specific domains to exclude from the search (Tavily only).
  * `forceFallback` (boolean, optional): Skip Tavily and use Ollama directly.

---

## Fallback Mechanism

```
[User Query] ──> Try Tavily API (Fast, AI-optimized)
                     │
                     ├──> Success ──> Return Results
                     │
                     └──> Failure (No key, rate-limit, network error)
                             │
                             └──> Fallback to Ollama Web Search ──> Return Results
```

---

## Usage Examples

### 1. Basic Web Search
```bash
# Search for the latest news on a topic
smart_web_search "latest developments in room-temperature superconductors" basic
```

### 2. Advanced Search with Domain Filtering
```bash
# Search only within academic and trusted domains
smart_web_search "quantum error correction" advanced limit=5 includeDomains=["arxiv.org", "nature.com"]
```

### 3. Forcing Local Fallback (Ollama)
```bash
# Skip Tavily and use Ollama directly
smart_web_search "local network setup" basic forceFallback=true
```
