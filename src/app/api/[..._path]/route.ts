import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";

const apiUrl = process.env.LANGGRAPH_API_URL;
const apiKey = process.env.LANGCHAIN_API_KEY;

export const runtime = "edge";

const notConfigured = async () =>
  new Response(
    JSON.stringify({
      error: "API passthrough not configured",
      message:
        "Set LANGGRAPH_API_URL (and optionally LANGCHAIN_API_KEY) in the deployment environment.",
      missingEnv: "LANGGRAPH_API_URL",
    }),
    {
      status: 500,
      headers: { "content-type": "application/json" },
    }
  );

const handlers = apiUrl
  ? initApiPassthrough({
      apiUrl,
      apiKey,
      runtime: "edge",
    })
  : null;

export const GET = handlers?.GET ?? notConfigured;
export const POST = handlers?.POST ?? notConfigured;
export const PUT = handlers?.PUT ?? notConfigured;
export const PATCH = handlers?.PATCH ?? notConfigured;
export const DELETE = handlers?.DELETE ?? notConfigured;
export const OPTIONS = handlers?.OPTIONS ?? notConfigured;
