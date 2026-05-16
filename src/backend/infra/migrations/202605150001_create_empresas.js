/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('GamEmpresa', table => {
    table.uuid('id').primary();
    table.string('nome').notNullable();
    table.string('slug').unique().notNullable();
    table.string('logo_url');
    table.string('cor_primaria').defaultTo('#D4AF37'); // Dourado Talentos
    table.enum('status', ['ATIVO', 'SUSPENSO', 'CANCELADO']).defaultTo('ATIVO');
    table.timestamp('data_adesao').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('GamEmpresa');
};
