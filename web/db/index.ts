import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

declare global {
  // Rendered-worker integration tests run in Node, where the
  // `cloudflare:workers` module does not exist. Production never sets this.
  var __AEM_TEST_DB__: D1Database | undefined;
}

export async function getDb() {
  return drizzle(await getD1Database(), { schema });
}

export async function getD1Database(): Promise<D1Database> {
  if (globalThis.__AEM_TEST_DB__) return globalThis.__AEM_TEST_DB__;

  const { env } = await import("cloudflare:workers");
  const runtimeEnv = env as typeof env & { DB?: D1Database };
  if (!runtimeEnv.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  return runtimeEnv.DB;
}
