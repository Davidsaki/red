// Uso: npm run db:query "SELECT id, email, email_verified FROM users ORDER BY created_at DESC"
import { Pool } from 'pg';

const query = process.argv.slice(2).join(' ');

if (!query) {
  console.error('Uso: npm run db:query "SELECT ..."');
  process.exit(1);
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No se encontró POSTGRES_URL ni DATABASE_URL. Corre con: node --env-file=.env.local scripts/db-query.mjs');
  process.exit(1);
}

const label = process.env.DB_LABEL ?? 'desconocida';
console.log(`\n🔎 Base de datos: ${label}\n`);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  const result = await pool.query(query);
  console.table(result.rows);
  console.log(`${result.rowCount} fila(s)`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
