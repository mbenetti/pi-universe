# Research Pipeline Extension

A two-phase research workflow that prevents context window explosion when analyzing academic papers.

## The Problem

Traditional research workflows dump full paper text into the main context, causing:
- Context window explosion with large PDFs
- Token count spikes
- Slow processing
- Lost conversation history

## The Solution

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Search                                                │
│  Main context gets only → Titles, Authors, Abstracts (truncated)│
│                                                                 │
│  PHASE 2: Deep Read                                             │
│  Each paper → Dedicated sub-agent with ISOLATED context        │
│  Main context gets only → Summaries from sub-agents             │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Start a Research Session
```
/search "transformer architecture" 10
```

### List Papers
```
/research-list
```

### Deep Read One Paper
```
/read arxiv:2103.14030
```

### Deep Read All Papers in Parallel
```
/read-all
```

### Or Use Tools Directly

```javascript
// Phase 1: Search - returns abstracts only
research_search({
  query: "neural architecture search",
  maxResults: 10
})

// Phase 2: Deep read selected papers
research_read({
  paperIds: ["2103.14030", "1706.03762"],
  parallel: true
})
```

## Commands

| Command | Description |
|---------|-------------|
| `/search <query> [max]` | Search papers, get abstracts |
| `/read <id>` | Deep read one paper |
| `/read-all` | Deep read all papers from last search |
| `/research-list` | List papers in current session |

## Tools

| Tool | Description |
|------|-------------|
| `research_search` | Search and return abstracts |
| `research_read` | Deep read papers via sub-agents |
| `research_list` | List papers in session |
| `research_select` | Select papers by index |
| `research_read_selected` | Read all selected papers |

## How Sub-Agents Work

Each paper is analyzed by a dedicated Pi sub-agent:
- **Isolated context**: Paper content doesn't pollute main context
- **Persistent session**: Sub-agents can be continued with `/subcont`
- **Live widgets**: See progress in real-time
- **Parallel execution**: Multiple papers analyzed simultaneously

## Example Workflow

```
User: /search "attention is all you need" 5

Assistant: Found 5 papers:
[1] Attention Is All You Need
    Authors: Vaswani et al.
    Abstract: The dominant sequence transduction models...

User: /read-all

Assistant: (spawns 5 sub-agents, one per paper)
         (widgets show progress)
         (returns summaries after all complete)

## Deep Analysis Results

### Paper 1: Attention Is All You Need
### Main Contribution
The paper introduces the Transformer, a novel architecture...

### Paper 2: [Next paper summary]
...
```
