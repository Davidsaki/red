/**
 * Baseline migration: captures the schema as it existed before adopting
 * node-pg-migrate. Uses `ifNotExists: true` everywhere because the
 * production and dev databases already have this schema applied via the
 * old ad-hoc `initDatabase()` in src/lib/db.ts — running this migration
 * against them is a no-op, while a fresh database gets the full schema.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable(
    'users',
    {
      id: 'id',
      email: { type: 'varchar(255)', unique: true, notNull: true },
      name: { type: 'varchar(255)' },
      image: { type: 'varchar(255)' },
      subscription_tier: { type: 'varchar(50)', default: 'free' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      role: { type: 'varchar(50)', default: 'user' },
      password_hash: { type: 'varchar(255)' },
      email_verified: { type: 'boolean', default: false },
    },
    { ifNotExists: true }
  );

  pgm.createTable(
    'projects',
    {
      id: 'id',
      title: { type: 'varchar(255)', notNull: true },
      description: { type: 'text' },
      category: { type: 'varchar(100)' },
      budget: { type: 'decimal(10,2)' },
      employer_id: { type: 'integer', references: 'users', onDelete: null },
      status: { type: 'varchar(50)', default: 'open' },
      skills_required: { type: 'text[]' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      budget_currency: { type: 'varchar(3)', default: 'COP' },
      suggested_category_name: { type: 'varchar(255)' },
    },
    { ifNotExists: true }
  );

  pgm.createTable(
    'applications',
    {
      id: 'id',
      project_id: { type: 'integer', references: 'projects', onDelete: null },
      freelancer_id: { type: 'integer', references: 'users', onDelete: null },
      proposal: { type: 'text' },
      bid: { type: 'decimal(10,2)' },
      status: { type: 'varchar(50)', default: 'pending' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true, constraints: { unique: ['project_id', 'freelancer_id'] } }
  );

  pgm.createTable(
    'email_verification_tokens',
    {
      id: 'id',
      user_id: { type: 'integer', unique: true, references: 'users', onDelete: 'CASCADE' },
      token: { type: 'varchar(255)', unique: true, notNull: true },
      expires_at: { type: 'timestamptz', notNull: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true }
  );

  pgm.createTable(
    'magic_link_tokens',
    {
      id: 'id',
      email: { type: 'varchar(255)', notNull: true },
      token: { type: 'varchar(255)', unique: true, notNull: true },
      expires_at: { type: 'timestamptz', notNull: true },
      used_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true }
  );

  pgm.createTable(
    'categories',
    {
      id: 'id',
      name: { type: 'varchar(255)', notNull: true },
      slug: { type: 'varchar(255)', unique: true, notNull: true },
      status: { type: 'varchar(50)', default: 'approved' },
      suggested_by: { type: 'integer', references: 'users', onDelete: null },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      related_project_id: { type: 'integer', references: 'projects', onDelete: 'SET NULL' },
      suggested_skills: { type: 'text[]' },
    },
    { ifNotExists: true }
  );

  pgm.createTable(
    'category_skills',
    {
      id: 'id',
      category_id: { type: 'integer', references: 'categories', onDelete: 'CASCADE' },
      name: { type: 'varchar(255)', notNull: true },
    },
    { ifNotExists: true, constraints: { unique: ['category_id', 'name'] } }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('category_skills', { ifExists: true });
  pgm.dropTable('categories', { ifExists: true });
  pgm.dropTable('magic_link_tokens', { ifExists: true });
  pgm.dropTable('email_verification_tokens', { ifExists: true });
  pgm.dropTable('applications', { ifExists: true });
  pgm.dropTable('projects', { ifExists: true });
  pgm.dropTable('users', { ifExists: true });
};
