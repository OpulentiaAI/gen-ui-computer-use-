import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";

const apiUrl = process.env.LANGGRAPH_API_URL || "http://localhost";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, runtime } =
  initApiPassthrough({
    apiUrl,
    apiKey: process.env.LANGCHAIN_API_KEY,
    runtime: "edge" as const, // default
  });
