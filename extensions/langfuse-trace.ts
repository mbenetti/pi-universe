import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Langfuse } from "langfuse-node";
import * as fs from "fs";
import * as path from "path";

// ── Simple .env loader ──────────────────────────────────────────────────────

function loadDotenv(envPath: string): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      vars[key] = value;
    }
  } catch {
    // .env not found – fall back to process.env
  }
  return vars;
}

// Try multiple locations for .env to handle pi's working directory
const possibleEnvPaths = [
  path.join(process.cwd(), ".env"), // Current working directory
  path.join(process.cwd(), ".pi", ".env"), // .pi directory
  path.join(__dirname, "..", ".env"), // Parent of .pi/extensions
  path.join(process.cwd(), ".pi", "extensions", ".env"), // Extensions directory
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  const vars = loadDotenv(envPath);
  if (Object.keys(vars).length > 0) {
    console.log(`[langfuse] Loaded .env from: ${envPath}`);
    Object.assign(process.env, vars);
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  console.log("[langfuse] No .env found, using process.env");
}

// ── Langfuse client ──────────────────────────────────────────────────────────

let langfuse: Langfuse | null = null;

function getClient(): Langfuse | null {
  if (langfuse) return langfuse;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

  if (!publicKey || !secretKey) {
    console.warn(
      "[langfuse] Missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY – tracing disabled",
    );
    return null;
  }

  try {
    langfuse = new Langfuse({
      publicKey,
      secretKey,
      baseUrl,
      debug: process.env.LANGFUSE_DEBUG === "true",
      flushAt: 1,
      flushInterval: 5,
    });
    console.log(
      `[langfuse] Initialized with baseUrl=${baseUrl}, publicKey=${publicKey?.substring(0, 10)}...`,
    );
  } catch (err) {
    console.error("[langfuse] Failed to initialize:", err);
    return null;
  }

  return langfuse;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sessionKey(sm: ExtensionAPI["sessionManager"]): string {
  const file = sm.getSessionFile();
  const basename = file
    ? file.split("/").pop()?.replace(".jsonl", "")
    : "ephemeral";
  return basename || `session-${Date.now()}`;
}

function traceName(sm: ExtensionAPI["sessionManager"]): string {
  const file = sm.getSessionFile();
  return file
    ? file.split("/").pop()?.replace(".jsonl", "")
    : "unknown-session";
}

// ── Extension ────────────────────────────────────────────────────────────────

export default async function (pi: ExtensionAPI) {
  const client = getClient();
  if (!client) return;

  // Fallback session handling when sessionManager is unavailable
  const hasSessionManager = !!pi.sessionManager;
  const sessionIdentifier = hasSessionManager
    ? sessionKey(pi.sessionManager)
    : `ephemeral-${Date.now()}`;
  const traceNameValue = hasSessionManager
    ? traceName(pi.sessionManager)
    : "ephemeral-session";
  const sessionFile = hasSessionManager
    ? pi.sessionManager!.getSessionFile()
    : undefined;

  if (!hasSessionManager) {
    console.log(
      "[langfuse] sessionManager unavailable – using ephemeral session",
    );
  }

  // Create a trace for this session
  const trace = client.trace({
    id: `pi-${sessionIdentifier}`,
    name: traceNameValue,
    userId: sessionIdentifier,
    tags: ["pi-agent"],
    metadata: {
      sessionFile,
      langfuse: "pi-extension",
      baseUrl: process.env.LANGFUSE_BASE_URL || "cloud",
      ephemeral: !hasSessionManager,
    },
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  pi.on("session_start", async (event) => {
    trace.update({
      sessionId: sessionIdentifier,
      tags: ["pi-agent"],
      userId: sessionIdentifier,
      metadata: {
        ...trace.inputRecord?.metadata,
        reason: event.reason,
        previousSessionFile: event.previousSessionFile,
      },
    });
  });

  // ── Prompt turn ────────────────────────────────────────────────────────────

  let turnSpan: ReturnType<typeof trace.span> | null = null;

  pi.on("agent_start", async (_event, ctx) => {
    turnSpan = trace.span({
      name: `turn-${trace.name}`,
      input: {
        prompt: _event.prompt,
        images: _event.images?.length || 0,
        systemPromptLength: ctx.getSystemPrompt()?.length || 0,
      },
      metadata: {
        model: ctx.model?.id,
        provider: ctx.model?.provider,
        thinkingLevel: ctx.model?.thinkingLevel,
      },
    });
  });

  pi.on("agent_end", async (event) => {
    const assistantText = event.messages
      .filter((m) => m.role === "assistant")
      .map(
        (m) =>
          m.content
            ?.map((c) => c.text)
            .filter(Boolean)
            .join("") || "",
      )
      .join("\n\n")
      .trim();

    turnSpan?.update({
      output: assistantText,
      metadata: {
        messageCount: event.messages.length,
      },
    });
    turnSpan?.end();
    turnSpan = null;
  });

  // ── Provider request / response (actual API calls) ────────────────────────

  let activeGeneration: ReturnType<typeof trace.generation> | null = null;

  pi.on("before_provider_request", (event) => {
    const modelId = event.model?.id || "unknown";

    activeGeneration = trace.generation({
      name: modelId,
      model: modelId,
      input: event.payload?.messages || [],
      metadata: {
        provider: event.providerId,
        api: event.apiType,
        traceId: `pi-${sessionIdentifier}`,
      },
    });

    // Also record as a span event
    trace.event({
      name: `provider_request:${modelId}`,
      input: {
        model: modelId,
        provider: event.providerId,
        messageCount: (event.payload?.messages || []).length,
      },
    });

    // Do not return a value — return undefined to keep the payload unchanged.
    // Returning anything here replaces the request payload, which breaks the API call.
  });

  pi.on("after_provider_response", async (event, ctx) => {
    if (activeGeneration) {
      activeGeneration.update({
        output: event.responseBody,
        usage: {
          promptTokens: event.usage?.inputTokens,
          completionTokens: event.usage?.outputTokens,
          totalTokens: event.usage?.totalTokens,
        },
        metadata: {
          httpStatus: event.status,
        },
      });
      activeGeneration.end();
      activeGeneration = null;
    }
  });

  // ── Tool execution ─────────────────────────────────────────────────────────

  pi.on("tool_execution_start", (event) => {
    trace.event({
      name: `tool_start:${event.toolName}`,
      input: {
        toolCallId: event.toolCallId,
        args: event.args,
      },
    });
  });

  pi.on("tool_execution_end", (event) => {
    // event.result can be an array of content blocks, a string, or an object
    let resultText = "";
    const resultArr = Array.isArray(event.result) ? event.result : [];
    if (resultArr.length > 0) {
      resultText = resultArr
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("")
        .slice(0, 2000);
    } else if (typeof event.result === "string") {
      resultText = event.result.slice(0, 2000);
    }

    trace.event({
      name: `tool_end:${event.toolName}`,
      input: {
        toolCallId: event.toolCallId,
        result: event.isError ? { error: true } : { success: true },
      },
      output: event.isError
        ? { error: true }
        : { resultPreview: resultText },
    });
  });

  // ── Messages ───────────────────────────────────────────────────────────────

  pi.on("message_start", (event) => {
    trace.event({
      name: `message_start:${event.message.type || "unknown"}`,
      input: { role: event.message.role },
    });
  });

  pi.on("message_end", (event) => {
    trace.event({
      name: `message_end:${event.message.type || "unknown"}`,
      output: {
        role: event.message.role,
        contentPreview: event.message.content
          ?.filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("")
          .slice(0, 1000),
      },
    });
  });

  // ── Turn events ────────────────────────────────────────────────────────────

  pi.on("turn_start", (event) => {
    trace.event({
      name: "turn_start",
      input: { turnIndex: event.turnIndex },
    });
  });

  pi.on("turn_end", (event) => {
    const assistantMsg = event.message;
    trace.event({
      name: "turn_end",
      input: {
        turnIndex: event.turnIndex,
        toolCallCount: (event.toolResults || []).length,
        messageRole: assistantMsg?.role,
        messageLength: assistantMsg?.content
          ?.map((c) => c.text?.length || 0)
          .reduce((a, b) => a + b, 0),
      },
    });
  });

  // ── Model changes ──────────────────────────────────────────────────────────

  pi.on("model_select", (event) => {
    trace.event({
      name: "model_select",
      input: {
        previousModel: event.previousModel?.id,
        newModel: event.model.id,
        source: event.source,
      },
    });
  });

  // ── Shutdown ───────────────────────────────────────────────────────────────

  pi.on("session_shutdown", async () => {
    try {
      // Use shutdownAsync() which waits for all pending events to be flushed
      await client.shutdownAsync();
    } catch (err) {
      console.error("[langfuse] Shutdown error:", err);
    }
    langfuse = null;
  });
}
