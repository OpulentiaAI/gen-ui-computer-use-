import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { EnvironmentAPI } from "../environment";

// =============================================================================
// Scout Tools Schema Definition (AISDK5 Compliant)
// =============================================================================

// -----------------------------------------------------------------------------
// Common Helpers, Enums, and Complex Types
// -----------------------------------------------------------------------------

// Helpers
// Flexible Absolute Path definition allowing common roots
const AbsolutePath = z
  .string()
  .regex(
    /^\/(?:project\/workspace|home\/scrapybara)\/.*/,
    "Path must be absolute (e.g., /project/workspace/file or /home/scrapybara/file)"
  );
const PngPath = AbsolutePath.endsWith(
  ".png",
  "Path must end with .png"
);
const RepoFormat = z
  .string()
  .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Repository must be in "owner/repo" format');

// Enums
const AspectRatio = z.enum(["square", "landscape", "portrait"]);
const DateRange = z.enum(["all", "past_hour", "past_day", "past_week", "past_month", "past_year"]);
const TemplateType = z.enum(["website", "presentation"]);
const PRAction = z.enum(["create", "update"]);
const SocialNetwork = z.enum(["twitter", "bluesky"]);
const ComputerAction = z.enum([
  "key",
  "hold_key",
  "type",
  "cursor_position",
  "mouse_move",
  "left_mouse_down",
  "left_mouse_up",
  "left_click",
  "left_click_drag",
  "right_click",
  "middle_click",
  "double_click",
  "triple_click",
  "scroll",
  "wait",
  "screenshot",
]);
const ScrollDirection = z.enum(["up", "down", "left", "right"]);
const TaskStatus = z.enum(["pending", "in_progress", "completed", "cancelled"]);
const LSPOperation = z.enum([
  "definitions",
  "references",
  "hover",
  "symbols",
  "workspace-symbols",
  "diagnostics",
]);
const Language = z.enum([
  "python",
  "typescript",
  "javascript",
  "java",
  "rust",
  "csharp",
  "go",
  "dart",
  "ruby",
  "kotlin",
  "cpp",
]);

// Complex Types
const EditOperation = z
  .object({
    old_string: z
      .string()
      .min(1, "old_string cannot be empty. Must match file contents exactly."),
    new_string: z.string(),
    replace_all: z.boolean().optional().default(false),
  })
  .refine((data) => data.old_string !== data.new_string, {
    message: "new_string must differ from old_string",
    path: ["new_string"],
  });

// Screen resolution constraints (1024x768)
const Coordinate = z.tuple([
  z.number().int().min(0).max(1024), // X coordinate
  z.number().int().min(0).max(768), // Y coordinate
]);

const InputQuestion = z.object({
  type: z.enum(["text", "number", "date"]),
  question: z.string().min(1),
  placeholder: z.union([z.string(), z.number()]).optional(),
  suggestions: z.array(z.string()).optional(),
});

const SelectOption = z.object({
  // Basic emoji validation by length; precise validation depends on environment.
  emoji: z.string().min(1).max(4),
  title: z.string().min(1),
  prompt: z.string().min(1),
});

const Task = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: TaskStatus,
});

// -----------------------------------------------------------------------------
// Tool Definitions
// -----------------------------------------------------------------------------

