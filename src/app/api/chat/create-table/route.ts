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
      numericColumns: z.array(
        z.string({
          description: "numeric columns in the dataset. only the column name",
        })
      ),
      sql: z.string(),
      analyticsQuestions: z.array(z.string()),
    }),
    prompt: `
    Given the following data preview and file name, perform the following tasks:

    1. Generate a SQL Query:
    - Create a SQL query to define a table based on the data preview provided. Follow these rules:
    - The table name should be in lowercase.
    - The columns should be in lowercase with no spaces; replace spaces with underscores.
    - Determine the data types based on the preview:
    - Use text for string values or columns with unknown types.
    - Use numeric for columns with numbers.
    - Use text for longitude and latitude.
    - Use date for columns with date strings.

    2. Generate Analytics Questions:
    - Analyze the data preview and suggest three relevant analytics questions that can be derived from the dataset. Follow these rules:
    - Ensure the questions are practical, actionable, and based on the columns and data provided.
    - Think of these questions might be asked by a business user or decision maker who doesn't have a technical background.
    - if there's column of date type or numeric type, prepare a question that uses those columns.
    - Prepare two questions which can be answered in text format and one question that can be answered in chart.

    ---- preview start ----
    ${preview}
    ---- preview end ----
    
    file name: ${fileName}
    
    `,
  });

  return NextResponse.json(object);
}
