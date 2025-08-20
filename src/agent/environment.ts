export interface EnvironmentAPI {
  /**
   * Execute a tool in the AISDK5 runtime.
   * @param tool - Tool name as defined by AISDK5.
   * @param input - Parameters conforming to the tool's Zod schema.
   */
  executeTool(tool: string, input: unknown): Promise<unknown>;
}

/**
 * Error wrapper for environment interaction failures.
 */
export class EnvironmentError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "EnvironmentError";
  }
}

export interface HttpEnvironmentConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

/**
 * HTTP implementation of the environment API that forwards tool calls to the
 * remote AISDK5 runtime.
 */
export class HttpEnvironment implements EnvironmentAPI {
  private config: Required<Omit<HttpEnvironmentConfig, 'apiKey'>> & {
    apiKey: string;
  };

  constructor(config: HttpEnvironmentConfig) {
    if (!config.baseUrl) {
      throw new Error("Environment runtime base URL is required.");
    }
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey || '',
      timeoutMs: config.timeoutMs || 65000,
    };
  }

  async executeTool(tool: string, input: unknown): Promise<unknown> {
    const signal = AbortSignal.timeout(this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/tools/${tool}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {}),
        },
        body: JSON.stringify(input),
        signal,
      });

      let body: any;
      const contentType = response.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }
      } catch (e) {
        body = { error: 'Failed to parse response body from environment runtime' };
      }

      if (!response.ok) {
        const errorMessage =
          (body?.error || body?.message || String(body)) ||
          `Environment call failed with status ${response.status}`;
        throw new EnvironmentError(String(errorMessage), response.status, body);
      }

      return body;
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new EnvironmentError(
          `Request timed out after ${this.config.timeoutMs}ms`,
        );
      }
      if (error instanceof EnvironmentError) {
        throw error;
      }
      throw new EnvironmentError(
        `Network or configuration error: ${error.message}`,
      );
    }
  }
}