export const ScoutTools = {
  // ===========================================================================
  // File Operations
  // ===========================================================================
  ls: {
    description: 'Directory listing tool for exploring file system structure.',
    parameters: z.object({
      path: AbsolutePath,
      ignore: z.array(z.string()).optional(),
    }),
  },
  read: {
    description: 'File content reader with multimodal support.',
    parameters: z.object({
      file_path: AbsolutePath,
      offset: z.number().int().positive().optional(), // 1-indexed
      limit: z.number().int().positive().optional(),
    }),
  },
  glob: {
    description: 'File pattern matching tool.',
    parameters: z.object({
      pattern: z.string().min(1),
      path: AbsolutePath.optional(),
    }),
  },
  grep: {
    description: 'Content search tool with regex support.',
    parameters: z.object({
      pattern: z.string().min(1),
      include: z.string().optional(),
      path: AbsolutePath.optional(),
    }),
  },
  edit: {
    description: 'Precise file content editor. Performs exact string replacements atomically.',
    parameters: z.object({
      file_path: AbsolutePath,
      edits: z.array(EditOperation).min(1),
    }),
  },
  write: {
    description: 'File creation and overwrite tool.',
    parameters: z.object({
      file_path: AbsolutePath,
      content: z.string(),
    }),
  },

  // ===========================================================================
  // Image Tools
  // ===========================================================================
  image_generate: {
    description: 'AI image generation tool.',
    parameters: z.object({
      path: PngPath,
      // Explicitly restrict prompts containing specific keywords.
      prompt: z
        .string()
        .min(1)
        .refine(
          (p) =>
            ![
              'graph',
              'chart',
              'diagram',
              'wireframe',
              'mockup',
              'flowchart',
              'ui design',
              'sitemap',
              'plot',
              'mind map',
            ].some((word) => p.toLowerCase().includes(word)),
          {
            message:
              'Prompt cannot contain restricted words like graph, chart, mockup, etc. Use code generation instead.',
          }
        ),
      aspect_ratio: AspectRatio,
      referenceImagePaths: z.array(AbsolutePath).optional(),
      transparency: z.boolean().optional().default(false),
      include_text: z.boolean().optional().default(false),
    }),
  },
  image_edit: {
    description: 'AI image editing tool.',
    parameters: z.object({
      imagePaths: z.array(AbsolutePath).min(1),
      prompt: z.string().min(1),
      outputPath: PngPath,
      transparency: z.boolean().optional().default(false),
    }),
  },
  image_search: {
    description: 'Web image search engine.',
    parameters: z.object({
      query: z.string().min(1),
      count: z.number().int().min(5).max(10).optional().default(5),
    }),
  },

  // ===========================================================================
  // Web and Search Tools
  // ===========================================================================
  web_search: {
    description: 'Web search engine for up-to-date information.',
    parameters: z.object({
      query: z.string().min(1),
      dateRange: DateRange.optional().default('all'),
    }),
  },
  browser_navigate: {
    description: 'Web browser navigation tool.',
    parameters: z.object({
      url: z.string().url(),
      rawHtml: z.boolean().optional().default(false),
    }),
  },
  web_download: {
    description: 'File download tool from web sources.',
    parameters: z.object({
      url: z.string().url(),
      path: AbsolutePath,
    }),
  },

  // ===========================================================================
  // Development Tools
  // ===========================================================================
  bash_run: {
    description: 'Shell command execution tool.',
    parameters: z.object({
      // Explicitly prohibit specific commands that should be replaced by dedicated tools.
      command: z
        .string()
        .min(1)
        .refine(
          (c) => !/^(find|grep|cat|head|tail|ls)(\s|$)/.test(c),
          {
            message:
              'Use specialized tools (Grep, Glob, Read, LS) instead of find, grep, cat, head, tail, ls.',
          }
        ),
      description: z.string().min(5).max(150), // 5-10 words description recommended
      timeout: z.number().int().min(1).max(600).optional().default(10),
    }),
  },
  bash_command_check: {
    description: 'Background command status checker.',
    parameters: z.object({
      command_id: z.number().int().positive(),
    }),
  },
  code_template: {
    description: 'Project template initialization tool.',
    parameters: z.object({
      name: z.string().min(1),
      type: TemplateType.optional().default('website'),
    }),
  },

  // ===========================================================================
  // Project and Version Control
  // ===========================================================================
  download_project_file: {
    description: 'Project file downloader.',
    parameters: z.object({
      filename: z.string().min(1),
      destination: AbsolutePath.optional(),
    }),
  },
  github_pr: {
    description: 'GitHub pull request creator/updater.',
    parameters: z.object({
      title: z.string().min(1),
      summary: z.string().min(1),
      branchName: z.string().min(1),
      repo: RepoFormat,
      action: PRAction,
    }),
  },

  // ===========================================================================
  // Social Media Tools
  // ===========================================================================
  socials_search: {
    description: 'Social media search tool (X/Twitter or Bluesky).',
    parameters: z
      .object({
        network: SocialNetwork.optional().default('twitter'),
        query: z.string().optional(),
        username: z
          .string()
          .optional()
          .refine((u) => !u || !u.startsWith('@'), 'Username should not include the @ symbol'),
      })
      .refine((data) => data.query || data.username, {
        message: 'Either query or username must be provided.',
      }),
  },

  // ===========================================================================
  // User Interface Tools
  // ===========================================================================
  computer: {
    description: 'Mouse and keyboard interface tool. Screen resolution is 1024x768.',
    parameters: z
      .object({
        action: ComputerAction,
        coordinate: Coordinate.optional(),
        text: z.string().optional(),
        duration: z.number().positive().optional(),
        scroll_direction: ScrollDirection.optional(),
        scroll_amount: z.number().int().positive().optional(),
        start_coordinate: Coordinate.optional(),
      })
      .refine(
        (data) => {
          // Conditional validation based on the required parameters for each action
          // Actions requiring coordinate
          if (
            [
              'mouse_move',
              'left_click',
              'right_click',
              'middle_click',
              'double_click',
              'triple_click',
            ].includes(data.action) &&
            !data.coordinate
          )
            return false;
          // Drag requires start and end coordinates
          if (
            data.action === 'left_click_drag' &&
            (!data.coordinate || !data.start_coordinate)
          )
            return false;
          // Actions requiring text
          if (["type", "key"].includes(data.action) && !data.text) return false;
          // hold_key requires text AND duration
          if (data.action === 'hold_key' && (!data.text || data.duration === undefined))
            return false;
          // wait requires duration
          if (data.action === 'wait' && data.duration === undefined) return false;
          // scroll requires direction AND amount
          if (
            data.action === 'scroll' &&
            (!data.scroll_direction || data.scroll_amount === undefined)
          )
            return false;

          return true;
        },
        {
          message:
            'Missing required parameters (text, coordinate, duration, etc.) for the specified action. Check documentation.',
        }
      ),
  },
  message_update: {
    description: 'User progress update tool (Non-blocking).',
    parameters: z.object({
      message: z.string().min(1),
      status: z.string().min(1), // Present continuous tense
      status_emoji: z.string().min(1).max(4),
    }),
  },
  message_ask: {
    description: 'User question and task completion tool (BLOCKS EXECUTION).',
    parameters: z
      .object({
        message: z.string().min(1),
        attachment: AbsolutePath.optional(),
        follow_ups_input: z.array(InputQuestion).min(2).optional(),
        follow_ups_select: z.array(SelectOption).min(2).optional(),
        // Enforce mutual exclusion
      })
      .refine(
        (data) => !(data.follow_ups_input && data.follow_ups_select),
        {
          message: 'Cannot provide both follow_ups_input and follow_ups_select.',
        }
      )
      // Enforce the requirement that follow-ups MUST be provided.
      .refine((data) => data.follow_ups_input || data.follow_ups_select, {
        message: 'MUST include at least two follow-ups (either follow_ups_input or follow_ups_select).',
      }),
  },
  todo: {
    description: 'Task management tool.',
    parameters: z
      .object({
        tasks: z.array(Task).min(1),
        request_user_approval: z.boolean().optional().default(false),
        // Enforce that only one task can be in progress simultaneously.
      })
      .refine(
        (data) => data.tasks.filter((t) => t.status === 'in_progress').length <= 1,
        {
          message: "Only one task can be 'in_progress' at a time.",
          path: ['tasks'],
        }
      ),
  },

  // ===========================================================================
  // Advanced Tools
  // ===========================================================================
  lsp: {
    description: 'Language Server Protocol (LSP) interface tool.',
    parameters: z
      .object({
        operation: LSPOperation,
        file_path: AbsolutePath.optional(),
        line: z.number().int().nonnegative().optional(), // 0-based
        column: z.number().int().nonnegative().optional(), // 0-based
        query: z.string().optional(),
        language: Language.optional(),
        repo_root: AbsolutePath.optional(),
        verbose: z.boolean().optional().default(false),
      })
      .refine(
        (data) => {
          // Conditional validation based on the required parameters for each operation
          const requiresPosition = [
            'definitions',
            'references',
            'hover',
          ].includes(data.operation);
          const requiresFile =
            ['symbols', 'diagnostics'].includes(data.operation) || requiresPosition;
          const requiresQuery = data.operation === 'workspace-symbols';

          if (
            requiresPosition &&
            (data.line === undefined ||
              data.column === undefined ||
              !data.file_path)
          )
            return false;
          if (requiresFile && !data.file_path) return false;
          if (requiresQuery && !data.query) return false;

          return true;
        },
        {
          message:
            'Missing required parameters (file_path, line, column, or query) for the specified LSP operation.',
        }
      ),
  },
  read_agent: {
    description: 'Sub-agent execution tool for read-only tasks.',
    parameters: z.object({
      task: z.string().min(1),
      description: z.string().min(1),
    }),
  },
  handoff: {
    description:
      'Context management tool. Resets context and hands off to a fresh agent.',
    parameters: z.object({
      primary_request: z.string().min(1),
      reason: z.string().min(1),
      key_topics: z.string().min(1),
      files_and_resources: z.string().min(1),
      problem_solving: z.string().min(1),
      current_task: z.string().min(1),
      next_step: z.string().min(1),
      errors_and_fixes: z.string().optional(),
    }),
  },
  github_command: {
    description: 'GitHub CLI and Git command execution tool.',
    parameters: z.object({
      command: z.string().min(1),
      description: z.string().min(1),
      repo: RepoFormat,
    }),
  },
} as const;

/**
 * Maps the AISDK5 Zod definitions to LangChain DynamicStructuredTools.
 * @param environmentApi - The service connecting to the AISDK5 runtime.
 */
export function createAisdk5Tools(
  environmentApi: EnvironmentAPI
): DynamicStructuredTool[] {
  const tools: DynamicStructuredTool[] = [];

  for (const [toolName, definition] of Object.entries(ScoutTools)) {
    const tool = new DynamicStructuredTool({
      name: toolName,
      description: definition.description,
      schema: definition.parameters,
      // The execution logic relies on the standardized AISDK5 environment API
      func: async (input) => {
        try {
          console.log(`[Agent] Executing AISDK5 tool: ${toolName}`, input);
          // Call the execution environment service
          const result = await environmentApi.executeTool(toolName, input);

          // LangChain expects string output from tools
          return JSON.stringify(result);
        } catch (error: any) {
          // Return structured error information for the LLM to interpret and self-correct
          return JSON.stringify({
            error: error.message,
            tool: toolName,
            input,
            status: 'FAILURE',
          });
        }
      },
    });
    tools.push(tool);
  }
  return tools;
}
