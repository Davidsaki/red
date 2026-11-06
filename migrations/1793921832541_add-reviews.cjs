/**
 * Calificaciones empleador -> contratista, ligadas a la aplicación finalizada.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('reviews', {
    id: 'id',
    application_id: {
      type: 'integer',
      notNull: true,
      unique: true,
      references: 'applications',
      onDelete: 'RESTRICT',
    },
    project_id: { type: 'integer', notNull: true, references: 'projects', onDelete: 'RESTRICT' },
    reviewer_id: { type: 'integer', notNull: true, references: 'users' },
    reviewee_id: { type: 'integer', notNull: true, references: 'users' },
    rating: { type: 'smallint', notNull: true, check: 'rating BETWEEN 1 AND 5' },
    comment: { type: 'text', check: 'comment IS NULL OR char_length(comment) <= 1000' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('reviews', 'reviewee_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('reviews');
};
