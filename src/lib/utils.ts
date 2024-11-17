import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";

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
  columns: string[]
) {
  const rows = text.split("\n");
  // skip first row as it is the header
  // if last row is empty, skip it
  const values = rows
    .slice(1)
    .filter((row) => row.trim() !== "")
    .map((row) => {
      const rowValues = row
        .split(",")
        .map((value) => `'${value.trim()}'`)
        .join(",");
      return `(${rowValues})`;
    })
    .join(",");
  const columnsString = columns.join(", ");
  return `INSERT INTO ${tableName} (${columnsString}) VALUES ${values}`;
}
