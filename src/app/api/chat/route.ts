import { z } from "zod";
import { generateObject, streamObject } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { NextResponse } from "next/server";

const azureOpenAi = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages, schema }: { messages: any[]; schema: string } =
    await req.json();

  const { object } = await generateObject({
    model: azureOpenAi("gpt-4o"),

    messages: [
      {
        role: "system",
        content: `Given a postgres schema, you need to give a json response of the user's query.
        ----Schema ---- 
        ${schema}
        ----Schema ---- 

        Some rules to follow:
        1. If the user is asking for a chart, you need to return a json with the function_call_name as "generateChart".
        2. If the user is asking for a report, you need to return a json with the function_call_name as "brainstormReports".
        3. If the user is asking for a sql query, you need to return a json with the function_call_name as "executeSql".

        Since you dont have access to the database, you cant execute and give the proper answer. you need to give a json response with the function_call_required as true.
        and provide the arguments for the function call. either sql_args or report_args or chart_args.

        If you see the data is provided by the tool, you can use that data to give the proper answer. in that case the function_call_required should be false. and content should be the answer.
        `,
      },
      ...messages,
    ],
    schema: z.object({
      content: z.string(),
      function_call_required: z.boolean(),
      function_call_name: z.enum(["executeSql", "generateChart"]).optional(),
      sql_args: z
        .object({
          sql: z.string(),
        })
        .optional(),
      chart_args: z
        .object({
          config: z.any(),
        })
        .optional(),
      // report_args: z
      //   .object({
      //     reports: z.array(
      //       z.object({
      //         name: z.string(),
      //         description: z.string(),
      //       })
      //     ),
      //   })
      //   .optional(),
    }),
  });

  return NextResponse.json(object);
}
