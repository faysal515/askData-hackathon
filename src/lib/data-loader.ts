import Papa from "papaparse";

export interface DataLoadingResult {
  data: any[];
  error?: string;
}

export async function loadDataFromUrl(url: string): Promise<DataLoadingResult> {
  try {
    if (window.parent !== window) {
      return new Promise((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === "DATA_RESPONSE") {
            window.removeEventListener("message", messageHandler);
            const data = Papa.parse(event.data.data, { header: true });
            resolve({
              data: data.data,
              error:
                data.errors.length > 0 ? data.errors[0].message : undefined,
            });
          } else if (event.data.type === "DATA_ERROR") {
            window.removeEventListener("message", messageHandler);
            resolve({
              data: [],
              error: event.data.error,
            });
          }
        };

        window.addEventListener("message", messageHandler);

        window.parent.postMessage(
          {
            type: "FETCH_DATA",
            url,
          },
          "*"
        );
      });
    } else {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const content = await response.text();

      return new Promise((resolve) => {
        Papa.parse(content, {
          header: true,
          complete: (results) => {
            resolve({
              data: results.data,
              error:
                results.errors.length > 0
                  ? results.errors[0].message
                  : undefined,
            });
          },
          error: (error) => {
            resolve({ data: [], error: error.message });
          },
        });
      });
    }
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Failed to load data",
    };
  }
}
