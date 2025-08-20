export interface EnvironmentAPI {
  /**
   * Execute a tool in the AISDK5 runtime.
   * @param tool - Tool name as defined by AISDK5.
   * @param input - Parameters conforming to the tool's Zod schema.
   */
  executeTool(tool: string, input: unknown): Promise<unknown>;
}

/**
 * Minimal HTTP implementation of the environment API. It posts tool calls to
 * a remote endpoint that bridges to the AISDK5 runtime.
 */
export class HttpEnvironment implements EnvironmentAPI {
  constructor(private baseUrl: string, private apiKey?: string) {}

  async executeTool(tool: string, input: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/tools/${tool}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Environment call failed with status ${response.status}`);
    }

    return response.json();
  }
}
