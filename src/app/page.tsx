"use client";

import { ChatWindowComponent } from "@/components/chat-window";
import { DbManager } from "@/lib/db";
import { tools, convertToCoreTools } from "@/lib/tools";
import { useEffect, useState } from "react";
import Image from "next/image";
import LoaderIcon from "@/asset/askdata-avatar.svg";

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
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Image
            src={LoaderIcon}
            alt="Loading"
            width={50}
            height={50}
            className="animate-bounce mx-auto"
          />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      <ChatWindowComponent dbManager={dbManager} />
    </div>
  );
}
