/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('GamUsuario', table => {
    table.uuid('id').primary();
    table.uuid('empresa_id').references('id').inTable('GamEmpresa').onDelete('CASCADE');
    table.string('nome').notNullable();
    table.string('email').unique().notNullable();
    table.string('senha_hash').notNullable();
    table.string('cpf');
    table.enum('perfil', ['CORRETOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']).defaultTo('CORRETOR');
    table.decimal('saldo_disponivel', 14, 2).defaultTo(0);
    table.decimal('saldo_a_receber', 14, 2).defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('GamUsuario');
};
