/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('GamConfigImportacao', table => {
      table.string('identificador_extra_coluna').nullable();
      table.text('campos_extras').nullable(); // JSON string contendo as configurações de campos extras
    })
    .alterTable('GamTransacao', table => {
      table.text('dados_extras').nullable(); // JSON string contendo os valores dos campos extras
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('GamConfigImportacao', table => {
      table.dropColumn('identificador_extra_coluna');
      table.dropColumn('campos_extras');
    })
    .alterTable('GamTransacao', table => {
      table.dropColumn('dados_extras');
    });
};
