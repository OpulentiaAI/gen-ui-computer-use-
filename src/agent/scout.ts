import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createAisdk5Tools } from "./tools/aisdk5";
import { AISDK5_SYSTEM_PROMPT } from "./prompts/system";
import { EnvironmentAPI } from "./environment";

/**
 * Creates a GPT-5 powered agent equipped with the AISDK5 toolset.
 */
export async function createScoutAgent(environmentApi: EnvironmentAPI) {
  const tools = createAisdk5Tools(environmentApi);

  const model = new ChatOpenAI({
    modelName: "gpt-5",
    temperature: 0.1,
    streaming: true,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", AISDK5_SYSTEM_PROMPT],
    new MessagesPlaceholder("chat_history"),
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  return createOpenAIToolsAgent({ llm: model, tools, prompt });
}
