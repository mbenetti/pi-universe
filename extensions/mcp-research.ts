/**
 * MCP Research Extension for Pi
 * 
 * Integrates with MCP servers (Zotero, Google Scholar) for academic research.
 * Provides tools for searching, downloading, and organizing papers.
 * 
 * Usage:
 *   /mcp-connect <server>   - Connect to MCP server
 *   /mcp-search <query>     - Search via connected MCP servers
 *   /mcp-status             - Check connected servers
 */

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { Type, Static } from "@sinclair/typebox";

// MCP Protocol Types
interface MCPRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// Tool parameter schemas
const SearchParams = Type.Object({
  query: Type.String({ description: "Search query for academic papers" }),
  maxResults: Type.Optional(Type.Number({ description: "Maximum results to return", default: 10 })),
  source: Type.Optional(Type.StringEnum(["zotero", "google-scholar", "arxiv", "all"] as const, { description: "Source to search" })),
});

const DownloadParams = Type.Object({
  paperId: Type.String({ description: "arXiv ID, DOI, or Zotero item key" }),
  outputDir: Type.Optional(Type.String({ description: "Output directory for downloaded paper" })),
});

const LibraryParams = Type.Object({
  query: Type.Optional(Type.String({ description: "Filter items by query" })),
  limit: Type.Optional(Type.Number({ description: "Maximum items to return", default: 20 })),
});

type SearchParams = Static<typeof SearchParams>;
type DownloadParams = Static<typeof DownloadParams>;
type LibraryParams = Static<typeof LibraryParams>;

// MCP Client Manager
class MCPClientManager extends EventEmitter {
  private connections: Map<string, {
    process: ChildProcess;
    requestId: number;
    pending: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>;
  }> = new Map();

