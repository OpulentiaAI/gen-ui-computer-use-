import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createAisdk5Tools } from "./tools/aisdk5";
import { AISDK5_SYSTEM_PROMPT } from "./prompts/system";
import { EnvironmentAPI } from "./environment";

export interface ScoutAgentConfig {
  environmentApi: EnvironmentAPI;
  modelName?: string;
  temperature?: number;
  verboseLogging?: boolean;
}

/**
 * Creates a GPT-5 powered agent equipped with the AISDK5 toolset.
 */
export async function createScoutAgent(config: ScoutAgentConfig) {
  const verboseLogging =
    config.verboseLogging ?? process.env.AGENT_VERBOSE_LOGGING === "true";
  const modelName =
    config.modelName ?? process.env.AGENT_MODEL_NAME ?? "gpt-5";
  const temperature =
    config.temperature ?? parseFloat(process.env.AGENT_TEMPERATURE || "0.1");

  const tools = createAisdk5Tools(config.environmentApi, verboseLogging);

  if (verboseLogging) {
    console.log(
      `[Agent Setup] Initializing Scout Agent with model: ${modelName}, temperature: ${temperature}`,
    );
  }

  const model = new ChatOpenAI({
    modelName,
    temperature,
    streaming: true,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", AISDK5_SYSTEM_PROMPT],
    new MessagesPlaceholder("chat_history"),
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  return createOpenAIToolsAgent({ llm: model, tools, prompt });
}
