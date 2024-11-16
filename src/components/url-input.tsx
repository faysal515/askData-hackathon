import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UrlInputProps {
  onSubmit: (url: string) => void;
}

export function UrlInput({ onSubmit }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset_id");

  useEffect(() => {
    if (datasetId) {
      console.log("==== datasetId", datasetId);
      handleDatasetFetch({ identifier: datasetId });
    }
  }, [datasetId]);

  const handleDatasetFetch = async ({
    identifier,
    url,
  }: {
    identifier?: string;
    url?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dataset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch dataset");
      }

      console.log("==== data", data);
      onSubmit(data.data?.distribution);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      handleDatasetFetch({ url: url.trim() });
    }
  };

  // If we have a datasetId, don't show the input form
  if (datasetId) {
    return (
      <div>
        {loading && (
          <Alert>
            <AlertDescription>Loading dataset...</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Show the manual input form if no datasetId is provided
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste your data URL here..."
        className="flex-1"
      />
      <Button type="submit" disabled={!url.trim()}>
        Load Data
      </Button>
    </form>
  );
}
