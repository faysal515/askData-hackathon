import { z } from "zod";
import { generateObject } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { NextResponse } from "next/server";

const azureOpenAi = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { preview, fileName }: { preview: string; fileName: string } =
    await req.json();

  const { object } = await generateObject({
    model: azureOpenAi("gpt-4o"),
    schema: z.object({
      tableName: z.string(),
      columns: z.array(z.string()),
      sql: z.string(),
    }),
    prompt: `
    Given the following data preview and file name, generate the sql query to create a table and the columns.
    ---- preview start ----
    ${preview}
    ---- preview end ----
    
    file name: ${fileName}
    `,
  });

  return NextResponse.json(object);
}
