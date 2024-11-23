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
      columns: z.array(
        z.string({
          description: "no data type required. only the column name.",
        })
      ),
      dateColumns: z.array(
        z.string({
          description: "date columns in the dataset. only the column name",
        })
      ),
      sql: z.string(),
    }),
    prompt: `
    Given the following data preview and file name, generate the sql query to create a table and the columns.
    ---- preview start ----
    ${preview}
    ---- preview end ----
    
    file name: ${fileName}
    
    Few things to remember:
    1. The table name should be in lowercase.
    2. The columns should be in lowercase.
    3. look for data type from the preview and use the appropriate data type.
    4. prefer using text type for the columns string values or columns that you're not sure about the data type.
    5. for longitude and latitude, use text type.
    6. some columns might have date as string. in that case, use date type.
    
    `,
  });

  return NextResponse.json(object);
}
