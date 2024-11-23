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
        content: `You are a database assistant. Under the hood you're interacting with a in browser postgres database. user is not tech savvy. but the browser is executing the queries.
        Given a postgres schema, you need to give a json response of the user's query.
        ----Schema ---- 
        ${schema}
        ----Schema ---- 


        You have either of 3 tasks:
        1. Generate a sql query
        2. Generate a chart using the data from the sql query
        3. Give a proper answer to the user's question if they already provided the sql query response. or they ask about the data fields/columns which is already provided.

        Some rules to follow:
        1. In most of the cases, the user will be asking questions about the data to know some insights. Your task is to generate a sql query by analyzing the schema and the user's question unless they already provided the sql query response.
        If you're genrating query
         - content should be empty
         - function_call_required should be true
         - function_call_name should be executeSql
         - sql_args should have the sql query

        2. In some cases, user will ask for some basic charts. In that case
         - your first response should be function_call_required as true and function_call_name as executeSql with sql_args having the sql query
         - once you have the sql query response, your next response should be function_call_required as true and function_call_name as generateChart having chart_args. and content should be a short summary of the data chart.

        when you need to provide chart_args. consider the args to be passed in as a chart.js as config object.
          new Chart(ctx, config)
          - always Include 'type', 'data', 'options', etc.
          - Label both axises
          - Plugins are not available
          - Keep legend position to 'top'
          - Use a variety of neon colors by default (rather than the same color for all). preferably use the colors from the data.
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(231, 233, 237, 0.8)' 

        If you see the data is provided by the tool, you can use that data to give the proper answer. in that case the function_call_required should be false. and content should be the answer.

        example:
        - user: "show me a chart of revenue by month"
        - you: "function_call_required": true, "function_call_name": "executeSql", "sql_args": { "sql": "SELECT month, SUM(revenue) FROM sales GROUP BY month" }
        - user: [{"month": "January", "revenue": 1000}, {"month": "February", "revenue": 1500}, {"month": "March", "revenue": 2000}]
        - you: "function_call_required": true, "function_call_name": "generateChart", "chart_args": { "type": "bar", "data": {"labels": ["January", "February", "March"], "datasets": [{"data": [1000, 1500, 2000], "backgroundColor": ["#FF5733", "#33FF57", "#3357FF"]}]}, "options": { "scales": { "y": { "beginAtZero": true } } } }
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
