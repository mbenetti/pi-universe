import { Type } from "@sinclair/typebox";

export default function tavilyExtension(api: any) {
  api.registerTool({
    name: "tavily_search",
    description: "Search the web using Tavily API.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      search_depth: Type.Optional(Type.String({ description: "Search depth (basic or advanced)" })),
      include_answer: Type.Optional(Type.Boolean({ description: "Include an AI generated answer" }))
    }),
    async execute(params: any) {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        throw new Error("TAVILY_API_KEY environment variable is missing.");
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: params.query,
          search_depth: params.search_depth || "basic",
          include_answer: params.include_answer || false
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);
    }
  });

  api.registerTool({
    name: "tavily_extract",
    description: "Extract content from specific URLs using Tavily API.",
    parameters: Type.Object({
      urls: Type.Array(Type.String({ description: "URLs to extract" }))
    }),
    async execute(params: any) {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        throw new Error("TAVILY_API_KEY environment variable is missing.");
      }

      const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: apiKey,
          urls: params.urls
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);
    }
  });
}
