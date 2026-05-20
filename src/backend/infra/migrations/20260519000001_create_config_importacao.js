/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('GamConfigImportacao', table => {
    table.uuid('id').primary();
    table.uuid('empresa_id').references('id').inTable('GamEmpresa').onDelete('CASCADE');
    table.string('nome_perfil').notNullable();
    table.text('mapeamento_json').notNullable(); // JSON string contendo o mapeamento de colunas
    table.string('separador_multiplo').defaultTo('|');
    table.integer('linha_cabecalho').defaultTo(2); // Linha onde fica o cabeçalho (1-based)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('GamConfigImportacao');
};
