/**
 * Modalidad de trabajo y ubicación (DANE/DIVIPOLA) por proyecto.
 * Los proyectos existentes quedan como 'remote' sin ubicación.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('projects', {
    work_mode: { type: 'varchar(20)', notNull: true, default: 'remote' },
    department_code: { type: 'varchar(2)' },
    municipality_code: { type: 'varchar(5)' },
  });

  pgm.addConstraint('projects', 'projects_work_mode_check', {
    check: "work_mode IN ('remote','hybrid','onsite')",
  });
  pgm.addConstraint('projects', 'projects_location_required_check', {
    check: "work_mode = 'remote' OR municipality_code IS NOT NULL",
  });
  pgm.addConstraint('projects', 'projects_location_pair_check', {
    check: 'municipality_code IS NULL OR department_code IS NOT NULL',
  });

  pgm.createIndex('projects', 'work_mode', { name: 'idx_projects_work_mode' });
  pgm.createIndex('projects', 'department_code', { name: 'idx_projects_department_code' });
  pgm.createIndex('projects', 'municipality_code', { name: 'idx_projects_municipality_code' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('projects', 'municipality_code', { name: 'idx_projects_municipality_code' });
  pgm.dropIndex('projects', 'department_code', { name: 'idx_projects_department_code' });
  pgm.dropIndex('projects', 'work_mode', { name: 'idx_projects_work_mode' });

  pgm.dropConstraint('projects', 'projects_location_pair_check');
  pgm.dropConstraint('projects', 'projects_location_required_check');
  pgm.dropConstraint('projects', 'projects_work_mode_check');

  pgm.dropColumns('projects', ['work_mode', 'department_code', 'municipality_code']);
};
