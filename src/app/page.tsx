"use client";

import { ChatWindowComponent } from "@/components/chat-window";
import { DbManager } from "@/lib/db";
import { tools, convertToCoreTools } from "@/lib/tools";
import { useEffect, useState } from "react";

// Create singleton instance
const dbManager = typeof window !== "undefined" ? new DbManager() : undefined;

export default function Home() {
  const [isDbReady, setIsDbReady] = useState(false);
  // const [pgVersion, setPgVersion] = useState<string>();
  const [error, setError] = useState<Error>();

  // Initialize database
  useEffect(() => {
    async function initDb() {
      if (!dbManager) {
        setError(new Error("DbManager is not available"));
        return;
      }

      try {
        await dbManager.getDb();

        const { rows } = await dbManager.query<{ version: string }>(
          "SELECT version()"
        );
        console.log("Database initialized. version:", rows[0].version);

        setIsDbReady(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to initialize database")
        );
        setIsDbReady(false);
      }
    }

    initDb();

    // Cleanup on unmount
    return () => {
      dbManager?.close();
    };
  }, []);

  if (error) {
    return <div>Error initializing database: {error.message}</div>;
  }

  if (!isDbReady) {
    return <div>Loading database...</div>;
  }

  return (
    <div className="h-screen overflow-hidden">
      <ChatWindowComponent dbManager={dbManager} />
    </div>
  );
}
