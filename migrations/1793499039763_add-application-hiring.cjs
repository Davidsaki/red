/**
 * Selección de contratista: marcas de tiempo de selección/finalización y
 * como máximo una aplicación aceptada por proyecto.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('applications', {
    selected_at: { type: 'timestamptz' },
    finished_at: { type: 'timestamptz' },
  });

  pgm.createIndex('applications', 'project_id', {
    name: 'applications_one_accepted_per_project',
    unique: true,
    where: "status = 'accepted'",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('applications', 'project_id', { name: 'applications_one_accepted_per_project' });
  pgm.dropColumns('applications', ['selected_at', 'finished_at']);
};
