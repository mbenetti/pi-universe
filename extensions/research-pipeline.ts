/**
 * Research Pipeline Extension for Pi
 * 
 * Two-phase research workflow that prevents context window explosion:
 * Phase 1: Search papers → return only ABSTRACTS (not full text)
 * Phase 2: For each selected paper → spawn dedicated sub-agent for deep reading
 * 
 * Usage:
 *   /research <topic>           - Start research session
 *   /search <query>             - Search papers, get only abstracts
 *   /read <paper-id>            - Deep read one paper in sub-agent
 *   /read-all                   - Deep read all papers from last search
 * 
 * The key insight: NEVER dump full paper text into main context.
 * Each paper gets its own sub-agent with isolated session.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, Text } from "@mariozechner/pi-tui";
import { Type, Static } from "@sinclair/typebox";
import { spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ── Types ───────────────────────────────────────────────────────────────────

interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  source: "arxiv" | "semantic-scholar" | "pubmed" | "tavily" | "google-scholar";
  url: string;
  citations?: number;
  selected?: boolean;
}

interface SubAgentState {
  id: number;
  status: "pending" | "running" | "done" | "error";
  paperId: string;
  paperTitle: string;
  summary: string;
  toolCount: number;
  elapsed: number;
  sessionFile: string;
  pdfPath: string;
  currentPage: number;
  maxPages: number;
  proc?: any;
}

// ── State ───────────────────────────────────────────────────────────────────

const state = {
  papers: [] as Paper[],
  subAgents: new Map<number, SubAgentState>(),
  nextSubId: 1,
  currentTopic: "",
};

let widgetCtx: any;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSessionsDir(): string {
  const dir = path.join(os.homedir(), ".pi", "research-sessions");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeSessionFile(subId: number): string {
  return path.join(getSessionsDir(), `paper-${subId}-${Date.now()}.jsonl`);
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

// ── Widget Rendering ─────────────────────────────────────────────────────────

function updateWidgets() {
  if (!widgetCtx) return;

  for (const [id, agent] of state.subAgents) {
    const key = `read-${id}`;
    widgetCtx.ui.setWidget(key, (_tui: any, theme: any) => {
      const container = new Container();
      const borderFn = (s: string) => theme.fg("dim", s);

      container.addChild(new Text("", 0, 0));
      container.addChild(new DynamicBorder(borderFn));
      const content = new Text("", 1, 0);
      container.addChild(content);
      container.addChild(new DynamicBorder(borderFn));

      return {
        render(width: number): string[] {
          const lines: string[] = [];
          const statusColor = agent.status === "running" ? "accent"
            : agent.status === "done" ? "success"
            : agent.status === "error" ? "error" : "dim";
          const statusIcon = agent.status === "running" ? "●"
            : agent.status === "done" ? "✓"
            : agent.status === "error" ? "✗" : "○";

          const titlePreview = truncate(agent.paperTitle, 50);
          const elapsedStr = agent.elapsed > 0 
            ? ` (${Math.round(agent.elapsed / 1000)}s)` 
            : "";

          lines.push(
            theme.fg(statusColor, `${statusIcon} Reading #${id}`) +
            theme.fg("dim", `  "${titlePreview}"${elapsedStr}`)
          );

          if (agent.summary) {
            const summaryLine = truncate(agent.summary, width - 5);
            lines.push(theme.fg("muted", `  ${summaryLine}`));
          }

          content.setText(lines.join("\n"));
          return container.render(width);
        },
        invalidate() {
          container.invalidate();
        },
      };
    });
  }
}

// ── Paper Search (Abstracts Only) ───────────────────────────────────────────

async function searchArxiv(query: string, maxResults: number): Promise<Paper[]> {
  return new Promise((resolve) => {
    const proc = spawn("uv", [
      "run", "--with", "arxiv-screen-scrape", "python3", "-c", `
import arxiv_screen_scrape as arxiv
import json

papers = arxiv.search_papers("${query.replace(/"/g, '\\"')}", max_results=${maxResults})
results = []
for p in papers[:${maxResults}]:
    results.append({
        "id": p.get("id", ""),
        "title": p.get("title", "Untitled"),
        "authors": p.get("authors", [])[:5],
        "year": p.get("year", 0),
        "abstract": p.get("abstract", "")[:2000],  # Limit abstract size
        "source": "arxiv",
        "url": f"https://arxiv.org/abs/{p.get('id', '')}",
    })
print(json.dumps(results, ensure_ascii=False))
`
    ], { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d) => { console.error("arxiv:", d.toString()); });

    proc.on("close", () => {
      try {
        const papers = JSON.parse(stdout);
        resolve(papers);
      } catch {
        console.error("Failed to parse arxiv results:", stdout);
        resolve([]);
      }
    });
  });
}

async function searchSemanticScholar(query: string, maxResults: number): Promise<Paper[]> {
  return new Promise((resolve) => {
    const proc = spawn("curl", [
      "-s", "https://api.semanticscholar.org/graph/v1/paper/search",
      "-G",
      "--data-urlencode", `query=${query}`,
      "--data-urlencode", `fields=title,authors,year,abstract,citationCount,openAccessPdf,externalIds`,
      "-d", `limit=${maxResults}`,
    ], { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });

    proc.on("close", () => {
      try {
        const data = JSON.parse(stdout);
        const papers: Paper[] = (data.data || []).map((p: any) => ({
          id: p.externalIds?.ArXiv || p.externalIds?.DOI || p.paperId,
          title: p.title || "Untitled",
          authors: p.authors?.slice(0, 5).map((a: any) => a.name) || [],
          year: p.year || 0,
          abstract: (p.abstract || "No abstract available").slice(0, 2000),
          source: "semantic-scholar" as const,
          url: p.openAccessPdf?.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
          citations: p.citationCount || 0,
        }));
        resolve(papers);
      } catch {
        resolve([]);
      }
    });
  });
}

async function searchTavily(query: string, maxResults: number): Promise<Paper[]> {
  return new Promise((resolve) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.error("Tavily search skipped: TAVILY_API_KEY environment variable not set.");
      resolve([]);
      return;
    }

    const body = JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: "advanced",
      include_raw_content: true,
      max_results: maxResults,
    });

    const proc = spawn("curl", [
      "-s", "-X", "POST",
      "https://api.tavily.com/search",
      "-H", "Content-Type: application/json",
      "-d", body,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });
    
    proc.on("close", () => {
      try {
        const data = JSON.parse(stdout);
        const papers: Paper[] = (data.results || []).map((r: any) => ({
          id: Buffer.from(r.url).toString("base64url").slice(0, 15),
          title: r.title || "Tavily Result",
          authors: ["Tavily Search"],
          year: new Date().getFullYear(),
          abstract: (r.content || "").slice(0, 2000),
          source: "tavily" as any,
          url: r.url,
          citations: 0,
        }));
        resolve(papers);
      } catch {
        resolve([]);
      }
    });
  });
}

async function searchGoogleScholar(query: string, maxResults: number): Promise<Paper[]> {
  return new Promise((resolve) => {
    const proc = spawn("uv", [
      "run", "--with", "scholarly", "python3", "-c", `
from scholarly import scholarly
import json

try:
    search_query = scholarly.search_pubs("${query.replace(/"/g, '\\"')}")
    results = []
    for i in range(${maxResults}):
        try:
            pub = next(search_query)
            results.append({
                "id": pub.get("bib", {}).get("pub_url", f"scholar_{i}"),
                "title": pub.get("bib", {}).get("title", "Untitled"),
                "authors": pub.get("bib", {}).get("author", []),
                "year": int(pub.get("bib", {}).get("pub_year", "0")) if str(pub.get("bib", {}).get("pub_year", "0")).isdigit() else 0,
                "abstract": pub.get("bib", {}).get("abstract", "")[:2000],
                "source": "google-scholar",
                "url": pub.get("pub_url", ""),
                "citations": pub.get("num_citations", 0),
            })
        except StopIteration:
            break
    print(json.dumps(results, ensure_ascii=False))
except Exception as e:
    print(json.dumps([]))
`
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });

    proc.on("close", () => {
      try {
        const papers: Paper[] = JSON.parse(stdout).map((p: any) => ({
            ...p,
            id: Buffer.from(p.url || p.id || "").toString("base64url").slice(0, 15),
        }));
        resolve(papers);
      } catch {
        resolve([]);
      }
    });
  });
}

// ── PDF Extraction (Progressive) ──────────────────────────────────────────────

function extractPdfPages(pdfPath: string, startPage: number, pageCount: number): string {
  return new Promise((resolve) => {
    const start = startPage;
    const end = startPage + pageCount - 1;
    const tempFile = `.research/papers/extract-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`;
    const proc = spawn("pdftotext", [
      "-f", String(start),
      "-l", String(end),
      "-layout",
      pdfPath,
      tempFile,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    proc.stderr?.on("data", (d) => { console.error("pdftotext:", d.toString()); });
    
    proc.on("close", () => {
      try {
        const text = fs.readFileSync(tempFile, "utf-8");
        resolve(text);
      } catch (e) {
        resolve("");
      }
    });
    proc.on("error", () => resolve(""));
  }) as any;
}

async function getPdfPageCount(pdfPath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn("pdfinfo", [pdfPath], { stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    proc.stdout?.on("data", (d) => { text += d.toString(); });
    proc.on("close", () => {
      const match = text.match(/Pages:\s*(\d+)/);
      resolve(match ? parseInt(match[1]) : 1);
    });
    proc.on("error", () => resolve(1));
  });
}

// Extract first page content
async function extractFirstPage(pdfPath: string): Promise<string> {
  const text = await extractPdfPages(pdfPath, 1, 1);
  return text.replace(/\s+/g, " ").trim().slice(0, 3000);
}

// ── Sub-Agent Spawning (Progressive) ──────────────────────────────────────────

async function spawnReadAgent(
  subId: number,
  paper: Paper,
  focus: string,
  ctx: any
): Promise<string> {
  const sessionFile = makeSessionFile(subId);
  const pdfPath = `.research/papers/${paper.id}.pdf`;
  
  const agent: SubAgentState = {
    id: subId,
    status: "running",
    paperId: paper.id,
    paperTitle: paper.title,
    summary: "",
    toolCount: 0,
    elapsed: 0,
    sessionFile,
    pdfPath,
    currentPage: 1,
    maxPages: 1,
  };
  state.subAgents.set(subId, agent);
  updateWidgets();

  // Download PDF synchronously if not cached
  if (!fs.existsSync(pdfPath)) {
    fs.mkdirSync(".research/papers", { recursive: true });
    if (paper.source === "arxiv") {
      spawnSync("curl", ["-sL", "-o", pdfPath, `https://arxiv.org/pdf/${paper.id}.pdf`]);
    } else if (paper.url) {
      spawnSync("curl", ["-sL", "-o", pdfPath, paper.url]);
    }
  }
  
  // Get total pages
  try {
    agent.maxPages = await getPdfPageCount(pdfPath);
  } catch (e) {
    console.error("Failed to get page count:", e);
  }
  
  const model = ctx.model
    ? `${ctx.model.provider}/${ctx.model.id}`
    : "openrouter/google/gemini-3-flash-preview";

  // Progressive reading loop
  const MAX_ITERATIONS = 5; // Safety limit
  const PAGES_PER_ITERATION = 2; // Read 2 pages at a time after first
  let currentPage = 1;
  let fullText = "";
  let iteration = 0;
  
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    
    // Extract current page(s)
    let pageContent = "";
    try {
      if (currentPage === 1) {
        pageContent = await extractFirstPage(pdfPath);
      } else {
        pageContent = await extractPdfPages(pdfPath, currentPage, PAGES_PER_ITERATION);
      }
      pageContent = pageContent.replace(/\s+/g, " ").trim().slice(0, 4000);
    } catch (e) {
      console.error("Failed to extract pages:", e);
    }
    
    // Build prompt with all accumulated content
    const readPrompt = `You are analyzing this academic paper:

TITLE: ${paper.title}
AUTHORS: ${paper.authors.join(", ")}
YEAR: ${paper.year}
URL: ${paper.url}
ABSTRACT: ${paper.abstract}

EXTRACTED CONTENT (pages ${currentPage === 1 ? 1 : `${currentPage}-${currentPage + PAGES_PER_ITERATION - 1}`} of ${agent.maxPages}):
${pageContent || "[Extraction unavailable]"}

${fullText ? `\n--- PREVIOUSLY EXTRACTED CONTENT ---\n${fullText.slice(-5000)}\n--- END PREVIOUS ---\n` : ""}

Your task: ${focus || "Provide a concise analysis including: (1) main contribution, (2) methodology, (3) key findings, (4) relevance to broader field."}

IMPORTANT RULES:
- Do NOT reproduce long quotes from the paper
- Return ONLY your analysis, NOT the paper content
- If this is your first iteration, analyze based on available content
- If you've gathered enough information for a complete analysis, end with: [ANALYSIS_COMPLETE]
- If you need more pages (methodology details, results, experiments), end with: [NEED_MORE_PAGES]

Output format:
## Analysis: ${truncate(paper.title, 40)}

### Main Contribution
[1-2 sentences on what this paper does]

### Methodology  
[Brief description of approach]

### Key Findings
[Bullet points of main results]

### Significance
[Why this matters to the field]

### Potential Criticisms
[Methodological limitations or gaps if any]`;

    // Spawn agent for this iteration
    const result = await spawnAgentIteration(sessionFile, model, readPrompt, agent);
    agent.summary = result;
    updateWidgets();
    
    // Check if analysis is complete or need more pages
    if (result.includes("[ANALYSIS_COMPLETE]")) {
      agent.status = "done";
      updateWidgets();
      break;
    }
    
    if (result.includes("[NEED_MORE_PAGES]")) {
      // Append current page content for context
      fullText += `\n\n--- PAGE ${currentPage === 1 ? 1 : `${currentPage}-${currentPage + PAGES_PER_ITERATION - 1}`} ---\n` + pageContent;
      
      // Move to next pages
      currentPage += PAGES_PER_ITERATION;
      agent.currentPage = currentPage;
      
      if (currentPage > agent.maxPages) {
        // Reached end of paper
        agent.status = "done";
        updateWidgets();
        break;
      }
      updateWidgets();
      continue;
    }
    
    // If neither marker found, assume complete
    agent.status = "done";
    updateWidgets();
    break;
  }
  
  if (iteration >= MAX_ITERATIONS) {
    agent.status = "done";
    agent.summary += "\n\n*[Max iterations reached - analysis may be incomplete]*";
  }
  
  // Cleanup widget after delay
  setTimeout(() => {
    widgetCtx?.ui.setWidget(`read-${subId}`, undefined);
    state.subAgents.delete(subId);
  }, 30000);

  updateWidgets();
  return agent.summary;
}

// Spawn a single iteration of the agent
function spawnAgentIteration(
  sessionFile: string,
  model: string,
  prompt: string,
  agent: SubAgentState
): Promise<string> {
  return new Promise((resolve) => {
    // Propagate langfuse tracing to subprocess
    const extArgs: string[] = [];
    if (process.env.LANGFUSE_SECRET_KEY) {
      const lfExt = path.join(ctx.cwd || process.cwd(), "extensions", "langfuse-trace.ts");
      if (fs.existsSync(lfExt)) {
        extArgs.push("-e", lfExt);
      }
    }
    
    const proc = spawn("pi", [
      ...extArgs,
      "--mode", "json",
      "-p",
      "--session", sessionFile,
      "--no-extensions",
      "--model", model,
      "--tools", "read,bash,grep,find,ls",
      "--thinking", "off",
      prompt,
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    agent.proc = proc;

    const startTime = Date.now();
    const timer = setInterval(() => {
      agent.elapsed = Date.now() - startTime;
      updateWidgets();
    }, 1000);

    let buffer = "";
    const textChunks: string[] = [];

    proc.stdout!.setEncoding("utf-8");
    proc.stdout!.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === "message_update") {
            const delta = event.assistantMessageEvent;
            if (delta?.type === "text_delta") {
              textChunks.push(delta.delta || "");
            }
          } else if (event.type === "tool_execution_start") {
            agent.toolCount++;
            updateWidgets();
          }
        } catch {}
      }
    });

    proc.on("close", (code) => {
      clearInterval(timer);
      agent.elapsed = Date.now() - Date.now();
      
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.assistantMessageEvent?.text_delta) {
            textChunks.push(event.assistantMessageEvent.text_delta);
          }
        } catch {}
      }
      
      const result = textChunks.join("");
      proc.kill();
      resolve(result);
    });

    proc.on("error", (err) => {
      clearInterval(timer);
      resolve(`[Error: ${err.message}]`);
    });
  });
}

// ── Extension Registration ───────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  console.log("Loading Research Pipeline extension...");

  // ── Tool: Search Papers (Abstracts Only) ──────────────────────────────────

  pi.registerTool({
    name: "research_search",
    description: "Search academic papers and return only abstracts — no full text. Use this FIRST to find relevant papers, then use research_read to analyze them individually.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      maxResults: Type.Optional(Type.Number({ description: "Max results per source", default: 5 })),
      sources: Type.Optional(Type.Array(Type.Union([Type.Literal("arxiv"), Type.Literal("semantic-scholar"), Type.Literal("tavily"), Type.Literal("google-scholar")]))),
    }),
    execute: async (callId, params, signal, onUpdate) => {
      const { query, maxResults = 5, sources = ["arxiv", "semantic-scholar", "tavily", "google-scholar"] } = params;

      state.currentTopic = query;
      state.papers = [];

      onUpdate?.({ content: [{ type: "text", text: `🔍 Searching: "${query}"...` }] });

      const allPapers: Paper[] = [];

      // Search in parallel
      const searches = [];
      if (sources.includes("arxiv")) {
        searches.push(searchArxiv(query, maxResults));
      }
      if (sources.includes("semantic-scholar")) {
        searches.push(searchSemanticScholar(query, maxResults));
      }
      if (sources.includes("tavily")) {
        searches.push(searchTavily(query, maxResults));
      }
      if (sources.includes("google-scholar")) {
        searches.push(searchGoogleScholar(query, maxResults));
      }

      const results = await Promise.all(searches);
      for (const papers of results) {
        allPapers.push(...papers);
      }

      // Deduplicate by title similarity
      const seen = new Set<string>();
      const unique: Paper[] = [];
      for (const paper of allPapers) {
        const key = paper.title.toLowerCase().slice(0, 50);
        if (!seen.has(key)) {
          seen.add(key);
          paper.selected = false;
          unique.push(paper);
        }
      }

      state.papers = unique;

      // Format for display — ABSTRACTS ONLY, truncated
      const formatted = unique.map((p, i) => {
        const abstract = truncate(p.abstract, 800);
        const citations = p.citations ? ` | Citations: ${p.citations}` : "";
        return [
          `**[${i + 1}] ${p.title}**`,
          `Authors: ${p.authors.slice(0, 3).join(", ")}${p.authors.length > 3 ? " et al." : ""}`,
          `Year: ${p.year} | Source: ${p.source}${citations}`,
          ``,
          `Abstract: ${abstract}`,
          ``,
          `ID: \`${p.id}\` | URL: ${p.url}`,
        ].join("\n");
      }).join("\n\n");

      return {
        content: [{ 
          type: "text", 
          text: `📚 Found ${unique.length} papers for "${query}":\n\n${formatted}\n\n---\n**Next step:** Use \`research_read\` to analyze papers. Example: \`research_read paperIds=["${unique[0]?.id}"]\`` 
        }],
        details: { 
          papers: unique,  // Structured metadata for later use
          query,
          totalFound: unique.length,
        },
      };
    },
  });

  // ── Tool: Deep Read Papers (Sub-agents) ─────────────────────────────────────

  pi.registerTool({
    name: "research_read",
    description: "Deep read selected papers using dedicated sub-agents. Each paper gets its own isolated agent — full content is analyzed there, NOT in the main context. Use this AFTER research_search.",
    parameters: Type.Object({
      paperIds: Type.Array(Type.String(), { description: "Paper IDs from search results" }),
      focus: Type.Optional(Type.String({ description: "Custom focus for analysis (e.g., 'focus on methodology')" })),
      parallel: Type.Optional(Type.Boolean({ description: "Read in parallel (default: true)", default: true })),
    }),
    execute: async (callId, params, signal, onUpdate, ctx) => {
      const { paperIds, focus, parallel = true } = params;
      widgetCtx = ctx;

      // Find papers
      const papers = paperIds
        .map(id => state.papers.find(p => p.id === id || p.url.includes(id)))
        .filter(Boolean) as Paper[];

      if (papers.length === 0) {
        return {
          content: [{ type: "text", text: `No papers found for IDs: ${paperIds.join(", ")}. Run research_search first.` }],
          isError: true,
        };
      }

      onUpdate?.({ content: [{ type: "text", text: `📖 Starting deep read of ${papers.length} paper(s)...` }] });

      if (parallel) {
        // Spawn all in parallel
        const tasks = papers.map(paper => {
          const subId = state.nextSubId++;
          return spawnReadAgent(subId, paper, focus || "", ctx).then(summary => ({
            paper,
            summary,
          }));
        });

        const results = await Promise.all(tasks);

        // Format results — summaries only, not full text
        const formatted = results.map(r => {
          const idx = state.papers.findIndex(p => p.id === r.paper.id);
          return [
            `### Paper ${idx + 1}: ${r.paper.title}`,
            `*${r.paper.authors.slice(0, 3).join(", ")}${r.paper.authors.length > 3 ? " et al." : ""} (${r.paper.year})*`,
            ``,
            r.summary || "*Analysis pending...*",
            ``,
            `---`,
          ].join("\n");
        }).join("\n\n");

        return {
          content: [{ type: "text", text: `## Deep Analysis Results\n\n${formatted}` }],
          details: { results: results.map(r => ({ id: r.paper.id, summary: r.summary })) },
        };
      } else {
        // Sequential
        const results = [];
        for (const paper of papers) {
          const subId = state.nextSubId++;
          const summary = await spawnReadAgent(subId, paper, focus || "", ctx);
          results.push({ paper, summary });
        }

        const formatted = results.map(r => {
          const idx = state.papers.findIndex(p => p.id === r.paper.id);
          return `### Paper ${idx + 1}: ${r.paper.title}\n\n${r.summary}`;
        }).join("\n\n---\n\n");

        return {
          content: [{ type: "text", text: `## Deep Analysis Results\n\n${formatted}` }],
          details: { results: results.map(r => ({ id: r.paper.id, summary: r.summary })) },
        };
      }
    },
  });

  // ── Tool: List Current Papers ───────────────────────────────────────────────

  pi.registerTool({
    name: "research_list",
    description: "List papers from the current research session",
    parameters: Type.Object({}),
    execute: async () => {
      if (state.papers.length === 0) {
        return { content: [{ type: "text", text: "No papers in session. Run research_search first." }] };
      }

      const list = state.papers.map((p, i) => {
        const sel = p.selected ? "✓" : " ";
        return `[${i + 1}] ${sel} ${p.title} (${p.year}) — ${p.source}`;
      }).join("\n");

      return {
        content: [{ type: "text", text: `📚 Papers (${state.papers.length}):\n\n${list}` }],
        details: { papers: state.papers },
      };
    },
  });

  // ── Tool: Select Papers ─────────────────────────────────────────────────────

  pi.registerTool({
    name: "research_select",
    description: "Select papers by index for batch reading",
    parameters: Type.Object({
      indices: Type.Array(Type.Number(), { description: "1-based indices from research_list" }),
    }),
    execute: async (callId, params) => {
      const { indices } = params;

      for (const idx of indices) {
        const paper = state.papers[idx - 1];
        if (paper) paper.selected = true;
      }

      const selected = state.papers.filter(p => p.selected);
      return {
        content: [{ type: "text", text: `Selected ${selected.length} papers. Use research_read with their IDs.` }],
        details: { selectedIds: selected.map(p => p.id) },
      };
    },
  });

  // ── Tool: Read Selected Papers ─────────────────────────────────────────────

  pi.registerTool({
    name: "research_read_selected",
    description: "Deep read all selected papers in parallel",
    parameters: Type.Object({
      focus: Type.Optional(Type.String()),
    }),
    execute: async (callId, params, signal, onUpdate, ctx) => {
      const selected = state.papers.filter(p => p.selected);
      if (selected.length === 0) {
        return { content: [{ type: "text", text: "No papers selected. Use research_select first." }] };
      }

      return ctx.tools.execute("research_read", {
        paperIds: selected.map(p => p.id),
        focus: params.focus,
        parallel: true,
      }, signal);
    },
  });

  // ── Commands ───────────────────────────────────────────────────────────────

  pi.registerCommand("search", {
    description: "Search papers: /search <query> [max-results]",
    handler: async (args, ctx) => {
      const parts = args?.trim().split(/\s+/) || [];
      const query = parts[0] || "";
      const maxResults = parseInt(parts[1]) || 5;

      if (!query) {
        ctx.ui.notify("Usage: /search <query> [max-results]", "warning");
        return;
      }

      const result = await pi.tools.execute("research_search", { query, maxResults });
      ctx.ui.notify(`Found ${state.papers.length} papers`, "success");
    },
  });

  pi.registerCommand("read", {
    description: "Deep read a paper: /read <paper-id>",
    handler: async (args, ctx) => {
      const paperId = args?.trim();
      if (!paperId) {
        ctx.ui.notify("Usage: /read <paper-id>", "warning");
        return;
      }

      ctx.ui.notify("Starting deep read...", "info");
      const result = await pi.tools.execute("research_read", {
        paperIds: [paperId],
        parallel: false,
      });
    },
  });

  pi.registerCommand("read-all", {
    description: "Deep read all papers from last search: /read-all",
    handler: async (args, ctx) => {
      if (state.papers.length === 0) {
        ctx.ui.notify("No papers to read. Search first.", "warning");
        return;
      }

      ctx.ui.notify(`Reading ${state.papers.length} papers in parallel...`, "info");
      const result = await pi.tools.execute("research_read", {
        paperIds: state.papers.map(p => p.id),
        parallel: true,
      });
    },
  });

  // ── Session lifecycle ────────────────────────────────────────────────────────

  pi.on("session_start", () => {
    state.papers = [];
    state.subAgents.clear();
    state.nextSubId = 1;
    state.currentTopic = "";
    console.log("Research Pipeline ready");
  });

  pi.on("unload", () => {
    // Kill all running sub-agents
    for (const agent of state.subAgents.values()) {
      if (agent.proc) {
        agent.proc.kill("SIGTERM");
      }
    }
  });

  console.log("✅ Research Pipeline extension ready");
}

export const metadata = {
  name: "research-pipeline",
  version: "1.0.0",
  description: "Two-phase research: search abstracts → spawn sub-agents for deep reading",
};
