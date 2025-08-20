import { StateGraph, START, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import type { Runnable } from "@langchain/core/runnables";

interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface AgentOutcome {
  tool_calls?: AgentToolCall[];
}

interface AgentState {
  chat_history: BaseMessage[];
  agentOutcome?: AgentOutcome;
  latest_screenshot?: string;
  current_ui_status?: { message: string; status: string; emoji: string };
  current_todo_list?: Array<object>;
}

async function runAgent(
  state: AgentState,
  agent: Runnable<{ chat_history: BaseMessage[] }, AgentOutcome>,
): Promise<Partial<AgentState>> {
  const response = await agent.invoke({ chat_history: state.chat_history });
  return { agentOutcome: response };
}

function shouldContinue(state: AgentState): "continue" | "end" {
  return state.agentOutcome?.tool_calls?.length ? "continue" : "end";
}

function executeToolsFactory(tools: DynamicStructuredTool[]) {
  return async function executeTools(
    state: AgentState,
  ): Promise<Partial<AgentState>> {
    const actions = state.agentOutcome?.tool_calls ?? [];
    const outputs: Array<{
      toolName: string;
      result: Record<string, unknown>;
      input: Record<string, unknown>;
    }> = [];

    for (const call of actions) {
      const tool = tools.find((t) => t.name === call.name);
      if (!tool) continue;
      const raw = await tool.invoke(call.args);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw as string);
      } catch {
        parsed = { raw } as Record<string, unknown>;
      }
      outputs.push({ toolName: call.name, result: parsed, input: call.args });
    }

    const newState: Partial<AgentState> = {};
    const multimodalMessages: BaseMessage[] = [];

    for (const output of outputs) {
      if (output.toolName === "computer" && output.result.screenshot) {
        const screenshot = output.result.screenshot as string;
        newState.latest_screenshot = screenshot;
        multimodalMessages.push(
          new HumanMessage({
            content: [
              {
                type: "text",
                text: `[System Observation] Screenshot after action: ${String(
                  output.input.action,
                )}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${screenshot}`,
                  detail: "high",
                },
              },
            ],
          }),
        );
      } else if (output.toolName === "message_update") {
        newState.current_ui_status = {
          message: String(output.input.message),
          status: String(output.input.status),
          emoji: String(output.input.status_emoji),
        };
      } else if (output.toolName === "todo") {
        newState.current_todo_list = output.input.tasks as Array<object>;
      }
    }

    if (multimodalMessages.length) {
      newState.chat_history = [...state.chat_history, ...multimodalMessages];
    }

    return newState;
  };
}

export function createScoutWorkflow(
  agent: Runnable<{ chat_history: BaseMessage[] }, AgentOutcome>,
  tools: DynamicStructuredTool[],
) {
  const workflow = new StateGraph<
    AgentState,
    AgentState,
    Partial<AgentState>,
    string,
    any,
    any,
    any
  >({
    channels: {
      // Merge incoming messages, guarding against undefined arrays
      chat_history: (left: BaseMessage[], right: BaseMessage[]) => [
        ...(left ?? []),
        ...(right ?? []),
      ],
      agentOutcome: (
        _left: AgentOutcome | undefined,
        right: AgentOutcome | undefined,
      ) => right,
      latest_screenshot: (
        _left: string | undefined,
        right: string | undefined,
      ) => right,
      current_ui_status: (
        _left:
          | { message: string; status: string; emoji: string }
          | undefined,
        right:
          | { message: string; status: string; emoji: string }
          | undefined,
      ) => right,
      current_todo_list: (
        _left: Array<object> | undefined,
        right: Array<object> | undefined,
      ) => right,
    },
  } as any);
  workflow.addNode("agent", (state: AgentState) => runAgent(state, agent));
  workflow.addNode("tools", executeToolsFactory(tools));
  workflow.addEdge(START, "agent");
  workflow.addConditionalEdges("agent", shouldContinue, {
    continue: "tools",
    end: END,
  });
  workflow.addEdge("tools", "agent");
  return workflow.compile();
}
