import { Pool } from 'pg';

export function postgresPool(): Pool | null {
  const connectionString = process.env.LEASELENS_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!globalThis.leaselensPool) {
    globalThis.leaselensPool = new Pool({
      connectionString,
      max: 1,
      ssl: { rejectUnauthorized: false },
    });
  }
  return globalThis.leaselensPool;
}
