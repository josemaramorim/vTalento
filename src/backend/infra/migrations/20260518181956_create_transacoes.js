/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('GamTransacao', table => {
    table.uuid('id').primary();
    table.uuid('empresa_id').references('id').inTable('GamEmpresa').onDelete('CASCADE');
    table.uuid('usuario_id').references('id').inTable('GamUsuario').onDelete('CASCADE');
    table.uuid('admin_id').references('id').inTable('GamUsuario').onDelete('SET NULL');
    table.decimal('valor', 14, 2).notNullable();
    table.enum('tipo', ['CREDITO', 'DEBITO', 'ESTORNO']).notNullable();
    table.enum('origem', ['MANUAL', 'IMPORTACAO']).notNullable().defaultTo('MANUAL');
    table.text('justificativa').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('GamTransacao');
};
