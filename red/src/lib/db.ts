import { Pool } from 'pg';

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Prisma Postgres
  },
});

// Helper to execute SQL queries with template literals
export async function sql<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<{ rows: T[] }> {
  // Build the query string with $1, $2, etc. placeholders
  let query = strings[0];
  const params: any[] = [];

  for (let i = 0; i < values.length; i++) {
    params.push(values[i]);
    query += `$${i + 1}` + strings[i + 1];
  }

  const result = await pool.query(query, params);
  return { rows: result.rows };
}

// Inicializar base de datos
export async function initDatabase() {
  try {
    // Crear tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        image VARCHAR(255),
        subscription_tier VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de proyectos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        budget DECIMAL(10,2),
        employer_id INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'open',
        skills_required TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de aplicaciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        freelancer_id INTEGER REFERENCES users(id),
        proposal TEXT,
        bid DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, freelancer_id)
      )
    `);

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
}

export { pool };