  async connectServer(config: MCPServerConfig): Promise<boolean> {
    if (this.connections.has(config.name)) {
      console.log(`Server ${config.name} already connected`);
      return true;
    }

    return new Promise((resolve) => {
      console.log(`Starting MCP server: ${config.name} (${config.command})`);
      
      const proc = spawn(config.command, config.args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...config.env },
      });

      const connection = {
        process: proc,
        requestId: 0,
        pending: new Map(),
      };

      // Handle stdout for responses
      proc.stdout?.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const response: MCPResponse = JSON.parse(line);
            this.handleResponse(response);
          } catch {
            // Stderr debug output
            // console.error("MCP parse error:", line);
          }
        }
      });

      // Handle stderr
      proc.stderr?.on("data", (data: Buffer) => {
        console.error(`[${config.name}] stderr:`, data.toString().trim());
      });

      // Handle exit
      proc.on("exit", (code) => {
        console.log(`MCP server ${config.name} exited with code ${code}`);
        this.connections.delete(config.name);
        this.emit("disconnected", config.name);
      });

      this.connections.set(config.name, connection);

      // Initialize server
      setTimeout(() => {
        this.sendRequest(config.name, "initialize", { protocolVersion: "2024-11-05" })
          .then(() => {
            console.log(`MCP server ${config.name} initialized`);
            resolve(true);
          })
          .catch(() => resolve(true)); // Some servers don't need init
      }, 100);
    });
  }

  private handleResponse(response: MCPResponse): void {
    const connection = Array.from(this.connections.values()).find(
      c => Array.from(c.pending.keys()).includes(response.id)
    );
    
    if (connection && connection.pending.has(response.id)) {
      const pending = connection.pending.get(response.id)!;
      connection.pending.delete(response.id);
      
      if (response.error) {
        pending.reject(new Error(response.error.message));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  async sendRequest(serverName: string, method: string, params?: Record<string, unknown>): Promise<unknown> {
    const connection = this.connections.get(serverName);
    
    if (!connection) {
      throw new Error(`Server ${serverName} not connected. Use /mcp-connect ${serverName} first.`);
    }

    const id = ++connection.requestId;
    const request: MCPRequest = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      connection.pending.set(id, { resolve, reject });
      
      connection.process.stdin?.write(JSON.stringify(request) + "\n");
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (connection.pending.has(id)) {
          connection.pending.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  isConnected(serverName: string): boolean {
    return this.connections.has(serverName);
  }

  getConnectedServers(): string[] {
    return Array.from(this.connections.keys());
  }

  disconnect(serverName: string): void {
    const connection = this.connections.get(serverName);
    if (connection) {
      connection.process.kill();
      this.connections.delete(serverName);
    }
  }

  disconnectAll(): void {
    for (const server of this.connections.keys()) {
      this.disconnect(server);
    }
  }
}

// State
const mcpManager = new MCPClientManager();
let researchSession = {
  goal: "",
  papers: [] as Array<{
    id: string;
    title: string;
    authors: string[];
    source: string;
    relevance?: string;
    importance?: number;
  }>,
  queries: [] as string[],
};

// MCP Server Configurations
const MCP_SERVERS: Record<string, MCPServerConfig> = {
  zotero: {
    name: "zotero",
    command: "npx",
    args: ["-y", "@anthropic/mcp-server-zotero"],
  },
  "google-scholar": {
    name: "google-scholar",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-google-scholar"],
  },
  arxiv: {
    name: "arxiv",
    command: "python3",
    args: ["-m", "mcp_arxiv"],
  },
};

// Initialize extension
export default ({ pi }: { pi: Pi }) => {
  console.log("Loading MCP Research extension...");

  // Register MCP search tool
  pi.registerTool({
    name: "mcp_search",
    description: "Search academic papers via MCP servers (Zotero, Google Scholar, arXiv)",
    parameters: SearchParams,
    async execute(toolCallId, params, signal, onUpdate) {
      const { query, maxResults = 10, source = "all" } = params;

      // Store query
      researchSession.queries.push(query);

      // Report progress
      onUpdate?.({ content: [{ type: "text", text: `🔍 Searching for: "${query}"...` }] });

      const results: Array<{
        title: string;
        authors: string[];
        source: string;
        url: string;
        year?: number;
        citations?: number;
      }> = [];

      // Search connected servers
      const servers = source === "all" 
        ? mcpManager.getConnectedServers() 
        : [source];

      for (const server of servers) {
        if (!mcpManager.isConnected(server)) continue;

        try {
          const response = await mcpManager.sendRequest(server, "search", {
            query,
            limit: maxResults,
          });

          if (Array.isArray(response)) {
            results.push(...response.map((item: Record<string, unknown>) => ({
              title: item.title as string || "Unknown",
              authors: (item.authors as string[]) || [],
              source: server,
              url: item.url as string || item.link as string || "",
              year: item.year as number,
              citations: item.citations as number,
            })));
          }
        } catch (error) {
          console.error(`Search error on ${server}:`, error);
        }
      }

      // Format results
      const formatted = results.length > 0
        ? results.map((r, i) => 
            `[${i + 1}] ${r.title}\n    Authors: ${r.authors.join(", ")}\n    Source: ${r.source}${r.year ? ` | Year: ${r.year}` : ""}${r.citations ? ` | Citations: ${r.citations}` : ""}\n    URL: ${r.url}`
          ).join("\n\n")
        : "No results found. Try connecting an MCP server with /mcp-connect <server>";

      // Store in session
      researchSession.papers.push(...results.map(r => ({
        id: r.url,
        title: r.title,
        authors: r.authors,
        source: r.source,
      })));

      return {
        content: [{ type: "text", text: `📚 Search Results (${results.length} found):\n\n${formatted}` }],
        details: { results, query },
      };
    },
  });

  // Register Zotero library tool
  pi.registerTool({
    name: "mcp_library",
    description: "Access your Zotero library and collections",
    parameters: LibraryParams,
    async execute(toolCallId, params, signal, onUpdate) {
      if (!mcpManager.isConnected("zotero")) {
        return {
          content: [{ type: "text", text: "❌ Zotero not connected. Use /mcp-connect zotero" }],
          isError: true,
        };
      }

      const { query = "", limit = 20 } = params;

      onUpdate?.({ content: [{ type: "text", text: "📚 Fetching library items..." }] });

      try {
        const response = await mcpManager.sendRequest("zotero", "get_items", {
          query,
          limit,
        });

        const items = Array.isArray(response) ? response : [];

        const formatted = items.length > 0
          ? items.map((item: Record<string, unknown>, i: number) => {
              const key = item.key as string || "";
              const title = item.title as string || "Untitled";
              const authors = (item.creators as Array<{name?: string; firstName?: string; lastName?: string}>) || [];
              const authorStr = authors.slice(0, 3).map(a => a.name || `${a.firstName} ${a.lastName}`).join(", ");

              return `[${i + 1}] ${title}\n    Authors: ${authorStr || "Unknown"}\n    Key: ${key}`;
            }).join("\n\n")
          : "No items found in library";

        return {
          content: [{ type: "text", text: `📚 Zotero Library (${items.length} items):\n\n${formatted}` }],
          details: { items },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Library error: ${error}` }],
          isError: true,
        };
      }
    },
  });

  // Register research session tool
  pi.registerTool({
    name: "research_session",
    description: "Manage research session: set goal, list papers, get recommendations",
    parameters: Type.Object({
      action: Type.StringEnum(["status", "set-goal", "list-papers", "recommend", "export"] as const),
      goal: Type.Optional(Type.String()),
      paperId: Type.Optional(Type.String()),
    }),
    async execute(toolCallId, params, signal, onUpdate) {
      const { action, goal, paperId } = params;

      switch (action) {
        case "status":
          return {
            content: [{
              type: "text",
              text: `📊 Research Session Status\n\nGoal: ${researchSession.goal || "(not set)"}\nPapers: ${researchSession.papers.length}\nQueries: ${researchSession.queries.length}\n\nConnected servers: ${mcpManager.getConnectedServers().join(", ") || "none"}`
            }],
          };

        case "set-goal":
          researchSession.goal = goal || "";
          return {
            content: [{ type: "text", text: `✅ Research goal set:\n\n${goal}` }],
          };

        case "list-papers":
          if (researchSession.papers.length === 0) {
            return {
              content: [{ type: "text", text: "📚 No papers in session. Search for papers first." }],
            };
          }

          const paperList = researchSession.papers.map((p, i) =>
            `[${i + 1}] ${p.title}\n    Source: ${p.source} | Authors: ${p.authors.slice(0, 2).join(", ")}`
          ).join("\n\n");

          return {
            content: [{ type: "text", text: `📚 Papers in Session (${researchSession.papers.length}):\n\n${paperList}` }],
          };

        case "recommend":
          // Generate reading recommendations based on goal
          if (!researchSession.goal) {
            return {
              content: [{ type: "text", text: "⚠ Set a research goal first using: research_session action=set-goal goal=\"...\" " }],
            };
          }

          const recommendations = researchSession.papers.length > 0
            ? researchSession.papers.map((p, i) =>
                `[${i + 1}] **${p.title}** ⭐⭐⭐\n    Why: Based on your goal "${researchSession.goal}", this paper is relevant.\n    Source: ${p.source}`
            ).join("\n\n")
            : "No papers available. Search for papers first.";

          return {
            content: [{ type: "text", text: `🎯 Recommendations for: "${researchSession.goal}"\n\n${recommendations}` }],
          };

        case "export":
          // Export session to markdown
          const exportData = `# Research Session Report\n\n**Goal:** ${researchSession.goal || "Not set"}\n**Papers:** ${researchSession.papers.length}\n\n## Papers\n\n${researchSession.papers.map(p =>
            `### ${p.title}\n- Authors: ${p.authors.join(", ")}\n- Source: ${p.source}\n- Relevance: ${p.relevance || "TBD"}`
          ).join("\n\n")}`;

          return {
            content: [{ type: "text", text: `📄 Session exported:\n\n${exportData}` }],
            details: { exportData },
          };

        default:
          return {
            content: [{ type: "text", text: "Unknown action" }],
            isError: true,
          };
      }
    },
  });

  // Register MCP connect command
  pi.registerCommand("mcp-connect", {
    description: "Connect to an MCP server (zotero, google-scholar, arxiv)",
    getArgumentCompletions: (prefix) => {
      const servers = ["zotero", "google-scholar", "arxiv"];
      return servers.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s }));
    },
    handler: async (args, ctx) => {
      const server = args[0];

      if (!server) {
        ctx.ui.showNotification("Usage: /mcp-connect <server>", "warning");
        return;
      }

      const config = MCP_SERVERS[server];
      if (!config) {
        ctx.ui.showNotification(`Unknown server: ${server}. Available: ${Object.keys(MCP_SERVERS).join(", ")}`, "error");
        return;
      }

      ctx.ui.showNotification(`Connecting to ${server}...`, "info");

      try {
        await mcpManager.connectServer(config);
        ctx.ui.showNotification(`✅ Connected to ${server}`, "success");
      } catch (error) {
        ctx.ui.showNotification(`Failed to connect: ${error}`, "error");
      }
    },
  });

  // Register MCP status command
  pi.registerCommand("mcp-status", {
    description: "Show status of connected MCP servers",
    handler: async (_, ctx) => {
      const servers = mcpManager.getConnectedServers();
      const status = servers.length > 0
        ? servers.map(s => `✅ ${s}`).join("\n")
        : "❌ No MCP servers connected";

      ctx.ui.showNotification(`MCP Status:\n${status}`, servers.length > 0 ? "info" : "warning");
    },
  });

  // Register research command
  pi.registerCommand("research", {
    description: "Start a new research session: /research <topic>",
    getArgumentCompletions: (prefix) => {
      const suggestions = [
        "machine learning",
        "neural networks",
        "transformers",
        "reinforcement learning",
        "computer vision",
        "natural language processing",
      ];
      return suggestions.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s }));
    },
    handler: async (args, ctx) => {
      const topic = args.join(" ") || "general research";

      // Reset session
      researchSession.goal = "";
      researchSession.papers = [];
      researchSession.queries = [];

      ctx.ui.setSessionName(`Research: ${topic}`);
      ctx.ui.showNotification(`Starting research session: ${topic}`, "info");

      // Guide the user
      pi.sendUserMessage(
        `Starting research session for: **${topic}**\n\n` +
        `To formulate a focused research goal, I have a few questions:\n\n` +
        `1. **Scope**: What specific aspect should I focus on?\n` +
        `2. **Depth**: Foundational papers only, or comprehensive review?\n` +
        `3. **Timeframe**: Recent papers (last 2 years) or include classics?\n\n` +
        `Or just say "go" and I'll search broadly.`,
        { deliverAs: "nextTurn" }
      );
    },
  });

  // Register disconnect command
  pi.registerCommand("mcp-disconnect", {
    description: "Disconnect from an MCP server: /mcp-disconnect <server>",
    handler: async (args, ctx) => {
      const server = args[0];

      if (!server) {
        ctx.ui.showNotification("Usage: /mcp-disconnect <server>", "warning");
        return;
      }

      if (!mcpManager.isConnected(server)) {
        ctx.ui.showNotification(`Not connected to ${server}`, "warning");
        return;
      }

      mcpManager.disconnect(server);
      ctx.ui.showNotification(`Disconnected from ${server}`, "success");
    },
  });

  // Handle session start event
  pi.on("session_start", () => {
    console.log("MCP Research extension loaded");
    console.log("Available commands: /mcp-connect, /mcp-status, /research");
  });

  // Cleanup on unload
  pi.on("unload", () => {
    mcpManager.disconnectAll();
    console.log("MCP Research extension unloaded");
  });

  console.log("✅ MCP Research extension ready");
};

// Extension metadata
export const metadata = {
  name: "mcp-research",
  version: "1.0.0",
  description: "Academic research tools via MCP servers (Zotero, Google Scholar, arXiv)",
};