import { z } from "zod";

export const resultsSchema = z.object({
  rows: z.array(z.record(z.any())),
  affectedRows: z.number().optional(),
  fields: z.array(
    z.object({
      name: z.string(),
      dataTypeID: z.number(),
    })
  ),
});
export type Results = z.infer<typeof resultsSchema>;

export const reportSchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type Report = z.infer<typeof reportSchema>;

export const tabsSchema = z.enum(["chat", "diagram", "migrations"]);
export type TabValue = z.infer<typeof tabsSchema>;
