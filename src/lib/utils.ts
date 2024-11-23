import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
import { Readable } from "stream";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseCSV<T>(csvString: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      complete: (results) => {
        resolve(results.data as T[]);
      },
      error: (error: Error) => {
        reject(error);
      },
      skipEmptyLines: true,
    });
  });
}

export function getCSVPreview(csvString: string, numLines: number = 4): string {
  const lines = csvString.split("\n");
  return lines.slice(0, numLines).join("\n");
}

export function insertToTable(
  tableName: string,
  text: string,
  columns: string[],
  dateColumns: string[] = []
) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  });

  const normalizedColumns = columns.map((col) => col.toLowerCase());
  const normalizedDateColumns = dateColumns.map((col) => col.toLowerCase());

  const values = parsed.data
    .map((row: any) => {
      const rowValues = normalizedColumns
        .map((col) => {
          const value = row[col];

          if (value === undefined || value === null) {
            return "NULL";
          }

          if (normalizedDateColumns.includes(col)) {
            // dynamically cast the value to date
            return `CAST(${pgEscapeString(value)} AS DATE)`;
          }

          return `'${value.toString().replace(/'/g, "''")}'`;
        })
        .join(",");
      return `(${rowValues})`;
    })
    .join(",");

  const columnsString = columns.join(", ");
  const sql = `INSERT INTO ${tableName} (${columnsString}) VALUES ${values}`;

  return sql;
}

// Helper function to properly escape strings for PostgreSQL
function pgEscapeString(str: string): string {
  return `E'${str.replace(/'/g, "''")}'`;
}

export async function copyToTable(
  client: any,
  tableName: string,
  csvData: string,
  columns: string[]
) {
  const columnsString = columns.join(", ");

  try {
    // Create a temporary table to hold the CSV data
    await client.execute(`CREATE TEMP TABLE temp_import (data TEXT)`);

    // Insert the CSV data into the temporary table
    await client.execute(`INSERT INTO temp_import VALUES ($1)`, [csvData]);

    // Use COPY command with the temporary table
    const query = `
      COPY ${tableName} (${columnsString})
      FROM (SELECT data FROM temp_import)
      WITH (FORMAT csv, HEADER true)
    `;

    await client.execute(query);
  } catch (error) {
    console.error("Error during COPY operation:", error);
    throw error;
  } finally {
    // Clean up
    await client.execute(`DROP TABLE IF EXISTS temp_import`);
  }
}
