import type { PGliteInterface } from "@electric-sql/pglite";
import { PGliteWorker } from "@electric-sql/pglite/worker";

export class DbManager {
  private dbInstance: PGliteInterface | undefined;
  private dbPromise: Promise<PGliteInterface> | undefined;

  private static async createPGlite(): Promise<PGliteInterface> {
    if (typeof window === "undefined") {
      throw new Error(
        "PGlite worker instances are only available in the browser"
      );
    }

    const db = await PGliteWorker.create(
      new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })
    );

    await db.waitReady;
    return db;
  }

  /**
   * Gets or creates the database instance
   */
  async getDb(): Promise<PGliteInterface> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = DbManager.createPGlite().catch((err) => {
      this.dbPromise = undefined;
      throw err;
    });

    return this.dbPromise;
  }

  /**
   * Execute a SQL query with optional parameters
   */
  async query<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<{ rows: T[] }> {
    const db = await this.getDb();
    return db.query<T>(sql, params);
  }

  /**
   * Execute raw SQL (for creating tables, etc.)
   */
  async execute(sql: string): Promise<void> {
    const db = await this.getDb();
    await db.exec(sql);
  }

  /**
   * Drop all tables in the database
   */
  async dropAllTables(): Promise<void> {
    const db = await this.getDb();

    // Get all table names
    const { rows } = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );

    // Drop each table
    for (const { tablename } of rows) {
      await db.exec(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.dbInstance && !this.dbInstance.closed) {
      await this.dbInstance.close();
      this.dbInstance = undefined;
      this.dbPromise = undefined;
    }
  }
}
