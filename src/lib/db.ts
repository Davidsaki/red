import { Pool } from 'pg';

// Get connection string from environment
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'Database connection string not found. Please set POSTGRES_URL or DATABASE_URL environment variable.'
  );
}

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString,
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

// Seed categories and skills
export async function seedCategories(): Promise<void> {
  const categoriesData: { name: string; slug: string; skills: string[] }[] = [
    {
      name: 'Electricidad',
      slug: 'electricidad',
      skills: ['Instalación eléctrica', 'Cableado', 'Iluminación', 'Tableros eléctricos', 'Reparación de cortocircuitos'],
    },
    {
      name: 'Albañilería',
      slug: 'albanileria',
      skills: ['Construcción de muros', 'Enchapado', 'Estucado', 'Fundiciones', 'Remodelaciones'],
    },
    {
      name: 'Plomería',
      slug: 'plomeria',
      skills: ['Instalación de tuberías', 'Reparación de fugas', 'Destape de cañerías', 'Calentadores', 'Mantenimiento de baños'],
    },
    {
      name: 'Carpintería',
      slug: 'carpinteria',
      skills: ['Muebles a medida', 'Puertas y ventanas', 'Closets', 'Cocinas integrales', 'Reparaciones en madera'],
    },
    {
      name: 'Pintura',
      slug: 'pintura',
      skills: ['Pintura interior', 'Pintura exterior', 'Estucado y pintura', 'Pintura decorativa', 'Impermeabilización'],
    },
    {
      name: 'Preparación de Comidas',
      slug: 'preparacion-de-comidas',
      skills: ['Cocina colombiana', 'Repostería', 'Cocina internacional', 'Catering', 'Comida saludable'],
    },
    {
      name: 'Limpieza',
      slug: 'limpieza',
      skills: ['Limpieza residencial', 'Limpieza de oficinas', 'Limpieza profunda', 'Lavado de tapicería', 'Post-obra'],
    },
    {
      name: 'Jardinería',
      slug: 'jardineria',
      skills: ['Mantenimiento de jardines', 'Poda de árboles', 'Diseño de jardines', 'Sistema de riego', 'Césped'],
    },
    {
      name: 'Transporte y Mudanzas',
      slug: 'transporte-y-mudanzas',
      skills: ['Mudanzas locales', 'Transporte de carga', 'Embalaje', 'Montaje de muebles', 'Acarreos'],
    },
    {
      name: 'Reparación de Electrodomésticos',
      slug: 'reparacion-de-electrodomesticos',
      skills: ['Lavadoras', 'Neveras', 'Aires acondicionados', 'Estufas', 'Hornos'],
    },
    {
      name: 'Mecánica Automotriz',
      slug: 'mecanica-automotriz',
      skills: ['Mantenimiento preventivo', 'Frenos', 'Motor', 'Suspensión', 'Electricidad automotriz'],
    },
    {
      name: 'Asesorías',
      slug: 'asesorias',
      skills: ['Legal', 'Contable', 'Financiera', 'Empresarial', 'Consultoría IT'],
    },
    {
      name: 'Desarrollo Web',
      slug: 'desarrollo-web',
      skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'WordPress'],
    },
    {
      name: 'Diseño Gráfico',
      slug: 'diseno-grafico',
      skills: ['Figma', 'Photoshop', 'Illustrator', 'Branding', 'Diseño de logos', 'UI/UX'],
    },
    {
      name: 'Marketing Digital',
      slug: 'marketing-digital',
      skills: ['SEO', 'Redes sociales', 'Google Ads', 'Email marketing', 'Creación de contenido'],
    },
    {
      name: 'Otro',
      slug: 'otro',
      skills: [],
    },
  ];

  for (const cat of categoriesData) {
    // Insert category if not exists
    const existing = await pool.query(
      'SELECT id FROM categories WHERE slug = $1',
      [cat.slug]
    );

    let categoryId: number;
    if (existing.rows.length === 0) {
      const result = await pool.query(
        'INSERT INTO categories (name, slug, status) VALUES ($1, $2, $3) RETURNING id',
        [cat.name, cat.slug, 'approved']
      );
      categoryId = result.rows[0].id;
    } else {
      categoryId = existing.rows[0].id;
    }

    // Insert skills for this category
    for (const skill of cat.skills) {
      await pool.query(
        'INSERT INTO category_skills (category_id, name) VALUES ($1, $2) ON CONFLICT (category_id, name) DO NOTHING',
        [categoryId, skill]
      );
    }
  }

  // Promote admins from ADMIN_EMAILS env var (comma-separated)
  // Example: ADMIN_EMAILS=user1@gmail.com,user2@gmail.com
  const adminEmails: string[] = [];
  if (process.env.ADMIN_EMAILS) {
    adminEmails.push(
      ...process.env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)
    );
  }
  // Legacy single-email support
  if (process.env.ADMIN_EMAIL) {
    adminEmails.push(process.env.ADMIN_EMAIL.trim());
  }

  for (const email of adminEmails) {
    await pool.query(
      "UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER($1)",
      [email]
    );
  }
  if (adminEmails.length > 0) {
    console.log(`Admin roles set for: ${adminEmails.join(', ')}`);
  }

  console.log('Categorías y habilidades sembradas correctamente');
}

export { pool };