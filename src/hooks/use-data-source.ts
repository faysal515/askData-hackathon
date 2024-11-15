import { useState, useEffect } from "react";
import { loadDataFromUrl } from "@/lib/data-loader";
import type { DataLoadingResult } from "@/lib/data-loader";

export function useDataSource(url: string | null) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const result = await loadDataFromUrl(url);

      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
      }

      setLoading(false);
    };

    loadData();
  }, [url]);

  return { data, loading, error };
}
