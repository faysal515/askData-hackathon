import { createAzure } from "@ai-sdk/azure";

import {
  convertToCoreMessages,
  streamText,
  ToolInvocation,
  ToolResultPart,
} from "ai";
import { codeBlock } from "common-tags";
import {
  convertToCoreTools,
  maxMessageContext,
  maxRowLimit,
  tools,
} from "@/lib/tools";

export type ChatInferenceEventToolResult = {
  toolName: string;
  success: boolean;
};

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type Message = {
  role: "user" | "assistant";
  content: string;
  toolInvocations?: (ToolInvocation & { result: any })[];
};

const chatModel = process.env.OPENAI_MODEL ?? "gpt-4o";

console.log(
  process.env.AZURE_OPENAI_RESOURCE_NAME,
  process.env.AZURE_OPENAI_API_KEY,
  chatModel
);

const azureOpenAi = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages, databaseId }: { messages: Message[]; databaseId: string } =
    await req.json();

  // Trim the message context sent to the LLM to mitigate token abuse
  const trimmedMessageContext = messages.slice(-maxMessageContext);

  const coreMessages = convertToCoreMessages(trimmedMessageContext);
  const coreTools = convertToCoreTools(tools);

  const result = await streamText({
    system: codeBlock`
      You are a helpful database assistant. Under the hood you have access to an in-browser Postgres database called PGlite (https://github.com/electric-sql/pglite).
      Some special notes about this database:
      - foreign data wrappers are not supported
      - the following extensions are available:
        - plpgsql [pre-enabled]
        - vector (https://github.com/pgvector/pgvector) [pre-enabled]
          - use <=> for cosine distance (default to this)
          - use <#> for negative inner product
          - use <-> for L2 distance
          - use <+> for L1 distance
          - note queried vectors will be truncated/redacted due to their size - export as CSV if the full vector is required

      When generating tables, do the following:
      - For primary keys, always use "id bigint primary key generated always as identity" (not serial)
      - Prefer 'text' over 'varchar'
      - Keep explanations brief but helpful
      - Don't repeat yourself after creating the table

      When creating sample data:
      - Make the data realistic, including joined data
      - Check for existing records/conflicts in the table

      When querying data, limit to 5 by default. The maximum number of rows you're allowed to fetch is ${maxRowLimit} (to protect AI from token abuse).
      If the user needs to fetch more than ${maxRowLimit} rows at once, they can export the query as a CSV.

      When performing FTS, always use 'simple' (languages aren't available).

      When importing CSVs try to solve the problem yourself (eg. use a generic text column, then refine)
      vs. asking the user to change the CSV. No need to select rows after importing.

      You also know math. All math equations and expressions must be written in KaTex and must be wrapped in double dollar \`$$\`:
        - Inline: $$\\sqrt{26}$$
        - Multiline:
            $$
            \\sqrt{26}
            $$

      No images are allowed. Do not try to generate or link images, including base64 data URLs.

      Feel free to suggest corrections for suspected typos.
    `,
    model: azureOpenAi(chatModel),
    messages: coreMessages,
    tools: coreTools,
    async onFinish({ usage, finishReason, toolCalls }) {
      const inputMessage = coreMessages.at(-1);
      if (
        !inputMessage ||
        (inputMessage.role !== "user" && inputMessage.role !== "tool")
      ) {
        return;
      }

      // `tool` role indicates a tool result, `user` role indicates a user message
      const inputType =
        inputMessage.role === "tool" ? "tool-result" : "user-message";
      const toolResults =
        inputMessage.role === "tool"
          ? inputMessage.content
              .map((toolResult) => getEventToolResult(toolResult))
              .filter((eventToolResult) => eventToolResult !== undefined)
          : undefined;

      // +1 for the assistant message just received
      const messageCount = coreMessages.length + 1;
    },
  });

  return result.toAIStreamResponse();
}

function getEventToolResult(
  toolResult: ToolResultPart
): ChatInferenceEventToolResult | undefined {
  try {
    if (
      !("result" in toolResult) ||
      !toolResult.result ||
      typeof toolResult.result !== "object" ||
      !("success" in toolResult.result) ||
      typeof toolResult.result.success !== "boolean"
    ) {
      return undefined;
    }

    const {
      toolName,
      result: { success },
    } = toolResult;

    return {
      toolName,
      success,
    };
  } catch (error) {
    return undefined;
  }
}
